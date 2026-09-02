/**
 * Oyun sözleşmesi — takılabilir motorun tamamı.
 *
 * Faz 5'in dördüncü maddesi şunu istiyor: *"yeni oyun eklemek kod değişikliği
 * değil, dosya eklemek olsun."* Bu dosya o sözün karşılığı — bir oyun,
 * aşağıdaki dört fonksiyonu veren bir modüldür. Motor başka hiçbir şey bilmez.
 *
 * ── En kritik özellik ───────────────────────────────────────
 *
 * Aynı modül **hem istemcide hem sunucuda** çalışır. İstemci oynatır,
 * sunucu aynı fonksiyonlarla yeniden oynar. Doğrulama böylece ayrı bir
 * "kontrol kodu" değil, oyunun kendisidir — iki kod yolu ayrışamaz.
 *
 *   durum = girdiler.reduce(uygula, baslat(tohum))
 *   skor  = skor(durum)
 *
 * İstemciden gelen skor bu hesaba **hiç girmez**; yalnızca denetim için
 * saklanır (S5, `play_sessions.claimed_score`).
 *
 * ── Güvenlik ────────────────────────────────────────────────
 *
 * Girdi kaydı **güvenilmeyen JSON**. `girdiOku` her olayı tek tek biçim
 * denetiminden geçirir; `uygula` da kural denetimi yapar ve kuraldışı
 * hamlede `null` döner. İkisi ayrı: biri "bu veri doğru biçimde mi",
 * diğeri "bu hamle oyunun kurallarına uyuyor mu".
 */

/**
 * Bir oyunun tanımı.
 *
 * ── Ü83: bölüm yok, tek tur var ─────────────────────────────
 *
 * Sözleşme başlangıçta `bolumSayisi` ve `baslat(tohum, bolum)` taşıyordu:
 * her oyunun beş sabit bölümü vardı ve bölüm hedefe ulaşınca **bitiyordu.**
 * Ürün sahibinin kararıyla oyunlar **kaybedene kadar** oynanıyor; zorluk
 * turun içinde artıyor. Bölüm kavramı tamamen kalktı.
 *
 * `basarili()` de bu sözleşmeden çıktı ve sebebi ayrı: "başarı" artık bir
 * oyun kuralı değil, bir **ürün kararı** — hangi skorun kupon kazandırdığı
 * `domain/puan.ts` içinde (`KUPON_ESIGI`). Oyun yalnızca skor üretiyor;
 * o skorun ne kazandırdığını oyun bilmiyor.
 */
export type Oyun<Durum, Girdi> = {
  id: string;
  ad: string;
  ozet: string;
  emoji: string;

  /** Turun başlangıç durumu. Aynı tohum her zaman aynı durumu verir. */
  baslat(tohum: string): Durum;

  /** Tek bir girdiyi uygular. Kuraldışıysa **null** — sunucu bunu ret sebebi sayar. */
  uygula(durum: Durum, girdi: Girdi): Durum | null;

  /**
   * Tur bitti mi? Bitmiş duruma girdi uygulanamaz.
   *
   * Ü83'ten beri bunun tek anlamı **kaybetmek**: tıkanmak, tahtanın
   * dolması, sürenin bitmesi. Kazanarak biten bir tur yok.
   */
  bittiMi(durum: Durum): boolean;

  /** Turun skoru. */
  skor(durum: Durum): number;

  /**
   * Oyunun kendi saatine göre geçen süre (ms) — zamansız oyunlarda yok.
   *
   * ── Ü84: neden sözleşmede ───────────────────────────────────
   *
   * Zaman tabanlı oyunlarda saat **istemcide** işliyor ve tick değerlerini
   * istemci bildiriyor. Az tick bildiren oyuncu kendine fazladan süre
   * kazandırır: Kelime'de tur hiç bitmez, Düşen'de yerçekimi yavaşlar.
   *
   * Sunucu gerçek süreyi zaten biliyor (`play_sessions.duration_ms`).
   * Karşılaştırabilmesi için oyunun **kendi** süresini de sorması gerekiyor
   * — bu fonksiyon onu veriyor. Zamansız oyunlar (Blok) tanımlamıyor ve
   * karşılaştırma onlar için hiç çalışmıyor.
   */
  gecenMs?(durum: Durum): number;

  /**
   * Güvenilmeyen JSON'u girdiye çevirir. Biçim yanlışsa **null**.
   *
   * Zod yerine elle yazıldı: bu modüller istemciye de iniyor ve girdi
   * biçimleri birkaç sayıdan ibaret. Şema kütüphanesini oyun başına
   * paketlemek, kazandırdığından fazlasını götürürdü.
   */
  girdiOku(ham: unknown): Girdi | null;
};

/** Herhangi bir oyunu tutabilen tip — kayıt defteri için. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type HerhangiOyun = Oyun<any, any>;

/**
 * Girdi kaydı üst sınırı.
 *
 * Sınırsız kayıt, sunucuyu yeniden oynatarak yormanın en ucuz yolu:
 * saldırgan 10 milyon hamlelik bir dosya gönderir, sunucu hepsini işler.
 * ⚠️ Ü83 ile oyunlar sonsuz oldu ve bu sınır artık gerçekten bağlayıcı:
 * çok uzun bir Düşen turu binlerce tick işareti üretebilir. Sınıra dayanan
 * tur reddedilmiyor — istemci kaydı kırpıyor ve skor o ana kadarki hâliyle
 * hesaplanıyor.
 */
export const EN_FAZLA_GIRDI = 5_000;

/**
 * Bir tick kaç milisaniye — zaman tabanlı oyunların ortak birimi.
 *
 * Hem ekranlar hem `gecenMs` bunu kullanıyor. İki yerde ayrı yazılıydı ve
 * ayrışmaları hâlinde sunucunun süre karşılaştırması (Ü84) sessizce yanlış
 * çalışırdı.
 */
export const TICK_MS = 50;

/**
 * Oyunun kendi saati gerçek sürenin en az bu kadarını göstermeli (Ü84).
 *
 * ── Neden gerekiyor ─────────────────────────────────────────
 *
 * Zaman tabanlı oyunlarda saat istemcide işliyor ve tick değerlerini
 * istemci bildiriyor. Az tick bildirmek kendine süre kazandırıyor:
 * Kelime'de tur hiç bitmiyor, Düşen'de yerçekimi yavaşlıyor. Sunucu
 * gerçek süreyi biliyor (`play_sessions.duration_ms`); tek eksik onu
 * bildirilenle karşılaştırmaktı.
 *
 * ── Neden yarısı, tamamı değil ──────────────────────────────
 *
 * Dürüst istemcide ikisi neredeyse eşit — sayaç duvar saatinden türüyor.
 * Ama arada meşru boşluklar var: oturum sunucuda açılıyor, ekran birkaç
 * yüz milisaniye sonra kuruluyor; ağ gecikmesi bitişe biniyor; oyuncu
 * oyunu açıp birkaç saniye bakıp başlıyor. Yarım, bunların hepsini
 * karşılayacak kadar geniş ve on dakikayı üç saniye diye bildirmeyi
 * yakalayacak kadar dar.
 */
export const EN_AZ_SAAT_ORANI = 0.5;

/**
 * Kısa turlarda oran anlamsız — bu sürenin altındaki tur hiç sınanmıyor.
 *
 * Beş saniyelik bir turda yarım saniyelik bir kurulum gecikmesi %10'luk
 * bir sapma demek; oranla ölçmek kısa turları haksız yere reddederdi.
 * Bu eşiğin altında kazanılabilecek bir şey de yok.
 */
export const SAAT_ALT_SINIR_MS = 10_000;

/**
 * Bildirilen oyun saati gerçek süreyle tutarlı mı? (Ü84)
 *
 * `oyunMs` null ise (Blok gibi zamansız oyun) her zaman geçerli.
 */
export function saatTutarliMi(oyunMs: number | null, gercekMs: number): boolean {
  if (oyunMs === null) return true;
  if (gercekMs < SAAT_ALT_SINIR_MS) return true;
  return oyunMs >= gercekMs * EN_AZ_SAAT_ORANI;
}

export type TekrarSonucu =
  | {
      gecerli: true;
      skor: number;
      /**
       * Tur bittikten sonra gelen ve işlenmeyen girdi sayısı.
       *
       * Bir tanesi normal: zaman tabanlı oyunlarda istemci en sona bir zaman
       * işareti koyuyor ve o işaret bölümü bitirmiş olabiliyor. Çok sayıda
       * artık girdi ise istemcinin beklenmedik davrandığını gösterir —
       * fraud analizi için kayda değer (Faz 9).
       */
      kullanilmayan: number;
      /**
       * Ü84: oyunun kendi saatine göre geçen süre. Zamansız oyunda `null`.
       *
       * Çağıran bunu gerçek geçen süreyle karşılaştırıyor; burada yalnızca
       * hesaplanıp taşınıyor.
       */
      oyunMs: number | null;
    }
  | { gecerli: false; sebep: string };

/**
 * Girdi kaydını yeniden oynatır ve skoru hesaplar.
 *
 * **Sunucunun tek doğruluk kaynağı bu fonksiyondur.** İstemcinin ne iddia
 * ettiği burada hiç okunmaz.
 */
export function tekrarOyna<Durum, Girdi>(
  oyun: Oyun<Durum, Girdi>,
  tohum: string,
  hamGirdiler: unknown,
): TekrarSonucu {
  if (!Array.isArray(hamGirdiler)) {
    return { gecerli: false, sebep: "girdi kaydı dizi değil" };
  }
  if (hamGirdiler.length > EN_FAZLA_GIRDI) {
    return { gecerli: false, sebep: `girdi kaydı çok uzun (${hamGirdiler.length})` };
  }
  let durum: Durum;
  try {
    durum = oyun.baslat(tohum);
  } catch {
    return { gecerli: false, sebep: "tur kurulamadı" };
  }

  let i = 0;
  for (; i < hamGirdiler.length; i++) {
    // Tur bittiyse kalan girdiler **yok sayılır**, reddedilmez.
    //
    // İlk hâli reddediyordu ve bu, zaman tabanlı oyunları tamamen kırıyordu:
    // istemci kaydın sonuna bir zaman işareti koymak zorunda (yoksa sunucu
    // yerçekimini son hamlede durdurur ve skoru düşük hesaplar), ama o işaret
    // çoğu zaman turu bitiren şeyin ta kendisi oluyor. Katı kural, dürüst
    // oyuncunun skorunu reddediyordu.
    //
    // Yok saymak güvenli: durum artık değişmiyor, dolayısıyla kaydı uzatarak
    // kazanılacak bir şey yok.
    if (oyun.bittiMi(durum)) break;

    const girdi = oyun.girdiOku(hamGirdiler[i]);
    if (girdi === null) {
      return { gecerli: false, sebep: `${i}. girdi biçimi hatalı` };
    }

    const sonraki = oyun.uygula(durum, girdi);
    if (sonraki === null) {
      return { gecerli: false, sebep: `${i}. hamle kuraldışı` };
    }
    durum = sonraki;
  }

  return {
    gecerli: true,
    skor: oyun.skor(durum),
    oyunMs: oyun.gecenMs ? oyun.gecenMs(durum) : null,
    kullanilmayan: hamGirdiler.length - i,
  };
}
