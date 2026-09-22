# 32 — TEST · BUTİK KASİYERİ (A'dan Z'ye)

> **Kim olduğun:** butik işletmenin kasasındaki kişi. **İki işin var** —
> kafedeki kasiyerin bir işi vardı, senin iki:
>
> 1. Kupon onaylamak *(kafedekiyle aynı)*
> 2. **Alışverişe çark hakkı vermek** *(yalnızca butikte)*
>
> **Önce oku:** `30-test-barista-kasiyer.md` — birinci iş orada anlatıldı,
> burada tekrarlanmıyor.

**Rol:** `kasiyer` · **Ekran:** `/kasa` → **`/kasa/cark`**

---

## A · İkinci işin kapısı

### A.1 · Bağlantıyı gör

**Ne yaparsın:** `/kasa` ekranını aç.

**Ne görmelisin:** tarayıcının **altında** tek satırlık bir bağlantı:
*"Alışverişe çark hakkı ver →"*

🔴 **Hata sayılır:**
- Bağlantı büyük bir düğmeyse. Kasiyer buraya kupon onaylamaya geliyor;
  gözü ikinci işe takılmamalı.
- Bağlantı **normal kafede de** görünüyorsa. Kafede kasa tutar girmiyor;
  kasiyer tutar girer, hiçbir koşul tutmaz ve sistemin bozuk olduğunu
  sanır.

### A.2 · Aç

**Ne yaparsın:** bağlantıya tıkla.

**Ne görmelisin:** `/kasa/cark` açılır; tutar girme ve/veya koşul seçme
ekranı.

---

## B · Tutarla hak verme

> İşletme sahibi koşulu kurmuş olmalı — örnek: *"500 TL ve üzeri
> alışveriş"*. Kurulum: `31-test-butik-isletme.md` §C.2

### B.1 · Eşiğin üstü

**Ne yaparsın:** 600 TL gir, müşteriyi seç/okut.

**Ne görmelisin:** çark hakkı verilir; müşterinin `/cark` ekranı döner
hâle gelir.

🔴 **Hata sayılır:** hak verildiği hâlde müşteride "çark hakkın yok"
yazıyorsa.

### B.2 · 🔴 Eşiğin hemen altı — asıl test

**Ne yaparsın:** 480 TL gir.

**Ne görmelisin:** hak **verilmez** ve ekran **eksik tutarı söyler**
("20 TL daha" gibi).

🔴 **Hata sayılır:** yalnızca "koşul tutmadı" diyorsa. Eksik tutarı
söylemek satışı büyütebilecek bilgidir; söylememek onu boşa atar.

### B.3 · Sınırlar

| Dene | Beklenen |
|---|---|
| 0 TL | Reddedilir |
| Eksi tutar | Kabul edilmez |
| Çok büyük tutar (100.000 TL üstü) | Kabul edilmez |
| Boş bırak | Kabul edilmez |

🔴 **Hata sayılır:** bunlardan biri sessizce kabul ediliyorsa.

---

## C · Ürün koşulu

**Ne yaparsın:** koşul "şu ürünü alana" olsun; o ürünle bir kez, başka
ürünle bir kez dene.

**Ne görmelisin:** yalnızca doğru üründe hak verilir.

🔴 **Hata sayılır:** her üründe hak veriyorsa.

---

## D · Adet koşulları

### D.1 · Günlük adet

**Ne yaparsın:** koşul "günde 3 kişiye" olsun. Dört kez hak vermeyi dene.

**Ne görmelisin:** ilk üçü verilir, dördüncüsü reddedilir ve **sebebini
söyler**.

🔴 **Hata sayılır:**
- Dördüncüsü de veriliyorsa.
- Ret sebebi "bugünkü adet doldu" demiyorsa.

### D.2 · Ertesi gün

**Ne görmelisin:** ertesi gün sayaç sıfırlanır.

🔴 **Hata sayılır:** ertesi gün de dolu görünüyorsa.

⚠️ Gün başlangıcı **İstanbul gece yarısı**, sunucunun UTC günü değil.
Gece 01:00'de test edersen bunu ayrıca kontrol et.

---

## E · Aynı müşteriye ikinci kez

**Ne yaparsın:** aynı müşteriye aynı gün ikinci kez hak vermeyi dene.

**Ne görmelisin:** kuralın ne diyorsa onu — ama **sessiz kalmamalı**.

🔴 **Hata sayılır:** ekran hiçbir şey söylemeden hak veriyor ya da
vermiyorsa. Kasiyer müşteriye bir cevap vermek zorunda.

---

## F · İki iş birbirine karışmasın

**Ne yaparsın:** `/kasa/cark`ta hak verdikten sonra `/kasa`ya dön ve
bir kupon onayla.

**Ne görmelisin:** ikisi birbirini etkilemez.

🔴 **Hata sayılır:**
- Çark hakkı verince kupon sayacı artıyorsa.
- Kupon onaylayınca çark hakkı veriliyorsa.

---

## G · Yetki sınırı

**Ne yaparsın:** butik kasiyeriyle `/kafe/panel/cark` yazmayı dene.

**Ne görmelisin:** giremezsin. Çarkın **kurulumu** işletme sahibinin,
**kullanımı** kasiyerin.

🔴 **Hata sayılır:** kasiyer çark dilimlerini ya da yüzdelerini
değiştirebiliyorsa.

---

## Bittiğinde elinde ne olmalı

- [ ] `/kasa`da yalnızca butikte görünen ikinci bağlantı
- [ ] Eşiğin üstünde verilen, altında **eksik tutarı söyleyerek**
      reddedilen birer deneme
- [ ] Adet koşulunun dolması ve ertesi gün sıfırlanması
- [ ] İki işin birbirine karışmaması
- [ ] Kasiyerin çark kurulumuna girememesi
