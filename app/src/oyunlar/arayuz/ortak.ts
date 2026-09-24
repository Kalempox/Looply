import { useCallback, useEffect, useEffectEvent, useMemo, useRef, useState } from "react";

/**
 * Oyun ekranlarının ortak sözleşmesi.
 *
 * Kabuk (`oyun-kabuk.tsx`) hangi oyunu gösterdiğini bilmiyor: tohumu
 * veriyor, oyun bitince girdi kaydını geri alıyor. Motor tarafındaki
 * takılabilirliğin arayüz tarafındaki karşılığı bu.
 *
 * Ü83 ile `bolum` kalktı: oyunlar tek turluk ve kaybedene kadar sürüyor.
 *
 * **Girdi kaydı ekranın sorumluluğu.** Oyuncunun her hamlesi, motorun
 * `uygula`ya verdiği biçimde kaydediliyor; sunucu aynı kaydı yeniden
 * oynatacak. Ekranın kaydetmediği bir hamle sunucuda hiç olmamış sayılır.
 */
export type OyunEkraniProps = {
  /**
   * Hangi oyun — tahtanın rengi bundan türüyor (Ü85).
   *
   * Ekran zaten hangi oyun olduğunu biliyor (dosyanın kendisi o oyun) ama
   * renk **kayıt defterinden** geliyor: `oyuncu-renk.ts` içindeki
   * `OYUN_RENGI`. Ekranın kendi rengini seçmesi, oyun kartıyla tahtanın
   * ayrışmasına açık kapı bırakırdı.
   */
  oyunId: string;
  tohum: string;
  /**
   * Oyun bitti — girdi kaydı ve istemcinin hesapladığı skor.
   *
   * Skor yalnızca denetim için gönderiliyor; sunucu kendi hesabını yapıyor
   * ve ödül ondan çıkıyor (S5).
   */
  bitti: (girdiler: unknown[], istemciSkoru: number) => void;
  /**
   * Demo kapısı — geliştirmeye özel ipuçları görünsün mü.
   *
   * Sunucudan geliyor (`kodEkrandaGosterilir()`); canlıda hep false ve
   * ipucu bileşenleri hiç render edilmiyor.
   */
  demoKapisi?: boolean;
  /**
   * Bu tur gerçekten kazandırıyor mu (K2 doğrulanmış mı)?
   *
   * ── Ü199 → Ü201 ─────────────────────────────────────────────
   *
   * Ü199'da bir de `kuponEsigi` vardı: ekran eşiği çubuk olarak
   * gösteriyor, geçilince kutluyordu. Ürün sahibi *"eşik geçildi tarzı
   * şeyler yazmasın"* dedi ve ödül oyunun içinde bir **nesne** oldu —
   * Blok'ta paketli parça (`blok.ts` · `ODUL_BONUSU`). Eşik artık
   * motorun işi, ekranın değil; o yüzden alan kaldırıldı.
   *
   * ⚠️ Bu alan KALDI çünkü motorun bilemeyeceği tek şey bu: konum
   * doğrulanmadıysa kupon açılmıyor. Paket yine çıkıyor (motor
   * deterministik olmak zorunda) ama ekran bilet göstermiyor.
   */
  kazandirir?: boolean;
  /**
   * Ödül paketinin izni — Ü275 · "görünürse kesin".
   *
   * Motor paketi eşikten sonra her turda aynı yerde çıkarıyor (replay
   * determinizmi) ama ödül çıkıp çıkmayacağını BİLEMEZ. O karar
   * sunucuda, paket ilk belirdiği an veriliyor (`useOdulPaketi`).
   * Verilmediyse ekran kabuğu yoktur ve paket hiç çizilmez.
   */
  odul?: OdulIzni;
  /**
   * Tam ekrandan çıkış — Ü203.
   *
   * Oyun tam ekrana geçince sayfanın kendi geri bağlantısı görünmez
   * oluyor ve oyuncu turu bitirmeden çıkamıyordu. Kabuk kendi "geri"
   * davranışını buraya veriyor; ekran nereye gidileceğini bilmiyor.
   */
  cik?: () => void;
};

/**
 * Kabuğun ekrana verdiği paket izni — Ü275.
 *
 * `izin`:
 *   · `true`  → paket ödül olarak çiziliyor; alan kuponu kesin alıyor
 *   · `false` → paket sıradan parça gibi çiziliyor (kafe dışındaki
 *               oyuncuda Ü207'den beri olduğu gibi)
 *   · `null`  → henüz sorulmadı; soru yoldayken de paket ÇİZİLMİYOR —
 *               "evet"ten önce görünüp "hayır"la kaybolan paket, ürün
 *               sahibinin yakaladığı yalanın kısa bir kopyası olurdu
 */
export type OdulIzni = {
  izin: boolean | null;
  /** Motor paketi çıkardı — kabuk sunucuya sorsun. Kayıt o ana kadarki hâliyle. */
  belirdi: (girdiler: readonly unknown[]) => void;
};

/**
 * Paket bu karede ödül olarak çizilsin mi — dokuz ekranın ortak kuralı.
 *
 * `varMi`: motor paketi şu an tahtada tutuyor mu (sözleşmedeki
 * `odulVar`). Paket ilk belirdiğinde soru bir kez gidiyor; kabuk ikinci
 * soruyu zaten yutuyor (`izin` artık null değil).
 *
 * ⚠️ `girdiler` bir ALICI, dizi değil: kayıt bazı ekranlarda ref'te
 * duruyor ve her tick uzuyor. Soru anında okunuyor ki sunucu paketi
 * gördüğü kareye kadar oynatsın.
 */
export function useOdulPaketi(
  odul: OdulIzni | undefined,
  kazandirir: boolean | undefined,
  varMi: boolean,
  girdiler: () => readonly unknown[],
): boolean {
  const sorulacak = varMi && kazandirir === true && odul?.izin === null;
  const sor = useEffectEvent(() => {
    odul?.belirdi([...girdiler()]);
  });
  useEffect(() => {
    if (sorulacak) sor();
  }, [sorulacak]);
  return varMi && kazandirir === true && odul?.izin === true;
}

/**
 * Kabuğun tarafı: turun paket kararını tutar, soruyu bir kez gönderir.
 *
 * `anahtar` turun kimliği (girişlide oturum, misafirde tohum). Yeni tur
 * yeni anahtar demek ve önceki turun kararı ona sızmıyor.
 *
 * ⚠️ Soru başarısız olursa karar null kalıyor ve paket çizilmiyor —
 * sunucu da bir şey yazmadığı için tur sonunda kupon yok. İkisi tutarlı:
 * görünmeyen paket için söz yok.
 */
export function useOdulIzni(
  anahtar: string | null,
  sor: (anahtar: string, girdiler: readonly unknown[]) => Promise<{ izin: boolean }>,
): OdulIzni {
  const [karar, setKarar] = useState<{ anahtar: string; izin: boolean } | null>(null);
  const yolda = useRef<string | null>(null);
  const izin = karar && karar.anahtar === anahtar ? karar.izin : null;

  const belirdi = useCallback(
    (girdiler: readonly unknown[]) => {
      if (!anahtar || izin !== null || yolda.current === anahtar) return;
      yolda.current = anahtar;
      sor(anahtar, girdiler).then(
        (c) => setKarar({ anahtar, izin: c.izin }),
        () => {
          yolda.current = null;
        },
      );
    },
    [anahtar, izin, sor],
  );

  return useMemo(() => ({ izin, belirdi }), [izin, belirdi]);
}
