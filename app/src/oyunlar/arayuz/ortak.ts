/**
 * Oyun ekranlarının ortak sözleşmesi.
 *
 * Kabuk (`oyun-kabuk.tsx`) hangi oyunu gösterdiğini bilmiyor: tohumu ve
 * bölümü veriyor, oyun bitince girdi kaydını geri alıyor. Motor tarafındaki
 * takılabilirliğin arayüz tarafındaki karşılığı bu.
 *
 * **Girdi kaydı ekranın sorumluluğu.** Oyuncunun her hamlesi, motorun
 * `uygula`ya verdiği biçimde kaydediliyor; sunucu aynı kaydı yeniden
 * oynatacak. Ekranın kaydetmediği bir hamle sunucuda hiç olmamış sayılır.
 */
export type OyunEkraniProps = {
  tohum: string;
  bolum: number;
  /**
   * Oyun bitti — girdi kaydı ve istemcinin hesapladığı skor.
   *
   * Skor yalnızca denetim için gönderiliyor; sunucu kendi hesabını yapıyor
   * ve ödül ondan çıkıyor (S5).
   */
  bitti: (girdiler: unknown[], istemciSkoru: number) => void;
};
