/**
 * Saklama süreleri — KVKK'nın "ne kadar süre" sorusunun koddaki karşılığı.
 *
 * ── Neden ayrı dosya ────────────────────────────────────────
 *
 * Süreler bugüne kadar sildikleri verinin yanında duruyordu ve çoğu
 * oradaydı çünkü teknik bir gerekçesi vardı: OTP kaydı süresi geçince
 * işe yaramaz, karekod taraması bir saat sonra anlamsız.
 *
 * Giden kutuları farklı. Onları silen şey teknik bir gereklilik değil,
 * bir **ilke kararı**: veriyi işimiz bittikten sonra tutmuyoruz. Bu
 * kararın `docs/24-veri-envanteri.md` §6'daki beyanla **aynı sayı**
 * olması gerekiyor ve iki yerde ayrı ayrı yazılsaydı biri güncellenmeden
 * kalırdı — bu projede o hatanın adı var (Ü71).
 *
 * ⚠️ Buraya teknik ömürler (OTP, karekod, hız sınırı) taşınmadı. Onlar
 * sildikleri verinin yanında doğru duruyor; buraya yalnızca **beyan
 * edilen** süreler giriyor.
 */

/**
 * Giden kutularının saklama süresi — gün.
 *
 * ── Sayı nereden ────────────────────────────────────────────
 *
 * `docs/24-veri-envanteri.md` §6'nın kendi önerisi: *"12 ay (gönderim
 * ispatı + itiraz penceresi)"*. Belge bunu `[ONAY]` işaretiyle ürün
 * sahibine bırakmıştı; karar verilene kadar öneri uygulanıyor.
 *
 * 🔴 Değiştirilirse `docs/24` §6 de değişmeli. Beyan edilen süreyle
 * uygulanan süre ayrışırsa belge yalan söyler ve bunu kimse fark etmez.
 *
 * ── Tablolarda ne var, ne yok ───────────────────────────────
 *
 * İkisinde de **adres açık tutulmuyor**: yalnızca maskeli hâli
 * (`0532 *** ** 67`, `b***@ornek.com`) ve kör indeks (HMAC). Mesaj
 * gövdesi hiç saklanmıyor. Yani silinen şey kişisel verinin kendisi
 * değil, **kime ne zaman gönderildiğinin izi**.
 *
 * ⚠️ Bu, süreyi gereksiz kılmıyor. Kör indeks aynı adrese kaç kez
 * gönderildiğini sayabiliyor; süresiz biriken bir sayaç, amacı
 * bittikten sonra da kişiyi izlenebilir kılar.
 */
export const GIDEN_KUTUSU_GUN = 365;
