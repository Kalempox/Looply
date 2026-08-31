# 10 — Olay Müdahale Planı

> **Faz 3'ün ön koşulu (G17).** Bu fazda gerçek telefon numaraları sisteme girmeye
> başlıyor. O andan itibaren bir ihlal ihtimali var ve KVKK bildirim süresi **72 saat**.

**Son güncelleme:** 2026-08-23
**Durum:** Asgari plan. Faz 10'da genişletilecek, hukuki metinler avukat onayından geçecek.

---

## Bu plan neden var

Bir ihlal anında kaybedilen şey zamandır. "Kimi arayacağız, kim kapatacak, ne yazacağız" soruları o an düşünülmeye başlanırsa 72 saat kolayca geçer.

Plan, o anda **düşünmek zorunda kalmamak** için yazılıyor.

---

# §1 · Dört soru, önceden yazılı cevaplar

| Soru | Cevap |
|---|---|
| **Kim haber alır?** | `[AD SOYAD]` · `[TELEFON]` — tek kişi. "Ekip" değil |
| **Yedeği kim?** | `[AD SOYAD]` · `[TELEFON]` — birinciye 30 dk içinde ulaşılamazsa |
| **Kim durdurabilir?** | Yukarıdaki iki kişi. Acil durdurma yetkisi başkasında yok |
| **Kim bildirir?** | Kurul bildirimini `[AD SOYAD]`, avukat onayıyla |

> ⚠️ Köşeli parantezler Faz 3 canlıya çıkmadan **doldurulmuş olmalı.** Boş bırakılırsa bu plan işlemez.

---

# §2 · Olay nedir, ne değildir

**Olaydır** — bu planı tetikler:

- Kişisel veriye yetkisiz erişim şüphesi (telefon, ad, soyad)
- Veritabanı veya yedek dosyası sızıntısı şüphesi
- Bir kafenin başka bir kafenin verisini gördüğü tespiti
- Sunucuya yetkisiz erişim
- Anahtar sızıntısı (`PII_ENC_KEY`, `PHONE_INDEX_KEY`, `BACKUP_ENC_KEY` …)
- Kupon veya bütçe defterinde açıklanamayan hareket
- Olağandışı SMS hacmi (maliyet saldırısı)

**Değildir** — normal arıza yönetimi:

- Sunucu çöktü, veri kaybı yok
- Bir kafenin paneli açılmıyor
- SMS sağlayıcısı gecikmeli gönderiyor

Emin olunamıyorsa **olay sayılır.** Yanlış alarmın maliyeti, geç kalmanın maliyetinden küçüktür.

---

# §3 · Zaman çizelgesi

## İlk 1 saat — DURDUR

Amaç hasarı büyütmemek. Sebep aramak sonra.

1. Haber alan kişi bilgilendirilir
2. **Acil durdurma** ekranından gereken düğmeye basılır (`docs/07` §2.10):
   - Kafeyi askıya al · Tüm oturumları iptal et · Kupon dağıtımını durdur · SMS'i durdur
3. **Hiçbir log silinmez, hiçbir kayıt düzeltilmez.** Kanıt bozulur ve denetim izi zaten append-only
4. Olay saati, kim fark etti, ilk belirti — bir yere yazılır

**Anahtar sızıntısı şüphesi varsa:** ilgili anahtar hemen döndürülür (`docs/08` §5.3). Kör indeks anahtarı sızdıysa numaralar okunamaz ama "bu numara sistemde var mı" sorusu cevaplanabilir hâle gelir — yine de dönülmelidir.

## İlk 24 saat — KAPSAMI BELİRLE

Cevaplanacaklar:

| Soru | Nereye bakılır |
|---|---|
| Hangi veriler etkilendi? | `audit_log` — `pii.view`, `coupon.redeem`, `budget.update` kayıtları |
| Kaç kişi etkilendi? | Etkilenen `player_id` kümesi |
| Ne zaman başladı? | İlk anormal kayıt zaman damgası |
| Hâlâ sürüyor mu? | Alarm eşikleri, canlı log |
| Nasıl girildi? | Sunucu erişim logları, bağımlılık açıkları |

Denetim izi **değiştirilemez** olduğu için bu sorular cevaplanabilir. Planın en çok işe yarayan tarafı burada ortaya çıkıyor.

## 72 saat — BİLDİR

**Kurul'a bildirim** (KVKK m.12/5) — gecikmesi ayrı bir ihlaldir:

- Ne oldu, ne zaman, nasıl öğrenildi
- Etkilenen kişi ve kayıt sayısı
- Muhtemel sonuçlar
- Alınan ve alınacak önlemler

**Etkilenen kişilere bildirim** — makul en kısa sürede. Metin avukat onayından geçer; SMS ve uygulama içi bildirimle yapılır.

**Kafelere bildirim** — kendi verileri etkilendiyse.

---

# §4 · Olay sonrası

1. **Kök neden analizi** — suçlu değil, sebep aranır
2. **Kalıcı önlem** — aynı olayın tekrarını engelleyen test veya kısıt eklenir
3. **Karar defterine kayıt** — `02-karar-defteri.md`'ye yeni bir G kararı
4. Bu plan güncellenir

> Her olay, bir güvenlik kapısına dönüşmelidir. Yoksa aynı hata tekrar gelir.

---

# §5 · Yılda bir tatbikat

Masabaşı, yaklaşık bir saat. Senaryo okunur, adımlar **sözlü olarak** yürütülür:

> *"Sabah 09:00. Bir kafe sahibi arıyor: panelinde başka bir kafenin ciro rakamlarını gördüğünü söylüyor. Ne yapıyorsun?"*

Ölçülen şey: kaç dakikada durdurabildiğimiz ve kimin ne yapacağını bilip bilmediği.

**Hiç denenmemiş plan, plan değildir.**

---

# §6 · Hazırlık listesi — Faz 3 canlıya çıkmadan

- [ ] §1'deki isim ve telefonlar dolduruldu
- [ ] Acil durdurma ekranı çalışıyor ve iki kişi kullanmayı biliyor
- [ ] Kurul bildirim metni taslağı hazır (avukat onaylı)
- [ ] Etkilenen kişi bildirim metni taslağı hazır
- [ ] Anahtar döndürme adımları bir kez denendi
- [ ] Yedekten geri yükleme son 30 gün içinde yapıldı
