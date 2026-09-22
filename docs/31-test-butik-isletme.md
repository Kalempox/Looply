# 31 — TEST · BUTİK İŞLETME (A'dan Z'ye)

> **Kim olduğun:** butik bir işletmenin sahibi — giyim, kuyum, hediyelik.
> Müşterin masaya oturmuyor, alışveriş yapıp çıkıyor.
>
> **Neden ayrı belge:** butikte **oyun yok.** Ödül oyundan değil
> **çarktan** geliyor ve çark hakkını kasiyer alışverişe karşılık
> veriyor. Bu, kafe modelinden farklı bir akış.

**Rol:** `kafe_yoneticisi` (işletme türü `butik`) · **Panel:** `/kafe/panel`

---

## A · İşletme türü

### A.1 · Butik olarak kurul

**Ne yaparsın:** başvuruda işletme türünü **butik** seç, platform
onaylasın.

**Ne görmelisin:** panelde **"Oyunlar" durağı yok.**

🔴 **Hata sayılır:** butikte "Oyunlar" durağı görünüyorsa. Orada
yönetilecek hiçbir şey yok; duran bir menü, çalışmayan bir söz demektir.

⚠️ Asıl kapı menüde değil sunucuda: butik işletme oyun ayarlarına
erişememeli, adresi elle yazsa bile.

### A.2 · 🔴 Adresi elle yazarak dene

**Ne yaparsın:** butik hesabıyla girmişken `/kafe/panel/oyunlar` yaz.

**Ne görmelisin:** giremezsin.

🔴 **Hata sayılır:** sayfa açılıyorsa — menüden gizlemek yetmez.

---

## B · Kurulum

Kafedeki adımların çoğu aynı; **farklı olanlar** burada.

| Durak | Butikte durumu |
|---|---|
| Konum | ✅ Aynı — bunsuz kimse ödül kazanamaz |
| Ürünler | ✅ Aynı — çark koşulu ürüne bağlanabiliyor |
| Ödüller | ✅ Aynı |
| Bütçe | ✅ Aynı |
| Karekod | ✅ Var — masa yerine tezgâh/vitrin karekodu |
| **Oyunlar** | 🔴 **Yok** |
| Personel | ✅ Aynı — kasiyer hesabı burada da gerekli |
| Happy Hour | ✅ Aynı |
| **Çark** | 🔴 **Merkezde** — kafede yardımcı, burada ana mekanizma |

---

## C · Çark — butiğin ödül motoru

### C.1 · Dilimleri kur

**Ne yaparsın:** `/kafe/panel/cark` → dilimleri ve her birinin **çıkma
yüzdesini** gir.

**Ne görmelisin:** dilim listesi, yüzdeler ve toplamı.

🔴 **Hata sayılır:**
- Yüzdelerin toplamı tutmuyorsa ve ekran bunu söylemiyorsa.
- Günlük adedi dolmuş bir ödül çarkta **görünmeye devam ediyorsa**.
  Çarkta görünen ama asla çıkmayan dilim, çarkın yalan söylemesidir.

### C.2 · Çark koşullarını kur

Butikte çark hakkı bedava değil; bir koşula bağlı. Dört tür var:

| Koşul | Ne demek | Test et |
|---|---|---|
| **Tutar** | "500 TL ve üzeri alışveriş" | Eşiğin altında ve üstünde birer tutar dene |
| **Ürün** | Belirli bir ürünü alana | O ürünle ve başka ürünle dene |
| **Günlük** | Günde N kişiye | Adedi doldur, N+1'inci reddedilmeli |
| **İlk gelen** | Günün ilk N müşterisine | Aynı şekilde |

**Ne görmelisin:** koşul listesi, her birinin okunur bir cümlesi
("500 TL ve üzeri alışveriş" gibi).

🔴 **Hata sayılır:**
- Eşik 50 TL'nin altına ya da 100.000 TL'nin üstüne yazılabiliyorsa.
- Adet 100'ün üstüne çıkabiliyorsa.
- Koşul cümlesi okunmuyorsa — kasiyer o cümleyi müşteriye söyleyecek.

### C.3 · Eşiğin hemen altını dene

**Ne yaparsın:** koşul "500 TL ve üzeri" iken kasada **480 TL** gir.
*(Kasiyer tarafı: `32-test-butik-kasiyer.md`)*

**Ne görmelisin:** hak verilmez **ve eksik tutar söylenir**.

🔴 **Hata sayılır:** yalnızca "koşul tutmadı" diyorsa. Eksik tutarı
söylemek satışı büyütebilecek bilgidir; söylememek onu boşa atar.

---

## D · Müşteri akışı — butikte nasıl işliyor

### D.1 · Karekodu okut

**Ne yaparsın:** tezgâhtaki karekodu müşteri telefonuyla okutsun.

**Ne görmelisin:** müşteri oyuncu ekranına girer.

🔴 **Hata sayılır:** butikte **oyun listesi** açılıyorsa. Butikte oyun
yok; müşterinin göreceği şey çark ve ödülleri.

### D.2 · Çark hakkı

**Ne yaparsın:** kasiyer alışverişe karşılık hak versin, müşteri
`/cark` ekranını açsın.

**Ne görmelisin:** çark dönebilir hâle gelir.

🔴 **Hata sayılır:**
- Hak verilmeden çark dönebiliyorsa.
- Hak verildiği hâlde "çark hakkın yok" diyorsa.

### D.3 · Ödül ve kupon

Buradan sonrası kafeyle aynı: kupon açılır, `/oduller` içinde görünür,
kasada bozdurulur.

🔴 **Hata sayılır:** butikte kazanılan kupon kasa ekranında
tanınmıyorsa.

---

## E · Bütçe butikte de bağlayıcı

**Ne yaparsın:** günlük bütçeyi düşük bir sayıya çek, arka arkaya çark
çevirt.

**Ne görmelisin:** bütçe bitince ödül çıkmaz; çark yine döner ama
kazandırmaz ya da ekran sebebini söyler.

🔴 **Hata sayılır:** bütçe bittiği hâlde ödül dağıtılmaya devam
ediyorsa.

---

## Bittiğinde elinde ne olmalı

- [ ] Butik olarak onaylanmış işletme
- [ ] Panelde "Oyunlar" durağının olmaması **ve** adresle de açılamaması
- [ ] Kurulmuş çark ve en az iki koşul
- [ ] Eşiğin altında reddedilen, üstünde kabul edilen birer deneme
- [ ] Çarktan kazanılmış ve kasada bozdurulmuş bir kupon
