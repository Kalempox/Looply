# Kelime listesi — kaynak ve lisans

`kelimeler.json` **elle yazılmadı, üretildi.** Üretici: `scripts/kelime-listesi-uret.ts`.
Yeniden üretmek için: `npm run kelime:uret -- <tr_TR.dic> <tr_50k.txt>`

---

## Kaynaklar

### 1 · tdd-ai/hunspell-tr — **MPL-2.0** — *kelimelerin geldiği yer*

https://github.com/tdd-ai/hunspell-tr

Türkçe Hunspell imla sözlüğü, Turkish Data Depository grubu tarafından geliştirildi.
Listedeki her kelime bu sözlüğün kök listesinden gelir.

Katkıda bulunanlar: Ali Safaya · Arda Göktoğan · Deniz Yuret · Emirhan Kurtuluş · Taner Sezer

> Atıf: Safaya et al., *Mukayese: Turkish NLP Strikes Back*, 2022.

### 2 · hermitdave/FrequencyWords — **MIT** — *yalnızca süzgeç*

https://github.com/hermitdave/FrequencyWords · `content/2018/tr/tr_50k.txt`

OpenSubtitles frekans listesi. Buradan **hiçbir kelime alınmıyor**; yalnızca
"bu dizi gerçek metinde tek başına geçiyor mu?" sorusunu cevaplamak için
kullanılıyor. Hunspell'in kök listesi ek çıkarımı için üretildiğinden içinde
`abanm`, `abac` gibi tek başına kelime olmayan gövdeler var; bu süzgeç onları eliyor.

---

## Bu dosyanın lisansı

`kelimeler.json`, MPL-2.0 lisanslı hunspell-tr verisinden **türetilmiştir.**

MPL-2.0 **dosya düzeyinde** copyleft'tir: bu veri dosyası MPL-2.0 kalır ve kaynağı
erişilebilir tutulur. **Uygulama kodunun lisansına dokunmaz** — MPL, aynı programda
farklı lisanslı dosyaların bir arada bulunmasına izin verir.

Karar ve gerekçesi: `docs/02-karar-defteri.md` → **Ü23**.

---

## Uygulanan süzgeçler

| Süzgeç | Kural |
|---|---|
| Uzunluk | 4–7 harf |
| Alfabe | Yalnızca Türk alfabesi; rakam, kesme işareti, yabancı harf yok |
| Sözlük | Hunspell kök listesinde bulunmalı |
| Çekim | Bilinen bir tabana ek eklenerek elde edilebiliyorsa elenir |
| İçerik | Küfür, hakaret ve cinsel içerik kök listesi |
| Sıralama | Frekansa göre; en yaygın 5.000 kelime alınır |

---

## ⚠️ Bilinen sınırlar

**İçerik geçici.** Ürün sahibinin 2026-08-25 tarihli notu: *"önemli olan anlam değil,
harf sayısı ve kelimeler; harfler şimdilik göstermelik."* Kalıcı olan oyun motoru ve
sunucu doğrulaması; bu liste değiştirilebilir veridir.

**Çekim süzgeci tam değil.** Tabanı iki harfli çoğullar (`aylar`, `eller`) geçebiliyor.
Çoğu zaten geçerli kelime olduğu için süzgeç bilerek gevşek bırakıldı — daha agresif
bir kural gerçek kelimeleri elemeye başlıyor.

**Küfür süzgeci otomatik.** Hiçbir dilde otomatik süzgeç tam değildir.
**Canlıya çıkmadan önce listenin bir insan tarafından gözden geçirilmesi gerekiyor.**
Ekran kafede, masada, görünür yerde duruyor.
