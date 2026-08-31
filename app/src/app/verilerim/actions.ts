"use server";

import { redirect } from "next/navigation";
import { withBypass } from "@/db/context";
import { revalidatePath } from "next/cache";
import * as oturum from "@/domain/session";
import * as taht from "@/domain/taht";
import { idIleBul, silmeTalebiOlustur, silmeTalebiIptal, RIZA_SURUMU } from "@/domain/player";
import { audit } from "@/lib/audit";
import { newId } from "@/lib/ids";
import { gonder } from "@/sms";
import { log } from "@/lib/log";

/**
 * KVKK m.11 hakları — G25.
 *
 * "Panelden erişilir" yazmak yetmiyordu; hakları kullanılabilir kılan
 * işlemler burada. Dördü de oyuncunun kendi oturumundan çalışıyor,
 * destek talebi gerektirmiyor.
 */

async function oyuncuOturumu() {
  const o = await oturum.oku();
  if (!o || o.rol !== "oyuncu") redirect("/giris");
  return o;
}

/** Veri taşınabilirliği — hesabın tamamı JSON olarak. */
export async function verileriIndir(): Promise<string> {
  const o = await oyuncuOturumu();
  const oyuncu = await idIleBul(o.ozneId);
  if (!oyuncu) redirect("/giris");

  const ek = await withBypass("veri indirme", async (db) => {
    const rizalar = await db.all(
      `SELECT kind, text_version, granted_at, revoked_at
         FROM player_consents WHERE player_id = $1 ORDER BY granted_at`,
      [o.ozneId],
    );
    const takmaAdlar = await db.all(
      `SELECT c.name AS kafe, a.code AS anonim_kod
         FROM player_aliases a JOIN cafes c ON c.id = a.cafe_id
        WHERE a.player_id = $1`,
      [o.ozneId],
    );
    const puanlar = await db.all(
      `SELECT business_date, delta, reason FROM points_ledger
        WHERE player_id = $1 ORDER BY created_at`,
      [o.ozneId],
    );
    const kuponlar = await db.all(
      `SELECT code, status, issued_at, expires_at, redeemed_at FROM coupons
        WHERE player_id = $1 ORDER BY issued_at`,
      [o.ozneId],
    );
    const mesajlar = await db.all(
      `SELECT template, status, created_at FROM sms_outbox
        WHERE phone_index = (SELECT phone_index FROM players WHERE id = $1)
        ORDER BY created_at`,
      [o.ozneId],
    );
    return { rizalar, takmaAdlar, puanlar, kuponlar, mesajlar };
  });

  await withBypass("veri indirme kaydı", (db) =>
    audit(db, {
      actorType: "player",
      actorId: o.ozneId,
      action: "pii.view",
      targetType: "player",
      targetId: o.ozneId,
      detail: { islem: "veri_tasinabilirligi" },
    }),
  );

  return JSON.stringify(
    {
      olusturuldu: new Date().toISOString(),
      hesap: {
        ad: oyuncu.ad,
        soyad: oyuncu.soyad,
        telefon: oyuncu.telefon,
        kayitTarihi: oyuncu.olusturuldu,
      },
      rizalar: ek.rizalar,
      kafelerdekiAnonimKodlarim: ek.takmaAdlar,
      puanHareketleri: ek.puanlar,
      kuponlarim: ek.kuponlar,
      gonderilenMesajlar: ek.mesajlar,
      not: "Bu dosya KVKK m.11 kapsamındaki veri taşınabilirliği hakkı gereği üretildi.",
    },
    null,
    2,
  );
}

/** Ticari ileti iznini geri alır. İYS'den düşüm de buradan tetiklenir (G7). */
export async function pazarlamaIzniniGeriAl(): Promise<void> {
  const o = await oyuncuOturumu();

  await withBypass("pazarlama izni geri alma", async (db) => {
    await db.query(
      `UPDATE player_consents SET revoked_at = now()
        WHERE player_id = $1 AND kind = 'commercial_message' AND revoked_at IS NULL`,
      [o.ozneId],
    );
    await audit(db, {
      actorType: "player",
      actorId: o.ozneId,
      action: "consent.revoke",
      targetType: "player",
      targetId: o.ozneId,
      detail: { tur: "commercial_message", surum: RIZA_SURUMU },
    });
  });

  // TODO(Faz 10): İYS'ye düşüm bildirimi
  log.info("pazarlama izni geri alindi");
}

export async function pazarlamaIzniVer(): Promise<void> {
  const o = await oyuncuOturumu();

  await withBypass("pazarlama izni", async (db) => {
    const aktif = await db.one(
      `SELECT 1 FROM player_consents
        WHERE player_id = $1 AND kind = 'commercial_message' AND revoked_at IS NULL`,
      [o.ozneId],
    );
    if (aktif) return;

    await db.query(
      `INSERT INTO player_consents (id, player_id, kind, text_version)
       VALUES ($1,$2,'commercial_message',$3)`,
      [newId("cns"), o.ozneId, RIZA_SURUMU],
    );
    await audit(db, {
      actorType: "player",
      actorId: o.ozneId,
      action: "consent.grant",
      targetType: "player",
      targetId: o.ozneId,
      detail: { tur: "commercial_message", surum: RIZA_SURUMU },
    });
  });
}

/** Silme talebi — 30 günlük pencere. Yanlışlıkla silmeyi kurtarmak için. */
export async function hesabiSil(): Promise<void> {
  const o = await oyuncuOturumu();
  const oyuncu = await idIleBul(o.ozneId);
  if (!oyuncu) redirect("/giris");

  await silmeTalebiOlustur(o.ozneId);
  await gonder({ telefon: oyuncu.telefon, sablon: "account_deleted" }, "bildirim");
  await oturum.tumunuIptalEt(o.ozneId, "hesap_silme_talebi");
  await oturum.kapat("hesap_silme_talebi");

  // Maskeli numara bile loglanmıyor — defterdeki kayıt zaten yeterli
  log.info("hesap silme talebi alindi");
  redirect("/giris?silindi=1");
}

export async function silmeyiIptalEt(): Promise<void> {
  const o = await oyuncuOturumu();
  await silmeTalebiIptal(o.ozneId);
}

/**
 * Ö1: sıralamalarda ad görünürlüğü.
 *
 * Kapatan oyuncu tahttan düşmüyor — yalnızca adı yerine kafeye özel anonim
 * kodu görünüyor. Bu bir KVKK rızası değil, bir görünürlük tercihi; o yüzden
 * `player_consents` yerine oyuncunun kendi kolonunda duruyor.
 */
export async function adGorunurluguAyarla(acik: boolean): Promise<void> {
  const o = await oturum.oku();
  if (!o || o.rol !== "oyuncu") return;
  await taht.adGorunurluguAyarla(o.ozneId, acik);
  revalidatePath("/verilerim");
  revalidatePath("/oyna");
}
