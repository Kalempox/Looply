import { withBypass, type Db } from "@/db/context";
import { phoneIndex, hashOtp, safeEqual, identifierHash } from "@/lib/crypto";
import { otpCode, newId } from "@/lib/ids";
import { tuket } from "@/lib/ratelimit";
import { log } from "@/lib/log";
import { maskele, gonder as smsGonder, tavanDurumu as smsTavani } from "@/sms";
import {
  gonder as postaGonder,
  epostaKoduEkrandaGosterilir,
  tavanDurumu as postaTavani,
} from "@/posta";
import { telefonlaBul } from "./player";
import { defteriYaz } from "@/sms/gelistirme-defteri";

/**
 * Doğrulama kodu — docs/07 §2.3'ün tamamı.
 *
 * OTP burada iki işi birden görüyor:
 *   · güvenlik kapısı — hesabın gerçekten o numaraya ait olduğunu kanıtlar
 *   · maliyet kapısı  — sınırsız bırakılırsa saldırgan bedava SMS yaktırır
 *
 * 🔴 Düz kod hiçbir yere yazılmaz: ne veritabanına, ne loga, ne mesaj defterine.
 *    Yalnızca HMAC'i saklanır ve tek seferlik olarak sağlayıcıya gider.
 */

export const KOD_OMRU_SN = 180; // 3 dakika
export const MAX_DENEME = 5;
export const KILIT_DK = 15;

export type Amac = "register" | "login" | "phone_change" | "account_delete";

export type IstekSonucu =
  | { durum: "gonderildi"; sonGecerlilik: Date; gelistirmeKodu?: string }
  | { durum: "cok_sik"; tekrarDene: Date }
  | { durum: "kilitli"; kilitBitis: Date }
  | { durum: "kapasite_dolu" }
  /**
   * Hesapta e-posta yok — Ü170.
   *
   * Kod artık e-postaya gidiyor; adresi olmayan hesaba gönderilecek
   * bir yer yok. Ü169 öncesinde açılmış hesaplar bu durumda ve sessiz
   * bir "gönderilemedi" onları "sunucu bozuk" sanmaya iterdi.
   * Ayrı bir durum, ekranın doğru cümleyi kurabilmesi için.
   */
  | { durum: "eposta_yok" }
  | { durum: "gonderilemedi" };

export type DogrulamaSonucu =
  | { durum: "dogru" }
  | { durum: "yanlis"; kalanDeneme: number }
  | { durum: "kilitlendi"; kilitBitis: Date }
  | { durum: "sure_doldu" }
  | { durum: "yok" };

/** Bu numarada aktif bir kilit var mı? Kilit satıra değil numaraya aittir. */
async function kilitKontrol(db: Db, indeks: Buffer): Promise<Date | null> {
  const r = await db.one<{ locked_until: Date }>(
    `SELECT locked_until FROM otp_challenges
      WHERE phone_index = $1 AND locked_until IS NOT NULL AND locked_until > now()
      ORDER BY locked_until DESC LIMIT 1`,
    [indeks],
  );
  return r?.locked_until ?? null;
}

/**
 * Kod hangi adrese gidecek — Ü170.
 *
 * ── 🔴 Bu fonksiyonun tamamı bir güvenlik kararı ────────────
 *
 * Kod e-postaya taşınınca yeni bir saldırı yolu açılıyor: formda
 * **başkasının numarasını**, e-posta alanına **kendi adresini** yazan
 * biri. Adres olduğu gibi kullanılsaydı o kişi başkasının hesabına
 * giriş kodu alırdı — parolayı bilmeden, telefona hiç dokunmadan.
 * Hesap devralmanın en kısa yolu.
 *
 * Kural: **hesap varsa adres hesaptan, formdan değil.**
 *
 *   register        → hesap henüz yok, adres ancak formdan gelebilir
 *                     ve zaten o adres talep ediliyor
 *   login           → hesabın kayıtlı adresi; formdaki yok sayılır
 *   phone_change    → aynı, hesabın adresi
 *   account_delete  → aynı, hesabın adresi
 *
 * ⚠️ `register` dalında bile bir incelik var: numara zaten kayıtlıysa
 * `kaydet` yeni hesap açmıyor (G13) ve akış girişe dönüyor. O yüzden
 * burada da **önce hesap aranıyor**: kayıtlı numaraya "register"
 * denerek formdaki adrese kod çıkarılamasın.
 */
async function hedefAdres(telefon: string, formdaki?: string): Promise<string | null> {
  const hesap = await telefonlaBul(telefon);
  if (hesap) return hesap.eposta;
  return formdaki ?? null;
}

/**
 * Kod ister: kotaları kontrol eder, üretir, HMAC'ini saklar, e-postaya verir.
 *
 * `amac` global tavan davranışını belirler (G14): tavanın %90'ında kayıt
 * durur, giriş devam eder.
 *
 * ⚠️ Ü170'ten beri kod **SMS'le gitmiyor.** G14 tavanı ve `sms_outbox`
 * öbür sekiz bildirim için yerinde duruyor; bu yol onlara dokunmuyor.
 */
export async function kodIste(opts: {
  telefon: string; // E.164
  /**
   * Formda yazılan e-posta — YALNIZCA `register` amacında kullanılır.
   *
   * 🔴 Öbür amaçlarda bu değer **bilerek yok sayılıyor**; bkz.
   * `hedefAdres`. Güvenilmesi, hesap devralmanın en kısa yolu olurdu.
   */
  eposta?: string;
  /**
   * Kod hangi kanaldan gidecek — Ü170.
   *
   * 🔴 Bu parametre bir REGRESYONU onarmak için var ve gerekçesi
   * yazılmazsa biri onu "gereksiz seçenek" diye kaldırır.
   *
   * Kod e-postaya taşınırken yalnızca oyuncular düşünülmüştü. Ama bu
   * fonksiyonu **kafe paneli ve platform girişi de** çağırıyor ve
   * onların kimliği `staff` tablosunda — orada e-posta kolonu YOK.
   * Varsayılan e-posta olunca o iki giriş sessizce `eposta_yok`
   * dönmeye başladı: kafe sahibi ve platform yöneticisi paneline hiç
   * giremez olmuştu. Testler bunu yakalamadı çünkü o yolun testi yok.
   *
   * Ürün sahibinin cümlesi *"kullanıcılara sms yerine mail"* idi ve
   * "kullanıcı" oyuncu demek. Personel SMS'te kalıyor — yani onlar
   * için hiçbir şey değişmiyor.
   */
  kanal?: "eposta" | "sms";
  amac: Amac;
  ip?: string;
  cihazId?: string;
  /** Geliştirme defterinde görünecek ekran adı — üretim davranışını etkilemez */
  kaynak?: string;
}): Promise<IstekSonucu> {
  const kaynak = opts.kaynak ?? "Bilinmeyen ekran";
  const indeks = phoneIndex(opts.telefon);
  // Kota anahtarı kişisel veri içermez — kör indeksin ilk baytları (docs/08 §7.1)
  const anahtar = indeks.subarray(0, 8).toString("hex");

  const kilit = await withBypass("otp kilit kontrolü", (db) => kilitKontrol(db, indeks));
  if (kilit) {
    defteriYaz({
      telefon: maskele(opts.telefon),
      nereden: kaynak,
      olay: "Gönderilmedi — numara kilitli",
      not: `Kilit bitişi ${kilit.toLocaleTimeString("tr-TR")}`,
    });
    return { durum: "kilitli", kilitBitis: kilit };
  }

  /*
    Adres kotalardan ÖNCE çözülüyor.

    Gönderilecek yer yoksa kota yakmanın anlamı yok: kullanıcı kodu
    hiç alamayacak ama saatlik hakkını kaybedecekti. Ayrıca `eposta_yok`
    cevabını erken vermek, ekranın doğru cümleyi kurmasını sağlıyor.
  */
  const kanal = opts.kanal ?? "eposta";

  let adres: string | null = null;
  if (kanal === "eposta") {
    adres = await hedefAdres(opts.telefon, opts.eposta);
    if (!adres) {
      defteriYaz({
        telefon: maskele(opts.telefon),
        nereden: kaynak,
        olay: "Gönderilmedi — hesapta e-posta yok",
      });
      return { durum: "eposta_yok" };
    }
  }

  /*
    🔴 Küresel tavan — Ü170'te geri kondu.

    Kod SMS'teyken G14 tavanı (`sms_outbox`) bu yolu da sınırlıyordu.
    E-postaya taşırken o sigorta farkına varılmadan devre dışı kaldı;
    kişi ve IP başına sınırlar duruyordu ama sistem çapında bir
    durdurucu kalmamıştı. Testler yakaladı (`kapasite_dolu` artık hiç
    dönmüyordu) ve tavan e-posta tarafına kendi sayısıyla taşındı.

    Kademe aynı: %90'da kayıt durur, giriş devam eder. Tersi,
    saldırganın işini görmek olurdu.
  */
  const tavan = kanal === "eposta" ? await postaTavani() : await smsTavani();
  const acik = opts.amac === "register" ? tavan.kayitAcik : tavan.girisAcik;
  if (!acik) {
    defteriYaz({
      telefon: maskele(opts.telefon),
      nereden: kaynak,
      olay: `Gönderilmedi — günlük ${kanal === "eposta" ? "e-posta" : "SMS"} tavanı doldu`,
    });
    return { durum: "kapasite_dolu" };
  }

  // Kotalar sırayla: en dar pencere önce, böylece kullanıcıya en yakın
  // tekrar deneme zamanı döner.
  for (const ad of ["otp_per_phone_minute", "otp_per_phone_hour", "otp_per_phone_day"] as const) {
    const s = await tuket(ad, anahtar);
    if (!s.izinli) {
      defteriYaz({
        telefon: maskele(opts.telefon),
        nereden: kaynak,
        olay: "Gönderilmedi — kota doldu",
        not: `${ad} · tekrar ${s.sifirlanma.toLocaleTimeString("tr-TR")}`,
      });
      return { durum: "cok_sik", tekrarDene: s.sifirlanma };
    }
  }

  if (opts.ip) {
    const s = await tuket("otp_per_ip_hour", identifierHash(opts.ip).subarray(0, 8).toString("hex"));
    if (!s.izinli) return { durum: "cok_sik", tekrarDene: s.sifirlanma };
  }

  const kod = otpCode();
  const sonGecerlilik = new Date(Date.now() + KOD_OMRU_SN * 1000);

  await withBypass("otp kaydı", async (db) => {
    // Aynı amaç için bekleyen eski kodlar geçersiz kılınır —
    // aynı anda birden fazla geçerli kod dolaşmasın.
    await db.query(
      `DELETE FROM otp_challenges
        WHERE phone_index = $1 AND purpose = $2 AND consumed_at IS NULL`,
      [indeks, opts.amac],
    );

    await db.query(
      `INSERT INTO otp_challenges
         (id, phone_index, code_hmac, purpose, expires_at, ip_hash, device_id_hash)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [
        newId("otp"),
        indeks,
        hashOtp(kod),
        opts.amac,
        sonGecerlilik,
        opts.ip ? identifierHash(opts.ip) : null,
        opts.cihazId ? identifierHash(opts.cihazId) : null,
      ],
    );
  });

  /*
    İki kanal, iki gönderici. Ortak bir soyutlama yazılmadı: SMS'in
    dönüşünde `engellendi` var (G14 kendi içinde de kesiyor), e-postada
    yok. Tek bir arayüze zorlamak, iki kanalın farkını gizleyip
    birinin hatasını ötekinin diliyle anlatmak olurdu.
  */
  let basarili: boolean;
  let smsKodu: string | undefined;
  if (kanal === "eposta") {
    basarili = (await postaGonder({ adres: adres!, sablon: "otp", degerler: { kod } })).durum === "gonderildi";
  } else {
    const s = await smsGonder(
      { telefon: opts.telefon, sablon: "otp", degerler: { kod } },
      opts.amac === "register" ? "kayit" : "giris",
    );
    basarili = s.durum === "gonderildi";
    smsKodu = s.durum === "gonderildi" ? s.gelistirmeKodu : undefined;
  }

  if (!basarili) {
    defteriYaz({ telefon: maskele(opts.telefon), nereden: kaynak, olay: "Gönderilemedi" });
    return { durum: "gonderilemedi" };
  }

  /*
    Geliştirme kodu kapısı ARTIK BURADA — Ü170.

    Önce SMS sağlayıcısı kodu kendisi geri döndürüyordu; sahte
    sağlayıcı dolu, gerçek sağlayıcı boş veriyordu. Posta modülünde o
    sorumluluk ayrıldı: `gonder` yalnızca gönderiyor, kodun ekranda
    gösterilip gösterilmeyeceğine `epostaKoduEkrandaGosterilir` karar
    veriyor.

    🔴 Kapı **açıkça** sorgulanıyor, "sağlayıcı ne döndürdüyse o"
    değil. Dolaylı hâlinde, ileride gerçek sağlayıcının hata yolunda
    kodu geri döndürmesi yeterdi ve düz kod ekrana düşerdi. Burada
    kodun görünmesi için `APP_ENV !== production` **ve** sahte
    sağlayıcı şartı birlikte aranıyor.
  */
  const gelistirmeKodu =
    kanal === "eposta" ? (epostaKoduEkrandaGosterilir() ? kod : undefined) : smsKodu;

  // Defter kaydı burada yazılıyor — sağlayıcı hangi ekrandan gelindiğini bilmiyor
  defteriYaz({
    telefon: maskele(opts.telefon),
    nereden: kaynak,
    olay: `Doğrulama kodu gönderildi (${kanal === "eposta" ? "e-posta" : "SMS"})`,
    kod: gelistirmeKodu,
  });

  log.info("otp istendi", { amac: opts.amac });
  return { durum: "gonderildi", sonGecerlilik, gelistirmeKodu };
}

/**
 * Kodu doğrular.
 *
 * Karşılaştırma sabit zamanlı — süre ölçerek kod tahmin edilemesin.
 * Doğru kod anında silinir; tekrar kullanılamaz.
 */
export async function kodDogrula(opts: {
  telefon: string;
  kod: string;
  amac: Amac;
}): Promise<DogrulamaSonucu> {
  const indeks = phoneIndex(opts.telefon);

  return withBypass("otp doğrulama", async (db) => {
    const kilit = await kilitKontrol(db, indeks);
    if (kilit) return { durum: "kilitlendi", kilitBitis: kilit };

    const kayit = await db.one<{
      id: string;
      code_hmac: Buffer;
      expires_at: Date;
      attempt_count: number;
    }>(
      `SELECT id, code_hmac, expires_at, attempt_count FROM otp_challenges
        WHERE phone_index = $1 AND purpose = $2 AND consumed_at IS NULL
        ORDER BY created_at DESC LIMIT 1`,
      [indeks, opts.amac],
    );

    if (!kayit) return { durum: "yok" };

    if (kayit.expires_at.getTime() < Date.now()) {
      await db.query(`DELETE FROM otp_challenges WHERE id = $1`, [kayit.id]);
      return { durum: "sure_doldu" };
    }

    if (safeEqual(kayit.code_hmac, hashOtp(opts.kod))) {
      // Doğrulanan kod ANINDA silinir (docs/08 §6 — saklama süresi 3 dakika)
      await db.query(`DELETE FROM otp_challenges WHERE id = $1`, [kayit.id]);
      log.info("otp dogrulandi", { amac: opts.amac });
      return { durum: "dogru" };
    }

    const deneme = kayit.attempt_count + 1;

    if (deneme >= MAX_DENEME) {
      const kilitBitis = new Date(Date.now() + KILIT_DK * 60_000);
      await db.query(
        `UPDATE otp_challenges SET attempt_count = $2, locked_until = $3 WHERE id = $1`,
        [kayit.id, deneme, kilitBitis],
      );
      log.warn("otp kilitlendi", { amac: opts.amac, deneme });
      return { durum: "kilitlendi", kilitBitis };
    }

    await db.query(`UPDATE otp_challenges SET attempt_count = $2 WHERE id = $1`, [kayit.id, deneme]);
    return { durum: "yanlis", kalanDeneme: MAX_DENEME - deneme };
  });
}

/** Süresi geçmiş kayıtları siler. Saatlik bir işten çağrılır. */
export async function temizle(): Promise<number> {
  return withBypass("otp temizliği", async (db) => {
    const r = await db.query(
      `DELETE FROM otp_challenges
        WHERE expires_at < now() - interval '1 hour'
          AND (locked_until IS NULL OR locked_until < now())`,
    );
    return r.rowCount ?? 0;
  });
}
