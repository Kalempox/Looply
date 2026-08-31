"use server";

import { redirect } from "next/navigation";
import { headers, cookies } from "next/headers";
import { z } from "zod";
import { kodIste, kodDogrula } from "@/domain/otp";
import { kaydet, telefonlaBul, takmaAd } from "@/domain/player";
import { biletCoz, MASA_COOKIE } from "@/domain/qr";
import * as oturum from "@/domain/session";
import * as masaOturumu from "@/domain/masa";
import * as misafir from "@/domain/misafir";
import { misafirOyunuYaz } from "@/domain/oyun";
import {
  girisDene as parolaDene,
  belirle as parolaBelirle,
  gecerliMi as parolaGecerliMi,
  hataMetni as parolaHataMetni,
  EN_COK_UZUNLUK as PAROLA_EN_COK,
} from "@/domain/parola";
import { gonder } from "@/sms";
import { telefonSemasi, isimSemasi, otpSemasi, dogumYiliSemasi, dogrula } from "@/lib/validate";
import { phoneIndex } from "@/lib/crypto";
import { log } from "@/lib/log";
import * as davet from "@/domain/davet";

/**
 * Kayıt ve giriş akışı — iki kapı, tek kimlik (Ü36).
 *
 * ── "Giriş yap" sekmesi ─────────────────────────────────────
 * Telefon + parola. SMS'e hiç dokunmuyor: her girişte kod beklemek hem yavaş
 * hem pahalı (docs/07 §2.3 — OTP aynı zamanda bir maliyet kapısı).
 *
 * ── "Hesap aç" sekmesi ──────────────────────────────────────
 * Eski akışın kendisi: telefon + isim + doğum yılı + onaylar → doğrulama
 * kodu. Hesap ANCAK kod geçtikten sonra yazılıyor (G13). Değişen tek şey,
 * artık parolanın da aynı adımda belirlenmesi: numarayı doğrulayan kişiyle
 * parolayı koyan kişinin aynı olduğu kanıtlanmış oluyor.
 *
 * ── Ü1 değişmedi ────────────────────────────────────────────
 * Kimlik hâlâ doğrulanmış telefon numarası. Parola onun yerine geçmiyor,
 * yanına geliyor; "şifremi unuttum" için ayrı bir jeton ve ayrı bir saldırı
 * yüzeyi doğmuyor — parolasını unutan SMS ile girip yenisini belirliyor.
 */

export type Sekme = "giris" | "kayit";

export type Durum = {
  /** "form": sekmenin kendi formu · "kod": SMS doğrulama adımı */
  adim: "form" | "kod";
  sekme: Sekme;
  hatalar?: Record<string, string>;
  genelHata?: string;
  bilgi?: string;
  /** Yalnızca geliştirmede dolu gelir — sahte SMS sağlayıcısının kodu. */
  gelistirmeKodu?: string;
  /**
   * Adım 2'de forma geri konur — kullanıcının kendi girdiği değerler.
   *
   * 🔴 PAROLA BURAYA KONMAZ. Bu nesne her eylem sonucunda sunucudan istemciye
   * dönüyor ve React durumunda yaşıyor; parola konsaydı ekranın hata ayıklama
   * yüzeyine sızardı. Parola yalnızca form gövdesinde taşınıyor.
   */
  degerler?: { telefon?: string; ad?: string; soyad?: string; dogumYili?: string };
  /** Kullanıcının "beni hatırla" tercihi — adımlar arasında korunur. */
  hatirla?: boolean;
  /** Ticari ileti izni — adım 2'ye taşınmazsa sessizce kaybolur (G7). */
  pazarlama?: boolean;
};

const kayitSemasi = z.object({
  telefon: telefonSemasi,
  ad: isimSemasi,
  soyad: isimSemasi,
  dogumYili: dogumYiliSemasi,
});

const parolaGirisSemasi = z.object({
  telefon: telefonSemasi,
  parola: z.string().min(1, "Parolanı gir").max(PAROLA_EN_COK, "Parola çok uzun"),
});

async function istekBilgisi() {
  const h = await headers();
  return {
    ip: h.get("x-forwarded-for")?.split(",")[0].trim() ?? h.get("x-real-ip") ?? undefined,
    ua: h.get("user-agent") ?? undefined,
  };
}

/** Kullanıcıya gösterilecek metin — teknik ayrıntı sızdırmadan. */
function istekHatasi(durum: string, ek?: Date): string {
  switch (durum) {
    case "cok_sik":
      return ek
        ? `Çok sık denendi. Saat ${ek.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })} sonrası tekrar deneyebilirsin.`
        : "Çok sık denendi, biraz sonra tekrar dene.";
    case "kilitli":
      return "Bu numara geçici olarak kilitlendi. 15 dakika sonra tekrar dene.";
    case "kapasite_dolu":
      return "Şu an yeni kayıt alınamıyor. Kısa süre sonra tekrar dene.";
    default:
      return "Kod gönderilemedi. Biraz sonra tekrar dene.";
  }
}

function formDegerleri(form: FormData) {
  return {
    telefon: String(form.get("telefon") ?? ""),
    ad: String(form.get("ad") ?? ""),
    soyad: String(form.get("soyad") ?? ""),
    dogumYili: String(form.get("dogumYili") ?? ""),
  };
}

/**
 * Girişten sonraki ortak iş: masa bağlantısı ve takma ad.
 *
 * İki giriş yolu var ve ikisi de aynı şeyi yapmak zorunda. Ayrı ayrı
 * yazılsaydı biri unutulurdu: karekodu okutup **parolayla** giren oyuncu
 * masasına oturmamış olur, ekran da sebebini söyleyemezdi.
 *
 * Masa bileti ÇEREZDEN okunuyor — formdan değil. Formdaki gizli alan
 * kullanıcı tarafından değiştirilebilirdi; çerez HttpOnly ve imzalı.
 */
async function masayaOturt(playerId: string, cihazId?: string): Promise<void> {
  const bilet = (await cookies()).get(MASA_COOKIE)?.value;
  if (!bilet) return;

  const masa = biletCoz(bilet);
  if (!masa) return;

  await takmaAd(masa.cafeId, playerId);
  await masaOturumu.ac({ cafeId: masa.cafeId, tableId: masa.tableId, playerId, cihazId });
}

/**
 * Kayıt öncesi oynanan oyunun talebini bozdurur (Ü35).
 *
 * `masayaOturt`'tan **sonra** çağrılmalı: kanıt masa oturumunda duruyor ve o
 * oturum bir satır önce açılıyor. Sırası bozulsaydı talep, kanıtı olmayan bir
 * masaya düşer ve ödül hiç açılmazdı.
 *
 * Talep çerezi her hâlükârda siliniyor — bozdurulduysa işini yaptı,
 * bozdurulamadıysa (süresi geçmiş, başka masaya ait) ikinci bir denemede de
 * geçmeyecek. Ayrıca gerçek tek-kullanım güvencesi çerezde değil tohumda:
 * `misafirOyunuYaz` aynı tohumlu ikinci satırı reddediyor.
 *
 * Hata oyuncuyu yolda bırakmamalı: giriş başarılı oldu, oyuncu içeride.
 * Talep bozdurulamadıysa bu bir kayıp, ama girişin kendisi değil.
 */
async function talebiBozdur(playerId: string): Promise<void> {
  const c = await cookies();
  const talep = misafir.talepCoz(c.get(misafir.TALEP_COOKIE)?.value);

  c.delete(misafir.TALEP_COOKIE);
  c.delete(misafir.OYUN_COOKIE);
  c.delete(misafir.KONUM_COOKIE);

  if (!talep) return;

  try {
    // Misafirken ölçülen konum masaya işleniyor. Ölçüm sunucuda yapılmıştı ve
    // imzalı talepte taşındı; koordinat hiçbir aşamada saklanmadı (G10).
    if (talep.k2 || talep.mesafeM !== null) {
      await masaOturumu.konumuUygula({
        playerId,
        cafeId: talep.cafeId,
        tableId: talep.tableId,
        k2: talep.k2,
        mesafeM: talep.mesafeM,
      });
    }

    const sonuc = await misafirOyunuYaz({
      playerId,
      cafeId: talep.cafeId,
      tableId: talep.tableId,
      oyunId: talep.oyunId,
      bolum: talep.bolum,
      tohum: talep.tohum,
      skor: talep.skor,
      basarili: talep.basarili,
      iddia: talep.iddia,
      sureMs: talep.sureMs,
    });

    if (!sonuc.ok) log.warn("misafir talebi bozdurulamadi", { sebep: sonuc.hata });
  } catch (err) {
    log.warn("misafir talebi bozdurulurken hata", { hata: String(err) });
  }
}

/* ── "Giriş yap": telefon + parola ───────────────────────── */

export async function parolaIleGir(_onceki: Durum, form: FormData): Promise<Durum> {
  const telefonHam = String(form.get("telefon") ?? "");
  const hatirla = form.get("hatirla") === "on";

  const geri = (ek: Partial<Durum>): Durum => ({
    adim: "form",
    sekme: "giris",
    degerler: { telefon: telefonHam },
    hatirla,
    ...ek,
  });

  const alan = dogrula(parolaGirisSemasi, {
    telefon: telefonHam,
    parola: String(form.get("parola") ?? ""),
  });
  if (!alan.ok) return geri({ hatalar: alan.hatalar });

  const telefon = alan.veri.telefon; // E.164 — şema normalize etti
  const oyuncu = await telefonlaBul(telefon);

  const sonuc = await parolaDene({
    playerId: oyuncu?.id ?? null,
    parola: alan.veri.parola,
    // Kota anahtarı kişisel veri içermez — kör indeksin ilk baytları
    // (docs/08 §7.1). Numaranın kendisi anahtar olsaydı, hız sınırı tablosu
    // düz telefon numaralarından oluşan bir defter hâline gelirdi.
    limitAnahtari: phoneIndex(telefon).subarray(0, 8).toString("hex"),
  });

  // Numara kayıtlı değil, parola yanlış, hesabın parolası yok — üçü de aynı
  // cevabı alıyor. Ayrımı `parola.hataMetni` yapıyor ve orada test ediliyor.
  if (!sonuc.ok) return geri({ genelHata: parolaHataMetni(sonuc.durum) });

  // Cihaz tanıdıklığı oturum AÇILMADAN önce sorulmalı: `olustur` bu cihazın
  // hash'ini sessions'a yazıyor ve sonrasında her cihaz "tanıdık" görünür.
  const { ua } = await istekBilgisi();
  const cihazId = ua ?? undefined;
  const tanidik = cihazId ? await oturum.cihazTanidikMi(sonuc.playerId, cihazId) : true;

  await oturum.olustur({
    ozneTipi: "player",
    ozneId: sonuc.playerId,
    rol: "oyuncu",
    cihazId,
    hatirla,
  });

  // Parola, SMS'in yanına ikinci bir kapı açıyor; o kapının da zili olmalı.
  // Bildirim gitmezse hesabı ele geçiren kişi hiç fark edilmezdi.
  if (!tanidik) await gonder({ telefon, sablon: "new_device" }, "bildirim");

  await masayaOturt(sonuc.playerId, cihazId);
  await talebiBozdur(sonuc.playerId);

  // Davet çerezi burada BOZDURULMUYOR: `davet.bagla` yalnızca yeni hesapta
  // çalışıyor (Ü20) ve parolayla giren kişinin hesabı tanımı gereği yeni
  // değil. Çerez duruyor — kişi başka bir numarayla kaydolursa işini görür.

  log.info("giris tamamlandi", { yol: "parola" });
  redirect("/oyna");
}

/* ── "Hesap aç" adım 1: bilgiler + parola → kod ──────────── */

export async function kodGonder(_onceki: Durum, form: FormData): Promise<Durum> {
  const degerler = formDegerleri(form);
  const hatirla = form.get("hatirla") === "on";
  const pazarlama = form.get("pazarlama") === "on";

  const geri = (ek: Partial<Durum>): Durum => ({
    adim: "form",
    sekme: "kayit",
    degerler,
    hatirla,
    pazarlama,
    ...ek,
  });

  const kayit = dogrula(kayitSemasi, degerler);
  if (!kayit.ok) return geri({ hatalar: kayit.hatalar });

  if (form.get("aydinlatma") !== "on") {
    return geri({
      hatalar: { aydinlatma: "Devam etmek için aydınlatma metnini onaylaman gerekiyor" },
    });
  }

  // Parola daha kod istenmeden sınanıyor. Sırası önemli: kural ihlali altı
  // haneli kodu bekledikten SONRA öğrenilirse, kod boşa yanar ve kullanıcı
  // yeni kod istemek zorunda kalır.
  if (!parolaGecerliMi(String(form.get("parola") ?? ""))) {
    return geri({ hatalar: { parola: "Parola kuralları karşılanmadı" } });
  }

  const telefon = kayit.veri.telefon;
  const { ip } = await istekBilgisi();

  // Numara kayıtlıysa bu bir giriş, değilse kayıt. Global SMS tavanı ikisine
  // farklı davranıyor (G14): tavan dolmaya başlayınca önce kayıt durur.
  const mevcut = await telefonlaBul(telefon);

  const sonuc = await kodIste({
    telefon,
    amac: mevcut ? "login" : "register",
    ip,
    kaynak: mevcut ? "Oyuncu girişi" : "Oyuncu kaydı",
  });

  if (sonuc.durum !== "gonderildi") {
    return geri({
      genelHata: istekHatasi(sonuc.durum, "tekrarDene" in sonuc ? sonuc.tekrarDene : undefined),
    });
  }

  return {
    adim: "kod",
    sekme: "kayit",
    bilgi: "Doğrulama kodu gönderildi. 3 dakika geçerli.",
    gelistirmeKodu: sonuc.gelistirmeKodu,
    degerler,
    hatirla,
    pazarlama,
  };
}

/* ── "Hesap aç" adım 2: kod → hesap + parola ─────────────── */

export async function kodDogrulaVeGir(_onceki: Durum, form: FormData): Promise<Durum> {
  const degerler = formDegerleri(form);
  const hatirla = form.get("hatirla") === "on";
  const pazarlama = form.get("pazarlama") === "on";

  const ortak = { sekme: "kayit" as const, degerler, hatirla, pazarlama };
  const formaDon = (ek: Partial<Durum>): Durum => ({ adim: "form", ...ortak, ...ek });
  const kodaDon = (ek: Partial<Durum>): Durum => ({ adim: "kod", ...ortak, ...ek });

  const kayit = dogrula(kayitSemasi, degerler);
  if (!kayit.ok) return formaDon({ hatalar: kayit.hatalar });

  // Parola yine kod TÜKETİLMEDEN sınanıyor: buradan sonra reddedilirse
  // kullanıcı elinde geçersiz bir kodla kalırdı.
  const yeniParola = String(form.get("parola") ?? "");
  if (!parolaGecerliMi(yeniParola)) {
    return formaDon({ hatalar: { parola: "Parola kuralları karşılanmadı" } });
  }

  const kodAlani = dogrula(otpSemasi, String(form.get("kod") ?? ""));
  if (!kodAlani.ok) return kodaDon({ hatalar: { kod: "Doğrulama kodu 6 rakamdır" } });

  const telefon = kayit.veri.telefon;
  const mevcutOyuncu = await telefonlaBul(telefon);
  const amac = mevcutOyuncu ? "login" : "register";

  const sonuc = await kodDogrula({ telefon, kod: kodAlani.veri, amac });

  if (sonuc.durum === "yanlis") {
    return kodaDon({ hatalar: { kod: `Kod yanlış. ${sonuc.kalanDeneme} deneme hakkın kaldı.` } });
  }
  if (sonuc.durum === "kilitlendi") {
    return formaDon({ genelHata: "Çok fazla yanlış deneme. Bu numara 15 dakika kilitlendi." });
  }
  if (sonuc.durum === "sure_doldu") {
    return formaDon({ genelHata: "Kodun süresi doldu. Yeni kod iste." });
  }
  if (sonuc.durum === "yok") {
    return formaDon({ genelHata: "Önce doğrulama kodu iste." });
  }

  // ── Kod doğru: hesap buradan sonra yazılır (G13)
  const { ip, ua } = await istekBilgisi();
  const { oyuncu, yeni } = await kaydet({
    telefon,
    ad: kayit.veri.ad,
    soyad: kayit.veri.soyad,
    dogumYili: kayit.veri.dogumYili,
    pazarlamaIzni: pazarlama,
    ip,
    ua,
  });

  // Parola hesapla aynı adımda yazılıyor: numara az önce doğrulandı, yani
  // parolayı koyan kişinin o numaraya sahip olduğu kanıtlandı.
  const parolaSonucu = await parolaBelirle({ playerId: oyuncu.id, parola: yeniParola });
  if (!parolaSonucu.ok) {
    // Kurallar kod istenmeden önce zaten sınandı; buraya düşmek beklenmiyor.
    // Yine de kod tüketildiği için oyuncu içeri alınıyor: parolasız kalır
    // ama SMS ile girmeye devam eder — yolda bırakmak daha kötü olurdu.
    log.warn("parola belirlenemedi, giris surduruldu");
  }

  const cihazId = ua ?? undefined;
  const tanidik = cihazId ? await oturum.cihazTanidikMi(oyuncu.id, cihazId) : true;

  await oturum.olustur({ ozneTipi: "player", ozneId: oyuncu.id, rol: "oyuncu", cihazId, hatirla });

  // Yeni cihazdan giriş bildirimi — hesabı ele geçirilen kişiyi uyandıran şey bu
  if (!yeni && !tanidik) {
    await gonder({ telefon, sablon: "new_device" }, "bildirim");
  }

  await masayaOturt(oyuncu.id, cihazId);
  await talebiBozdur(oyuncu.id);

  // Davet atfı — çerezden, formdan değil (masa bileti ile aynı gerekçe).
  //
  // `yeni` bayrağı buradan geçiyor: davet ancak **yeni hesap** açtıysa
  // bağlanıyor. Mevcut müşterinin daveti sayılsaydı, herkes birbirini davet
  // edip XP üretirdi ve ödül hiçbir şey ifade etmezdi (Ü20).
  const davetId = (await cookies()).get(davet.DAVET_COOKIE)?.value;
  if (davetId) {
    await davet.bagla({ referralId: davetId, inviteeId: oyuncu.id, yeniHesap: yeni });
    // Çerez tek işini yaptı; ikinci bir kayıtta yeniden kullanılmasın.
    (await cookies()).delete(davet.DAVET_COOKIE);
  }

  log.info("giris tamamlandi", { yeni, yol: "sms" });
  redirect("/oyna");
}
