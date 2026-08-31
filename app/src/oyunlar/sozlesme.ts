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
 *   durum = girdiler.reduce(uygula, baslat(tohum, bolum))
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

/** Bir oyunun bir bölümünün tanımı. */
export type Oyun<Durum, Girdi> = {
  id: string;
  ad: string;
  ozet: string;
  emoji: string;
  /** Kaç bölümü var (Ü21: her oyuna 5). */
  bolumSayisi: number;

  /** Bölümün başlangıç durumu. Aynı (tohum, bölüm) her zaman aynı durumu verir. */
  baslat(tohum: string, bolum: number): Durum;

  /** Tek bir girdiyi uygular. Kuraldışıysa **null** — sunucu bunu ret sebebi sayar. */
  uygula(durum: Durum, girdi: Girdi): Durum | null;

  /** Bölüm bitti mi? Bitmiş duruma girdi uygulanamaz. */
  bittiMi(durum: Durum): boolean;

  /** Bölümün skoru. */
  skor(durum: Durum): number;

  /** Bölüm hedefine ulaşıldı mı? Başarısız biten bölüm de skor üretir. */
  basarili(durum: Durum): boolean;

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
 * En uzun bölüm bile bunun çok altında kalıyor.
 */
export const EN_FAZLA_GIRDI = 5_000;

export type TekrarSonucu =
  | {
      gecerli: true;
      skor: number;
      basarili: boolean;
      /**
       * Bölüm bittikten sonra gelen ve işlenmeyen girdi sayısı.
       *
       * Bir tanesi normal: zaman tabanlı oyunlarda istemci en sona bir zaman
       * işareti koyuyor ve o işaret bölümü bitirmiş olabiliyor. Çok sayıda
       * artık girdi ise istemcinin beklenmedik davrandığını gösterir —
       * fraud analizi için kayda değer (Faz 9).
       */
      kullanilmayan: number;
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
  bolum: number,
  hamGirdiler: unknown,
): TekrarSonucu {
  if (!Array.isArray(hamGirdiler)) {
    return { gecerli: false, sebep: "girdi kaydı dizi değil" };
  }
  if (hamGirdiler.length > EN_FAZLA_GIRDI) {
    return { gecerli: false, sebep: `girdi kaydı çok uzun (${hamGirdiler.length})` };
  }
  if (bolum < 1 || bolum > oyun.bolumSayisi || !Number.isInteger(bolum)) {
    return { gecerli: false, sebep: `geçersiz bölüm: ${bolum}` };
  }

  let durum: Durum;
  try {
    durum = oyun.baslat(tohum, bolum);
  } catch {
    return { gecerli: false, sebep: "bölüm kurulamadı" };
  }

  let i = 0;
  for (; i < hamGirdiler.length; i++) {
    // Bölüm bittiyse kalan girdiler **yok sayılır**, reddedilmez.
    //
    // İlk hâli reddediyordu ve bu, zaman tabanlı oyunları tamamen kırıyordu:
    // istemci kaydın sonuna bir zaman işareti koymak zorunda (yoksa sunucu
    // yerçekimini son hamlede durdurur ve skoru düşük hesaplar), ama o işaret
    // çoğu zaman bölümü bitiren şeyin ta kendisi oluyor. Katı kural, dürüst
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
    basarili: oyun.basarili(durum),
    kullanilmayan: hamGirdiler.length - i,
  };
}
