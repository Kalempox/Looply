#!/usr/bin/env bash
# Çarkı çeviren Loopy videosunu ham hâlinden ürüne hazırlar — Ü197.
#
# Ürün sahibi animasyonu dışarıda ürettiriyor ve elimize 1920×1080,
# alfasız, düz siyah zeminli bir MP4 geliyor. Bu betik onu ürünün
# kullanabileceği hâle getiriyor. Bir daha üretilirse aynı adımlar
# gerekecek; onun için komut satırında kalmadı, buraya yazıldı.
#
#   kullanım: scripts/cark-video-isle.sh <ham.mp4>
#   çıktı:    public/cark/loopy-cevirir.webm
set -euo pipefail

HAM="${1:?kullanım: $0 <ham.mp4>}"
KOK="$(cd "$(dirname "$0")/.." && pwd)"
CIKTI="$KOK/public/cark/loopy-cevirir.webm"

# 🔴 Süre `cark.tsx`teki DONUS_MS ile AYNI olmalı. İkisi ayrışırsa
# Loopy çark dururken hâlâ oynuyor (ya da erken donuyor) olur.
SURE=4.6

# ── 🔴 Zamanlama: itiş BAŞA çekiliyor ────────────────────────
#
# İlk sürüm ham videoyu olduğu gibi 4.6 saniyeye sıkıştırıyordu ve ürün
# sahibi *"Loopy doğru zamanda çevirmiyor çarkı, uyuşmuyor"* dedi.
# Ölçüm onu doğruladı, iki ayrı sebeple:
#
#   1. **İtiş ortada.** Kare kare hareket yoğunluğu ölçüldü; zirve ham
#      videonun **0.83. saniyesinde**. Çarkın yavaşlama eğrisi ise
#      (`cubic-bezier(.12,.68,.06,1)`) çok öne yüklü — 680 ms'de dönüşün
#      **%68'i** bitmiş oluyor. Yani Loopy, çark neredeyse duracakken
#      itiyordu.
#   2. **Son 1.2 saniye ölü.** 4.79 sn'den sonra kare farkı sıfıra
#      iniyor: karakter donuyor, çark hâlâ dönüyor.
#
# Çözüm ikisini birden kapatıyor: baş, itişin hemen öncesinden
# kesiliyor (zirve ~80 ms'ye geliyor, çark %10'dayken) ve ölü kuyruk
# atılıyor. Kalan malzeme 4.6'dan kısa olduğu için hafifçe yavaşlatılıyor
# — hızlandırmak değil, yavaşlatmak; itiş daha ağır görünüyor.
BAS=0.76      # itiş zirvesi 0.83 → başlangıçtan ~70 ms sonra
CANLI_SON=4.75  # bundan sonrası donuk kare
HAM_SURE="$(python -c "print(round($CANLI_SON - $BAS, 4))")"

# 🔴 Kadraj BİRLEŞİK kutudan. Tek kareye göre kırpmak hareketin
# tepesinde kolu kesiyor; bu değerler 36 kare taranarak bulundu
# (bkz. aşağıdaki not).
KIRP="crop=932:984:508:80"

# 🔴 Alfa luma anahtarıyla. Riskli görünüyor çünkü karakterin kolları
# ve bacakları da siyah — ama ölçüm ayrımı gösteriyor: zemin tam 0,0,0
# (luma 0), uzuvlar luma 20+ ve arada histogramda neredeyse boş bir
# bant var. Eşik o bandın içinde.
#
# ⚠️ Zemin gerçekten düz siyah olmalı. Üretim aracı gri ya da degrade
# bir zemin verirse bu eşik tutmaz; o hâlde ya yeşil zemin istenmeli
# ya da alfa doğrudan (WebM/ProRes 4444) istenmeli.
ANAHTAR="lumakey=threshold=0.015:tolerance=0.055:softness=0.12"

mkdir -p "$(dirname "$CIKTI")"

# ⚠️ `-auto-alt-ref 0` ŞART: açıkken libvpx alfa kanalını düşürüyor.
# ⚠️ `-an` ses yok — ham dosyada var ve ürünün burada sesi yok.
# ⚠️ `-ss` girdiden ÖNCE: sonra konsaydı ffmpeg baştan çözüp atardı.
ffmpeg -v error -y -ss "$BAS" -t "$HAM_SURE" -i "$HAM" -an \
  -filter_complex "[0:v]${KIRP},${ANAHTAR},setpts=(${SURE}/${HAM_SURE})*PTS,scale=456:-2,format=yuva420p" \
  -c:v libvpx-vp9 -crf 38 -b:v 0 -row-mt 1 -auto-alt-ref 0 \
  "$CIKTI"

# ── Duruş karesi ─────────────────────────────────────────────
#
# 🔴 Video artık itişin İÇİNDEN başlıyor, yani ilk karesi yana eğilmiş
# bir Loopy. Çevirmeden önce ekranda o durursa karakter sebepsiz yere
# eğik bekliyor gibi görünür. Bu yüzden ham videonun **ilk karesi**
# (nötr duruş) ayrıca kesiliyor ve `<video poster>` olarak veriliyor;
# `cark.tsx` dönüş bitince `load()` çağırıp buraya dönüyor.
ffmpeg -v error -y -i "$HAM" -frames:v 1 \
  -vf "${KIRP},${ANAHTAR},scale=456:-2" \
  "$KOK/public/cark/loopy-duruyor.webp"

echo "yazıldı: $CIKTI + loopy-duruyor.webp"
ffprobe -v error -show_entries format=duration,size \
  -show_entries stream_tags=alpha_mode -of default=noprint_wrappers=1 "$CIKTI"

# ── Birleşik kutuyu yeniden hesaplamak gerekirse ──────────────
#
#   ffmpeg -i ham.mp4 -vf "select='not(mod(n\,4))',scale=480:270" -vsync 0 k/%03d.png
#
# sonra her karede luma > 12 olan piksellerin sınırlarını birleştir ve
# 1920×1080 ölçeğine (×4) çevir, her kenara ~8 piksel pay bırak.
#
# ── Doğrulama ─────────────────────────────────────────────────
#
# `alpha_mode=1` etiketi alfanın YAZILDIĞINI söylüyor ama çizildiğini
# söylemiyor. Gerçek kontrol tarayıcıda: mor sahnenin üstünde siyah bir
# kutu çıkıyorsa o tarayıcı VP9 alfayı yok sayıyor demektir.
