import { withBypass } from "@/db/context";
import { emailIndex } from "@/lib/crypto";
import { env } from "@/lib/env";
import { newId } from "@/lib/ids";
import { log } from "@/lib/log";

/**
 * E-posta gönderimi — Ü170.
 *
 * ── Neden bu modül doğdu ────────────────────────────────────
 *
 * Ürün sahibi: *"kullanıcılara sms göndermek yerine mail göndereceğiz
 * başlangıçta doğrulama kodunu"* ve sonra *"kod sms gelmeyecek ama kod
 * gmaile gidecek."*
 *
 * Buradan **yalnızca doğrulama kodu** gidiyor. Öbür sekiz bildirim
 * (kupon açıldı, süresi doluyor, yeni cihaz, kampanya…) SMS
 * iskeletinde kalıyor — ürün sahibinin kararı.
 *
 * ── `sms/index.ts`in kopyası değil, kardeşi ─────────────────
 *
 * Kalıp bilerek aynı: sağlayıcı arayüzü, şablon tablosu, maskeleme,
 * giden kutusu. İki kanal aynı şekilde okunsun diye. Ama **paylaşılan
 * bir soyutlama yazılmadı** ve bu da bilerek: ikisinin limitleri,
 * maliyetleri ve hata biçimleri farklı. Ortak bir `Kanal` arayüzü,
 * G14 günlük tavanı gibi yalnızca SMS'e ait olan şeyleri e-postaya da
 * bulaştırırdı.
 *
 * ── Metin neden düz, neden HTML değil ───────────────────────
 *
 * Altı rakam için HTML şablonu, kendi bakım yükü olan bir şey. Düz
 * metin her istemcide aynı görünüyor, spam filtrelerinde daha iyi
 * duruyor ve **kodun kendisi zaten tek satır.** HTML gerektiğinde
 * (kampanya, görselli bildirim) o zaman eklenir.
 */

export type EpostaSablon = "otp";

export type EpostaMesaji = {
  /** Normalize edilmiş adres (`normalizeEmail`). */
  adres: string;
  sablon: EpostaSablon;
  degerler?: Record<string, string>;
};

export type GonderimSonucu = { durum: "gonderildi" } | { durum: "basarisiz" };

/* ── Şablonlar ────────────────────────────────────────────── */

const SABLONLAR: Record<
  EpostaSablon,
  (d: Record<string, string>) => { konu: string; metin: string }
> = {
  otp: (d) => ({
    konu: `Looply doğrulama kodun: ${d.kod}`,
    metin: [
      `Doğrulama kodun: ${d.kod}`,
      "",
      "Kod 3 dakika geçerli. Kimseyle paylaşma.",
      "",
      "Bu kodu sen istemediysen bu e-postayı yok sayabilirsin;",
      "kod tek başına hiçbir işe yaramaz.",
      "",
      "— Looply",
    ].join("\n"),
  }),
};

/**
 * Konuya kodun kendisi YAZILIYOR ve bu bilinçli bir ödünleşim.
 *
 * Artısı: telefonun bildirim önizlemesinde kod görünüyor, kullanıcı
 * uygulamadan çıkmadan okuyabiliyor — SMS'in tek gerçek üstünlüğü
 * buydu ve e-postaya geçerken kaybedilmemeli.
 *
 * Eksisi: kilit ekranında başkası da görebilir. Kabul edildi, çünkü
 * kod tek başına yetmiyor: telefon numarasını ve formu da bilmek
 * gerekiyor, üstelik kodun ömrü üç dakika.
 */

export function sablonMetni(sablon: EpostaSablon, degerler?: Record<string, string>) {
  return SABLONLAR[sablon](degerler ?? {});
}

/* ── Maskeleme ────────────────────────────────────────────── */

/**
 * "buse@ornek.com" → "b***e@ornek.com"
 *
 * Giden kutusuna **düz adres yazılmıyor**: defter bir teslimat izi,
 * adres defteri değil. Sızması hâlinde kimin ne zaman kod istediği
 * görülür ama adresler okunamaz (`sms_outbox`ta da aynı kural).
 *
 * Alan adı açık bırakılıyor: destek isteyen kullanıcıya "hangi
 * adrese gitti" diye sorulduğunda ayırt edici olan kısım o, ve alan
 * adı tek başına kimseyi tanımlamıyor.
 */
export function maskeleEposta(adres: string): string {
  const [yerel, alan] = adres.split("@");
  if (!yerel || !alan) return "***";
  if (yerel.length <= 2) return `${yerel[0]}***@${alan}`;
  return `${yerel[0]}***${yerel[yerel.length - 1]}@${alan}`;
}

/* ── Sağlayıcılar ─────────────────────────────────────────── */

interface EpostaSaglayici {
  readonly ad: string;
  gonder(mesaj: EpostaMesaji, konu: string, metin: string): Promise<{ ref?: string }>;
}

class KonsolSaglayici implements EpostaSaglayici {
  readonly ad = "console";

  async gonder(mesaj: EpostaMesaji, konu: string, metin: string) {
    // Geliştirme kolaylığı: kod burada GÖRÜNÜR. Canlıda bu sağlayıcı
    // kullanılamaz — env.ts açılışta reddediyor.
    process.stdout.write(
      `\n┌─ E-POSTA (sahte sağlayıcı) ────────────────────\n` +
        `│ Kime : ${maskeleEposta(mesaj.adres)}\n` +
        `│ Konu : ${konu}\n` +
        metin
          .split("\n")
          .map((s) => `│ ${s}`)
          .join("\n") +
        `\n└────────────────────────────────────────────────\n\n`,
    );
    return {};
  }
}

class ResendSaglayici implements EpostaSaglayici {
  readonly ad = "resend";

  async gonder(mesaj: EpostaMesaji, konu: string, metin: string) {
    /*
      SDK yerine düz `fetch` — bu projede bağımlılık eklemek için
      gerekçe aranıyor ve tek bir POST için gerekçe yok. SDK bir
      HTTP çağrısını sarmaktan başka bir şey yapmıyor, karşılığında
      sürüm takibi ve tedarik zinciri yüzeyi getiriyordu.

      ⚠️ Zaman aşımı AÇIKÇA konuyor: `fetch` varsayılanı sonsuz
      bekleyebiliyor ve bu çağrı kullanıcı kayıt ekranında beklerken
      yapılıyor. On saniye sonra "gönderilemedi" demek, süresiz
      dönen bir çarktan iyidir.
    */
    const yanit = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env().RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: env().EPOSTA_GONDEREN,
        to: [mesaj.adres],
        subject: konu,
        text: metin,
      }),
      signal: AbortSignal.timeout(10_000),
    });

    if (!yanit.ok) {
      /*
        🔴 Gövde OKUNUYOR ama günlüğe YAZILMIYOR.

        Resend hata gövdesinde gönderilen adresi tekrarlıyor; olduğu
        gibi günlüğe basmak, düz metin e-postayı günlüğe sızdırmak
        olurdu (`log-pii.test.ts` bunu sınıyor). Yalnızca durum kodu
        taşınıyor.
      */
      await yanit.text().catch(() => "");
      throw new Error(`Resend ${yanit.status}`);
    }

    const veri = (await yanit.json().catch(() => null)) as { id?: string } | null;
    return { ref: veri?.id };
  }
}

function saglayici(): EpostaSaglayici {
  return env().EPOSTA_SAGLAYICI === "resend" ? new ResendSaglayici() : new KonsolSaglayici();
}

/** Kodun ekranda gösterilip gösterilmeyeceği — yalnızca sahte sağlayıcıda. */
export function epostaKoduEkrandaGosterilir(): boolean {
  return env().APP_ENV !== "production" && env().EPOSTA_SAGLAYICI === "console";
}

/* ── Küresel tavan — G14'ün e-posta karşılığı ─────────────── */

/**
 * Günlük e-posta tavanı — Ü170.
 *
 * 🔴 Bu sayı bir **sigorta**, fatura limiti değil.
 *
 * Kod SMS'ten e-postaya taşınırken farkına varılmadan bir koruma
 * kaybedilmişti: G14 küresel tavanı (`sms_outbox` üzerinden, 2.000/gün)
 * OTP isteklerini de sınırlıyordu. E-postaya geçince o yol tavanın
 * dışında kaldı — kişi ve IP başına sınırlar duruyordu ama **sistem
 * çapında bir durdurucu kalmamıştı.** Testler bunu yakaladı.
 *
 * ⚠️ 5.000 seçildi, 2.000 değil: e-postanın birim maliyeti SMS'in çok
 * altında ve aynı sayıyı kullanmak, ucuz bir kanalı pahalı olanın
 * limitiyle boğmak olurdu. Yine de sınırsız değil — hedef, bir
 * saldırının ya da döngüye giren bir işin sağlayıcı kotasını
 * tüketmeden önce görülmesi.
 *
 * ⚠️ Sağlayıcı planı seçilince gözden geçirilmeli: Resend'in ücretsiz
 * katmanı **aylık** 3.000, yani bu tavan orada tek günde aşılabilir.
 * `docs/23`te açık madde.
 */
export const GUNLUK_TAVAN = 5000;

export type TavanDurumu = {
  gonderilen: number;
  tavan: number;
  oran: number;
  /** %90'da yeni kayıt durur; giriş devam eder. */
  kayitAcik: boolean;
  /** %100'de her şey durur. */
  girisAcik: boolean;
};

/**
 * Kademeli kapanış — G14'teki gerekçenin aynısı.
 *
 * Kayıt önce duruyor çünkü giriş, kapıda bekleyen mevcut bir
 * kullanıcı; kayıt ise bir gün sonra da yapılabilir. Tersi olsaydı
 * saldırganın işini biz görmüş olurduk: tavanı doldurup herkesin
 * girişini kilitlemek.
 */
export async function tavanDurumu(): Promise<TavanDurumu> {
  const r = await withBypass("eposta günlük tavan sayacı", (db) =>
    db.one<{ n: string }>(
      `SELECT count(*) AS n FROM email_outbox
        WHERE status = 'sent' AND created_at > now() - interval '1 day'`,
    ),
  );
  const gonderilen = Number(r?.n ?? 0);
  const oran = gonderilen / GUNLUK_TAVAN;
  return {
    gonderilen,
    tavan: GUNLUK_TAVAN,
    oran,
    kayitAcik: oran < 0.9,
    girisAcik: oran < 1,
  };
}

/* ── Gönderim ─────────────────────────────────────────────── */

export async function gonder(mesaj: EpostaMesaji): Promise<GonderimSonucu> {
  const { konu, metin } = sablonMetni(mesaj.sablon, mesaj.degerler);
  const s = saglayici();
  const id = newId("eml");
  const maskeli = maskeleEposta(mesaj.adres);
  const indeks = emailIndex(mesaj.adres);

  /*
    Satır gönderimden ÖNCE yazılıyor.

    Sağlayıcı çağrısı patlarsa ya da süreç ortasında ölürse, "denendi"
    izi yine de kalıyor. Sonra yazılsaydı başarısız denemeler defterde
    hiç görünmezdi — yani tam da araştırılması gereken şey kayıtsız
    kalırdı.
  */
  await withBypass("eposta giden kutusu", (db) =>
    db.query(
      `INSERT INTO email_outbox (id, email_masked, email_index, template, provider)
       VALUES ($1,$2,$3,$4,$5)`,
      [id, maskeli, indeks, mesaj.sablon, s.ad],
    ),
  );

  try {
    const { ref } = await s.gonder(mesaj, konu, metin);
    await withBypass("eposta gönderildi kaydı", (db) =>
      db.query(
        `UPDATE email_outbox SET status = 'sent', sent_at = now(), provider_ref = $2 WHERE id = $1`,
        [id, ref ?? null],
      ),
    );
    log.info("eposta gonderildi", { sablon: mesaj.sablon, saglayici: s.ad });
    return { durum: "gonderildi" };
  } catch (e) {
    const hata = e instanceof Error ? e.message : "bilinmeyen hata";
    await withBypass("eposta gonderilemedi kaydı", (db) =>
      db.query(`UPDATE email_outbox SET status = 'failed', block_reason = $2 WHERE id = $1`, [
        id,
        hata.slice(0, 200),
      ]),
    );
    // ⚠️ Adres günlüğe yazılmıyor — yalnızca şablon ve sağlayıcı.
    log.error("eposta gonderilemedi", { sablon: mesaj.sablon, saglayici: s.ad });
    return { durum: "basarisiz" };
  }
}
