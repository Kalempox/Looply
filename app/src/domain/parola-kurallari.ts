/**
 * Parola kuralları — ekranın ve sunucunun ortak kaynağı.
 *
 * Bu dosya bilerek **saf**: ne veritabanı, ne şifreleme, ne kayıt. Sebebi,
 * kuralların iki tarafta birden gerekmesi. Ekran listeyi kullanıcı yazarken
 * canlı gösteriyor, sunucu aynı listeyle reddediyor. `parola.ts` içinde
 * kalsalardı istemci `node:crypto` ve veritabanı bağlantısını da yanında
 * çekmek zorunda kalırdı — o da mümkün olmadığı için kurallar ekranda ikinci
 * kez yazılır ve er geç sunucudakinden ayrışırdı.
 *
 * `parola.ts` buradakileri yeniden dışa veriyor; sunucu tarafı tek kapıdan
 * (`@/domain/parola`) girmeye devam ediyor.
 */

export const EN_AZ_UZUNLUK = 8;

/**
 * Üst sınır 200: scrypt girdinin uzunluğuyla çalışıyor ve sınırsız parola,
 * bedava bir CPU tüketme yolu olurdu.
 */
export const EN_COK_UZUNLUK = 200;

/** Parolanın karşılaması gereken kurallar — ekranda da bu liste gösteriliyor. */
export type Kural = { ad: string; metin: string; gecti: boolean };

export function kurallar(parola: string): Kural[] {
  return [
    { ad: "uzunluk", metin: `En az ${EN_AZ_UZUNLUK} karakter`, gecti: parola.length >= EN_AZ_UZUNLUK },
    { ad: "buyuk", metin: "En az bir büyük harf", gecti: /\p{Lu}/u.test(parola) },
    { ad: "kucuk", metin: "En az bir küçük harf", gecti: /\p{Ll}/u.test(parola) },
    { ad: "rakam", metin: "En az bir rakam", gecti: /\d/.test(parola) },
  ];
}

export function gecerliMi(parola: string): boolean {
  return parola.length <= EN_COK_UZUNLUK && kurallar(parola).every((k) => k.gecti);
}
