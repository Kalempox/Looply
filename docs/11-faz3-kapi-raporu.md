# 11 — Faz 3 Güvenlik Kapısı Raporu

**Tarih:** 2026-08-23
**Sonuç:** 🟡 Geçti — **bir açık madde var** (bkz. §6)

Faz 3, planın en riskli fazıydı: gerçek telefon numaraları bu fazda sisteme giriyor. Bu belge, kapı şartlarının hangi testle karşılandığını ve testte bulunan açığın nasıl kapatıldığını kayda geçirir.

---

## §1 · Kapı şartları

| # | Şart | Sonuç |
|---|---|---|
| 1 | Kaba kuvvet → kilit devreye girmeli | ✅ 5 yanlışta 15 dk kilit; kilitliyken yeni kod da istenemiyor |
| 2 | SMS seli → kotada durmalı | ✅ Numara başına 1/dk kotası devrede |
| 3 | Süresi geçmiş / kullanılmış kod → reddedilmeli | ✅ İkisi de ayrı test |
| 4 | Veritabanı dökümünde telefon düz metin **görünmemeli** | ✅ Ham satırda numara ve isim aranıyor, bulunamıyor |
| 5 | Kafe A yöneticisi, kafe B'ye erişememeli | ✅ Faz 2 RLS testleri + `cafe_id` yalnızca oturumdan |
| 6 | Onaysız kafe için karekod üretilememeli | ✅ Karekod çözümleme ve yönetici girişi, ikisi de reddediyor |
| 7 | Global SMS tavanı: önce kayıt dursun, giriş devam | ✅ %92 doluyken kayıt `kapasite_dolu`, giriş `gonderildi` |
| 8 | Numara değiştikten sonra 24 saat kupon kullanılamamalı | ✅ Ödül kilidi testi |
| 9 | Bağımsız güvenlik incelemesi | ⬜ **Yapılmadı** — dışarıdan ayarlanması gerekiyor |

**Testler: 50/50 geçti** (Faz 2'den 25 + Faz 3'ten 25). İki ayrı koşuda aynı sonuç.

---

## §2 · Test sırasında bulunan açık

> **`platform_destek` rolü, başvuru listesinde yetkilinin TAM telefon numarasını görüyordu.**

Ekranda "platform yöneticisi görür" yazıyordu ama veriyi üreten fonksiyon numarayı koşulsuz çözüyordu. G9'un (platform ekibini ikiye ayırma) tam olarak engellemek için var olduğu şey buydu.

**Nasıl bulundu:** Tarayıcıda destek rolüyle giriş yapılıp ekran okundu. Kod incelemesiyle değil, çalıştırarak.

**Nasıl kapatıldı (G26):**

| Önce | Sonra |
|---|---|
| Liste tam numarayı dönüyordu | Liste **hiçbir role** tam numara vermiyor — `0538 *** ** 66` |
| Destek rolü de görüyordu | Açmak ayrı bir işlem, yalnızca `platform_admin` |
| Kayıt tutulmuyordu | Her açış **gerekçesiyle** denetim izine düşüyor |

Doğrulandı: `pii.view` kaydı `{"gerekce":"başvuru incelemesi"}` ile defterde.

**Ders:** "Bu ekranı yalnızca yönetici görür" demek yetmiyor; **veriyi üreten katmanın** rolü bilmesi gerekiyor. Arayüzde saklamak, sunucuda göndermeye engel değil.

---

## §3 · Kanıtlanan iddialar

### Doğrulama kodu

| İddia | Nasıl kanıtlandı |
|---|---|
| Doğru kod tek kullanımlık | İkinci denemede `yok` — doğrulanan kayıt anında siliniyor |
| Yanlış kod deneme düşürüyor | `kalanDeneme` 4'e iniyor |
| 5 yanlışta kilit | 5. denemede `kilitlendi`, sonrasında kod istenemiyor |
| Süresi geçmiş kod | `sure_doldu` |
| Dakikada bir SMS | İkinci istek `cok_sik` |
| Düz kod saklanmıyor | `otp_challenges` satırında 6 haneli hiçbir metin yok; mesaj defterinde metin alanı hiç yok |

### Kimlik ve şifreleme

| İddia | Nasıl kanıtlandı |
|---|---|
| Telefon ve isim şifreli | Ham satırda aranıyor, bulunamıyor: `\x01998c358cdfe8d488…` |
| Aynı numarayla ikinci hesap açılmıyor | İkinci kayıt mevcut hesabı dönüyor |
| Ticari ileti izni ayrı satır (G7) | İzin verilince iki rıza satırı, verilmeyince bir tane |
| Anonim kod kafe bazında farklı (G1) | İki kafedeki kodlar karşılaştırıldı |
| Numara değişince 24 saat kilit (G16) | Kilit bitişi ~24 saat sonra; eski numarayla hesap bulunamıyor |

### Masa karekodu

| İddia | Nasıl kanıtlandı |
|---|---|
| Basılı kod masaya çözülüyor | `qr_secret`'tan türetilen kod doğru masayı veriyor |
| Uydurma kod çalışmıyor | `null` |
| Onaysız kafede çalışmıyor (G5) | Kafe `pending` yapılınca kod ölüyor |
| Jeton tek kullanımlık | İkinci tüketim `kullanilmis` |
| Süresi geçmiş jeton | `suresi_doldu` |

### Kafe başvurusu

| İddia | Nasıl kanıtlandı |
|---|---|
| Liste tam numara sızdırmıyor (G26) | Listenin JSON'unda numara aranıyor, bulunamıyor |
| Telefon açmak kayda düşüyor | `audit_log`'da `pii.view` |
| Aynı telefonla ikinci başvuru | `telefon_kayitli` |
| Onaysız kafenin yöneticisi giremiyor (G5) | Onay öncesi `null`; onaydan sonra hesap açılıyor; askıya alınınca yine `null` |

---

## §4 · Uçtan uca doğrulama (tarayıcıda)

Testlerden ayrı olarak, akışların tamamı gerçek tarayıcıda yürütüldü:

**Oyuncu:** masa karekodu → 90 sn'lik jeton → kayıt formu → doğrulama kodu → hesap açıldı → ana ekran. Ardından "Verilerim" ekranında maskeli numara, kafeye özel anonim kod, kapalı pazarlama izni ve KVKK hakları göründü.

**Kafe:** başvuru formu + belge yükleme → başvuru alındı ekranı.

**Platform (destek):** başvuru göründü, **onay düğmeleri yok**, numara maskeli.

**Platform (yönetici):** numara açıldı (kayıt düştü), başvuru onaylandı. Doğrulandı: kafe `approved`, **yönetici hesabı otomatik açıldı**, belge `accepted`.

**Kafe yöneticisi:** telefonla giriş → panel. Panel sorgularında `cafe_id` süzgeci **yok** — satırları RLS süzüyor ve yalnızca kendi kafesinin 9 masası, 2 personeli, 1 cihazı görünüyor.

---

## §5 · Faz 3'te verilen kararlar

`02-karar-defteri.md` → **G26–G32**. Öne çıkanlar:

**Kayıtsız numarada da "kod gönderildi" denir (G27).** Kafe ve platform girişinde hesabın varlığı belli edilmiyor; aksi halde giriş ekranı, hangi numaraların yönetici olduğunu sorgulama aracına dönüşürdü.

**PIN hash'i scrypt (G28).** `docs/08` argon2id yazıyordu; Node'un içinde gelen scrypt'e geçildi. 4 haneli bir PIN'de belirleyici olan zaten hash değil, **cihaz bağlama ve kilitleme**.

**Giden mesaj defteri (G31).** SMS doğrudan gönderilmiyor; önce `sms_outbox`'a yazılıyor. Maliyet sayımının tek güvenilir yeri burası. Defter kodu içermiyor ve append-only.

---

## §6 · 🔴 Açık madde — canlıya çıkmadan kapatılmalı

### G32 · Platform girişinde ikinci faktör yok

`docs/08` §4.4 platform rolü için ikinci faktör **zorunlu** diyor. Şu an yalnızca telefon + SMS var — yani tek faktör.

Platform yöneticisi hesabı, tüm kafeleri onaylayan ve kişisel veriye erişebilen hesap. Bu hesabın SMS'le korunması yeterli değil (SIM swap).

**Gereken:** TOTP (Google Authenticator türü) ikinci faktör. Faz 10 sertleştirme kalemine yazıldı; giriş ekranında da uyarı olarak duruyor.

### Bağımsız güvenlik incelemesi

Faz 3 kapısının 9. şartı. Kimlik akışı, OTP ve oturum yönetimi bir dış gözle incelenmeli. **Ürün sahibinin ayarlaması gerekiyor.**

---

## §7 · Faz 4'e devredilen

- **Acil durdurma ekranı** (G18) — kimlik oluştuğuna göre artık anlamlı
- Oyuncu arayüzünün gerçek tasarımı — mevcut ekranlar işlevsel iskelet
- Konum doğrulaması (K2) — karekodun fotoğrafını paylaşmayı ancak bu karşılıyor
- Olay müdahale planındaki isim/telefon boşlukları (`docs/10` §1)
