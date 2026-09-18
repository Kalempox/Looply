"""Yeşil ekran videosundan koşan Loopy'nin hareketli WebP'sini üretir — Ü183.

Kaynak `gelen/avatar/*.mp4` (gitignore'da), çıktı
`app/public/avatar/loopy-kacan.webp`.

── 🔴 Neden hareketli WebP ─────────────────────────────────

Karakter sahnenin üstünde koşuyor, yani **alfa şart**. Seçenekler:

  · MP4/H.264   — alfa YOK, eleniyor
  · WebM/VP9    — alfası Safari'de çalışmıyor (Ü173'te ölçüldü)
  · iki dosya   — VP9 + HEVC; iki kodlama, iki yol, iki hata kaynağı
  · WebP        — alfalı, tek dosya, `<img>` ile çalışıyor ✅

⚠️ Bedeli var: hareketli WebP'nin hızı koddan ayarlanamıyor ve
`prefers-reduced-motion` onu durduramıyor. İkincisi için bileşen
tarafında ayrı bir önlem var (`loopy-kosan.tsx`).

── 🔴 Yumuşak anahtar, düz eşik değil ──────────────────────

"Yeşilse sil" iki yerde bozuluyor: karakterin kenarında tırtık
bırakıyor, dumanda ise dumanın kendisini siliyor — duman yarı saydam ve
arkasındaki yeşili geçiriyor.

Burada yeşillik sürekli bir sayı (`g - max(r, b)`); alfa iki eşik
arasında doğrusal iniyor. Kenarlar yumuşak, duman yarı saydam kalıyor.

Sızıntı ayrıca bastırılıyor: kalan piksellerde `g`, `max(r, b)`
seviyesine çekiliyor, yoksa kesim sonrası kenarda yeşil hâle kalıyor.

── ⚠️ Videodaki duraklama BİLEREK duruyor ──────────────────

Karakter ortada ~1,3 saniye yerinde sayıyor. Kesmeyi denedim: dikişte
bacak duruşu tutan tek bir kare bile yok (en iyi eşleşmede bile şekil
farkı 0,21) ve kesim 59 piksellik bir ışınlanma bırakıyor. Kaynakta
öyle; paniğe de yakışıyor.
"""

import os
import subprocess

import numpy as np
from PIL import Image

KOK = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
GELEN = os.path.join(os.path.dirname(KOK), "gelen", "avatar")
CIKTI = os.path.join(KOK, "public", "avatar")
GECICI = os.path.join(GELEN, ".kacan-kareler")

KAYNAK = "A_small_3D_coffee_cup_20260918160753.mp4"

# Karakterin sağdan girip soldan çıktığı tek geçiş (1 tabanlı, dahil).
# Video 240 kare; öncesi boş, sonrası ikinci ve yarım bir geçiş.
ILK, SON = 17, 116

# 🔴 480'den 720'ye çıkarıldı — ürün sahibi *"loopy'miz bulanık
# gözüküyor"* dedi ve haklıydı. Ölçü: görsel ekran genişliğinde
# duruyor, telefonda 375-430 CSS piksel ve 3x ekranda 1125-1290 cihaz
# pikseli. 480'lik kaynak orada 2,3 kat geriliyordu.
#
# ⚠️ Bedeli dosya: 480'de 437 KB, 720'de 800 KB. 960 da denendi (1,1 MB)
# ve kazancı 720'ye göre görünür değil — 720 zaten 2x ekranda birebire
# yakın. Kalite ayarı işe yaramıyor (68 ve 58 arasında 45 KB fark var):
# boyutu belirleyen şey duman, her karede değişen geniş bir doku.
GENISLIK = 720
KALITE = 68
KARE_HIZI = 24

# Yeşillik eşikleri (0-255): üstü zemin, altı gövde, arası kenar/duman.
TAM_ZEMIN = 60
TAM_GOVDE = 18


def kareleri_cikar() -> list[str]:
    os.makedirs(GECICI, exist_ok=True)
    for f in os.listdir(GECICI):
        os.remove(os.path.join(GECICI, f))

    subprocess.run(
        [
            "ffmpeg", "-y", "-v", "error",
            "-i", os.path.join(GELEN, KAYNAK),
            "-vf", f"select='between(n\\,{ILK - 1}\\,{SON - 1})',scale={GENISLIK}:-1",
            "-vsync", "0",
            os.path.join(GECICI, "k%03d.png"),
        ],
        check=True,
    )
    return sorted(
        os.path.join(GECICI, f) for f in os.listdir(GECICI) if f.endswith(".png")
    )


def anahtarla(yol: str) -> Image.Image:
    a = np.asarray(Image.open(yol).convert("RGB")).astype(np.float32)
    r, g, b = a[:, :, 0], a[:, :, 1], a[:, :, 2]

    yesillik = g - np.maximum(r, b)
    alfa = np.clip((TAM_ZEMIN - yesillik) / (TAM_ZEMIN - TAM_GOVDE), 0, 1)
    yesilsiz = np.minimum(g, np.maximum(r, b) + 8)

    return Image.fromarray(np.dstack([r, yesilsiz, b, alfa * 255]).astype(np.uint8))


def main() -> None:
    yollar = kareleri_cikar()
    kareler = [anahtarla(y) for y in yollar]

    # Tüm karelerin birleşik içerik kutusu: üstteki boş bant atılıyor.
    kutu = None
    for k in kareler:
        b = k.getbbox()
        if not b:
            continue
        kutu = b if kutu is None else (
            min(kutu[0], b[0]), min(kutu[1], b[1]),
            max(kutu[2], b[2]), max(kutu[3], b[3]),
        )
    if kutu:
        kareler = [k.crop(kutu) for k in kareler]

    os.makedirs(CIKTI, exist_ok=True)
    yol = os.path.join(CIKTI, "loopy-kacan.webp")
    kareler[0].save(
        yol,
        save_all=True,
        append_images=kareler[1:],
        duration=round(1000 / KARE_HIZI),
        loop=0,
        quality=KALITE,
        method=4,
    )

    for f in os.listdir(GECICI):
        os.remove(os.path.join(GECICI, f))
    os.rmdir(GECICI)

    print(
        f"  loopy-kacan.webp  {kareler[0].width}x{kareler[0].height}  "
        f"{len(kareler)} kare  {os.path.getsize(yol) // 1024} KB"
    )


if __name__ == "__main__":
    main()
