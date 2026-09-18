"""Oyun kartlarının sahne görsellerini üretir — Ü180.

Kaynak `gelen/oyun/` (gitignore'da), çıktı `app/public/oyun/`.
Avatar boru hattının (`avatar-uret.py`) aynısı, iki farkla.

── 🔴 Neden kırpılıyor ─────────────────────────────────────

Üretilen kare 1024×1024 ve konu ortada, çevresinde geniş boşluk var.
Boşluk da dosyaya giriyor ve daha kötüsü, kartta konunun **ne kadar yer
kapladığını** belirsiz bırakıyor: `boy={112}` dediğimde 112 pikselin ne
kadarının gerçekten resim olduğu görsele göre değişiyordu.

Alfa sınırına kırpılınca `boy` doğrudan konunun boyu oluyor ve dört
sahne kartlarda aynı ağırlıkta duruyor.

⚠️ Kırpmaya **%3 pay** bırakılıyor: parlama sınıra kadar gidiyor ve
sıfır payla kesilince hale kenarda düz bir çizgiyle bitiyor.

── 🔴 Neden kare değil, kendi oranında ─────────────────────

Dördü de kareye doldurulsaydı geniş olan sahneler (Düşen, patlama)
küçülürdü. Her sahne kendi oranında duruyor; bileşen yüksekliği
veriyor, genişlik orandan geliyor. Script ölçüleri basıyor ve
`oyun-sahnesi.tsx` içine elle yazılıyor — `next/image` asıl ölçüyü
bilmek zorunda.
"""

import os

from PIL import Image

KOK = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
KAYNAK = os.path.join(os.path.dirname(KOK), "gelen", "oyun")
CIKTI = os.path.join(KOK, "public", "oyun")

SAHNELER = ("dusen", "blok", "yilan", "tum-oyunlar")

# Kırpma payı — halenin kenarda düz kesilmemesi için.
PAY = 0.03
# Uzun kenarın piksel boyu.
BOYLAR = (512, 256)


def uret(ad: str) -> None:
    im = Image.open(os.path.join(KAYNAK, f"{ad}.png")).convert("RGBA")

    kutu = im.getbbox()
    if kutu:
        pay_x = round((kutu[2] - kutu[0]) * PAY)
        pay_y = round((kutu[3] - kutu[1]) * PAY)
        im = im.crop(
            (
                max(0, kutu[0] - pay_x),
                max(0, kutu[1] - pay_y),
                min(im.width, kutu[2] + pay_x),
                min(im.height, kutu[3] + pay_y),
            )
        )

    os.makedirs(CIKTI, exist_ok=True)
    olcu = ""
    for uzun in BOYLAR:
        oran = uzun / max(im.size)
        boyut = (round(im.width * oran), round(im.height * oran))
        yol = os.path.join(CIKTI, f"{ad}-{uzun}.webp")
        im.resize(boyut, Image.LANCZOS).save(yol, quality=86, method=6)
        if uzun == BOYLAR[0]:
            olcu = f"{boyut[0]}x{boyut[1]}"
        print(f"  {ad}-{uzun}.webp  {boyut[0]}x{boyut[1]}  {os.path.getsize(yol) // 1024} KB")
    return olcu


if __name__ == "__main__":
    olculer = {}
    for ad in SAHNELER:
        olculer[ad] = uret(ad)
    print("\n  oyun-sahnesi.tsx icin olculer (512'lik):")
    for ad, o in olculer.items():
        print(f'    {ad}: "{o}"')
