"""Oyun kartlarının küçük ikonlarını keser — Ü187.

Girdi `gelen/ikon/<oyun>.png` (gitignore'da), çıktı
`public/oyun/ikon-<oyun>-256.webp`.

── 🔴 Neden üretildi, neden çizilmedi ──────────────────────

Ü147'den beri ikonlar elle çizilmiş SVG'ydi (`components/oyuncu-ikon.tsx`)
ve Ü183'te kartlar neon sahnelere geçince aynı kartın üstünde iki ayrı
malzeme kaldı: parlak, hacimli bir sahne ve yanında düz vektör bir simge.
Ürün sahibi *"küçük logoları da değiştirmeliyiz"* dedi.

⚠️ `yilan`ın ikonu zaten YOKTU. `OYUN_IKONU` haritasında yalnızca blok,
kelime ve düşen vardı; yılan jeneriğe düşüyordu — yeşil kartın beyaz
kutusundaki o anlamsız yeşil nokta oydu.

── 🔴 Üç turda oturdu ve ders siluette ────────────────────

  1. Yılan iki elmayla ve kalın bir "C" borusuyla geldi. Gövde ayrı
     küplerden oluşmuyordu; 36 pikselde lapa oluyordu.
  2. Küpler ayrıldı, elma teke indi — ama siluet DÜŞEN'İN L'SİYLE
     aynı oldu. İkisi yan yana "renk değiştirmiş aynı ikon" demek.
  3. ✅ Merdiven + büyük yüz + büyük elma. Ayırt eden şey biçim değil
     KARAKTER: kafanın gözleri ve kırmızı elma 36 pikselde bile
     okunuyor.

Ders: aynı malzemeden üç ikon üretilirken ayrı görünmelerini sağlayan şey
renk değil siluet; iki tanesi aynı tetromino biçimine düşerse renk onları
kurtarmıyor.

── Kesim ───────────────────────────────────────────────────

Alfa sınırına kırpılıyor, sonra KAREYE tamamlanıyor. Kare şart: ikon
beyaz yuvarlak bir kutunun içinde duruyor ve kutuya kare olmayan bir
görsel konsa en-boy oranı bozulur.

Tek boy (256) üretiliyor: ikon üründe en fazla 36 pikselde çiziliyor,
`next/image` küçüğünü zaten bundan türetiyor.
"""

import os

import numpy as np
from PIL import Image

KOK = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
GELEN = os.path.join(os.path.dirname(KOK), "gelen", "ikon")
KLASOR = os.path.join(KOK, "public", "oyun")

# Kaynak dosya adları: üretim turları `gelen/`de duruyor, seçilen tur burada.
KARELER = {"dusen": "dusen.png", "blok": "blok.png", "yilan": "yilan-3.png"}

BOY = 256
# Kenar payı — kare kutunun içinde nefes alsın diye.
PAY = 0.06
# Bu alfanın altı "yok" sayılıyor; üretim kenarlarda çok soluk piksel bırakıyor.
ESIK = 8


def isle(oyun: str, dosya: str) -> None:
    im = Image.open(os.path.join(GELEN, dosya)).convert("RGBA")
    al = np.asarray(im)[:, :, 3]
    ys, xs = np.nonzero(al > ESIK)
    kutu = im.crop((int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1))

    # Kareye tamamla: uzun kenar ölçü, kısa kenar ortalanıyor.
    kenar = max(kutu.size)
    pay = int(kenar * PAY)
    tuval = Image.new("RGBA", (kenar + 2 * pay, kenar + 2 * pay), (0, 0, 0, 0))
    tuval.alpha_composite(
        kutu,
        (pay + (kenar - kutu.width) // 2, pay + (kenar - kutu.height) // 2),
    )

    yol = os.path.join(KLASOR, f"ikon-{oyun}-{BOY}.webp")
    tuval.resize((BOY, BOY), Image.LANCZOS).save(yol, quality=90, method=6)
    kb = os.path.getsize(yol) // 1024
    print(f"  ikon-{oyun}  {kutu.width}x{kutu.height} -> {BOY}x{BOY}  {kb} KB")


if __name__ == "__main__":
    for oyun, dosya in KARELER.items():
        isle(oyun, dosya)
