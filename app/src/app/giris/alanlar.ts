/**
 * "Hesap aç" formunun alanları — adım 1'in sorduğu, adım 2'nin taşıdığı.
 *
 * 🔴 Ü270 — neden tek liste. Adım 2 (doğrulama kodu) hesabı açarken
 * adım 1'in bütün alanlarını sunucuda YENİDEN doğruluyor; alanlar oraya
 * gizli girdi olarak taşınıyor. Ü168'de e-posta zorunlu oldu ve şemaya
 * eklendi, ama adım 2'nin gizli girdilerine **eklenmedi**: kodu doğru
 * giren herkes "E-posta adresi eksik" hatasıyla forma geri atılıyordu.
 * Ürün sahibi telefonda kayıt olmaya çalışırken buldu.
 *
 * Artık iki taraf bu listeden okuyor: adım 2 gizli girdileri buradan
 * üretiyor, şema da `satisfies Record<KayitAlani, …>` ile bu listeye
 * bağlı — birine alan eklenip ötekine eklenmezse derleme düşüyor.
 */
export const KAYIT_ALANLARI = ["telefon", "eposta", "ad", "soyad", "dogumYili"] as const;

export type KayitAlani = (typeof KAYIT_ALANLARI)[number];
