import { withBypass } from "@/db/context";
import { audit } from "@/lib/audit";
import { log } from "@/lib/log";

/**
 * Acil durdurma — G18.
 *
 * "Bir sorun anlaşıldığında ilk yapılacak şey hasarı durdurmaktır. Bunun
 * **tasarlanmış bir yeteneği** olmalı — o an kod yazılarak yapılamaz."
 * (07-uretim-plani.md §2.10)
 *
 * Dört düğme, dördü de **geri alınabilir**, dördü de denetim izine düşer:
 *
 *   1. Kafeyi askıya al        → o kafede karekod, kupon, panel durur
 *   2. Tüm oturumları iptal et → herkes çıkar; çalınan cihaz senaryosu
 *   3. Kupon dağıtımını durdur → mevcut kuponlar kullanılır, yenisi çıkmaz
 *   4. SMS'i durdur            → kayıt ve giriş durur; maliyet saldırısı kesilir
 *
 * Anahtarlar `platform_config`'te duruyor (0008 göçü). Kod her akışta bu
 * anahtarlara bakar; durdurma yeniden dağıtım gerektirmez.
 */

/** Durdurma anahtarları — karşılıkları platform_config'te. */
export const ANAHTARLAR = {
  kupon: "kupon_dagitimi_durduruldu",
  sms: "sms_durduruldu",
  oyun: "oyun_durduruldu",
} as const;

export type Anahtar = (typeof ANAHTARLAR)[keyof typeof ANAHTARLAR];

const GECERLI: readonly string[] = Object.values(ANAHTARLAR);

export type AcilDurum = {
  kuponDurduruldu: boolean;
  smsDurduruldu: boolean;
  oyunDurduruldu: boolean;
  /** Askıya alınmış kafe sayısı. */
  askidakiKafe: number;
  /** Şu an açık oturum sayısı — "iptal et" düğmesi neyi etkileyecek. */
  acikOturum: number;
};

/** Tek bir anahtarın durumu. Akışların içinden çağrılır. */
export async function durduruldu(anahtar: Anahtar): Promise<boolean> {
  const r = await withBypass("acil durdurma anahtarı okuma", (db) =>
    db.one<{ value: boolean }>(`SELECT value FROM platform_config WHERE key = $1`, [anahtar]),
  );
  return r?.value === true;
}

/** Acil durdurma ekranının tablosu. */
export async function durum(): Promise<AcilDurum> {
  return withBypass("acil durdurma paneli", async (db) => {
    const anahtarlar = await db.all<{ key: string; value: boolean }>(
      `SELECT key, value FROM platform_config WHERE key = ANY($1)`,
      [GECERLI],
    );
    const oku = (k: string) => anahtarlar.find((a) => a.key === k)?.value === true;

    const sayilar = await db.one<{ askida: string; oturum: string }>(
      `SELECT (SELECT count(*) FROM cafes WHERE status = 'suspended')       AS askida,
              (SELECT count(*) FROM sessions
                WHERE revoked_at IS NULL AND expires_at > now())            AS oturum`,
    );

    return {
      kuponDurduruldu: oku(ANAHTARLAR.kupon),
      smsDurduruldu: oku(ANAHTARLAR.sms),
      oyunDurduruldu: oku(ANAHTARLAR.oyun),
      askidakiKafe: Number(sayilar?.askida ?? 0),
      acikOturum: Number(sayilar?.oturum ?? 0),
    };
  });
}

/**
 * Bir durdurma anahtarını çevirir.
 *
 * Anahtar adı çağırandan geliyor ama serbest metin değil — bilinen kümede
 * olmayan bir ad reddediliyor. Aksi halde form alanına yazılan herhangi bir
 * anahtar `platform_config`'e satır ekleyebilirdi.
 */
export async function cevir(anahtar: string, deger: boolean, aktorId: string): Promise<boolean> {
  if (!GECERLI.includes(anahtar)) {
    log.warn("bilinmeyen acil durdurma anahtari", { anahtar });
    return false;
  }

  await withBypass("acil durdurma anahtarı çevirme", async (db) => {
    await db.query(
      `INSERT INTO platform_config (key, value) VALUES ($1, $2::jsonb)
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
      [anahtar, JSON.stringify(deger)],
    );

    await audit(db, {
      actorType: "platform",
      actorId: aktorId,
      action: "emergency.toggle",
      targetType: "platform_config",
      targetId: anahtar,
      detail: { deger },
    });
  });

  log.warn("acil durdurma anahtari cevrildi", { anahtar, deger });
  return true;
}

/**
 * Kafeyi askıya alır veya geri açar.
 *
 * Askıdaki kafede karekod çözülmez, panel açılmaz, kupon üretilmez —
 * `cafes.status` bütün akışların baktığı tek alan.
 */
export async function kafeAskiya(
  cafeId: string,
  askiya: boolean,
  aktorId: string,
  sebep: string,
): Promise<boolean> {
  return withBypass("kafe askıya alma", async (db) => {
    const hedef = askiya ? "suspended" : "approved";
    const kaynak = askiya ? "approved" : "suspended";

    const r = await db.query(`UPDATE cafes SET status = $2 WHERE id = $1 AND status = $3`, [
      cafeId,
      hedef,
      kaynak,
    ]);

    if (!r.rowCount) return false;

    await audit(db, {
      actorType: "platform",
      actorId: aktorId,
      cafeId,
      action: askiya ? "emergency.cafe_suspend" : "emergency.cafe_resume",
      targetType: "cafe",
      targetId: cafeId,
      detail: { sebep },
    });

    log.warn("kafe durumu degisti", { askiya });
    return true;
  });
}

/**
 * **Tüm** açık oturumları iptal eder — platform dahil.
 *
 * Kendi oturumunu da kapatır. Bu bilinçli: ihlal şüphesinde "benimki
 * kalsın" diye bir istisna, aracın kendisini güvenilmez yapar. İşlemi
 * yapan da yeniden giriş yapar.
 */
export async function tumOturumlariIptal(aktorId: string, sebep: string): Promise<number> {
  const n = await withBypass("acil durdurma — tüm oturumlar", async (db) => {
    const r = await db.query(
      `UPDATE sessions SET revoked_at = now(), revoke_reason = $1
        WHERE revoked_at IS NULL AND expires_at > now()`,
      [sebep.slice(0, 200)],
    );
    const adet = r.rowCount ?? 0;

    await audit(db, {
      actorType: "platform",
      actorId: aktorId,
      action: "emergency.sessions_revoke",
      targetType: "sessions",
      detail: { adet, sebep },
    });

    return adet;
  });

  log.warn("tum oturumlar iptal edildi", { adet: n });
  return n;
}

/** Onaylı ve askıdaki kafeler — ekrandaki listede seçim için. */
export async function kafeler(): Promise<{ id: string; ad: string; askida: boolean }[]> {
  const satirlar = await withBypass("acil durdurma — kafe listesi", (db) =>
    db.all<{ id: string; name: string; status: string }>(
      `SELECT id, name, status FROM cafes
        WHERE status IN ('approved','suspended')
        ORDER BY status DESC, name`,
    ),
  );
  return satirlar.map((r) => ({ id: r.id, ad: r.name, askida: r.status === "suspended" }));
}
