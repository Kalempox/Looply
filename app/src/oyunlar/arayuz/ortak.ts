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
   * Tam ekrandan çıkış — Ü203.
   *
   * Oyun tam ekrana geçince sayfanın kendi geri bağlantısı görünmez
   * oluyor ve oyuncu turu bitirmeden çıkamıyordu. Kabuk kendi "geri"
   * davranışını buraya veriyor; ekran nereye gidileceğini bilmiyor.
   */
  cik?: () => void;
};
