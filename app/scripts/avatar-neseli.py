"""Loopy'nin `neseli` karesini üretir — Ü179.

── 🔴 Neden türetilmiş bir kare ────────────────────────────

Ürün sahibi Ödüllerim başlığında *"elinde kupon tutan"* ve *"mutlu"*
bir Loopy istedi. Elde olan üç karenin üçü de birini dışlıyordu:

    sakin    eller boş   ✅     ağız DÜZ BİR ÇİZGİ   🔴
    mutlu    yüz gülüyor ✅     kollar havada yumruk 🔴
    keyifli  yüz gülüyor ✅     eller dolu (kalp)    🔴

`keyifli`nin kalbini bir kuponla örtmek denendi ve **ölçüm reddetti**:
kalbin kutusu 512'lik karede dikeyde %53,3–81,1, ağız ise %46,9–48,0.
Kalbi örten her kart gülümsemeyi de örtüyor.

Kalan tek yol `sakin`in ağzını değiştirmek ve bu göründüğü kadar
cüretkâr değil: bu üslupta **yüz zaten düz çizilmiş işaretlerden**
oluşuyor. Gözler beyaz parıltılı siyah ovaller, ağız yuvarlak köşeli
koyu bir çubuk. Çubuğu bir yaya çevirmek, 3B bir gövdeyi yeniden
modellemek değil — aynı düzlemde aynı işareti başka türlü çizmek.

⚠️ Bu **geçici** bir çözüm. Doğrusu aynı 3B kaynaktan gülen ve elinde
ödül tutan bir kare; istemi `gelen/avatar/BURAYA-BIRAK.md` içinde
yazılı. O kare gelince bu script silinir.

── Ölçüler nereden ────────────────────────────────────────

Hiçbiri gözle seçilmedi, hepsi taranarak bulundu:

    ağız çubuğu   x 235–257 · y 240–245 · renk (57, 47, 44)

Silme, çubuğun üstündeki (y=237) ve altındaki (y=249) krem arasında
**sütun sütun ara değer** alıyor. Tek bir düz krem dolgu, bardağın
dikey gradyanını bozar ve yamanın kenarı görünürdü.

Gülümseme 4× büyütülmüş bir katmanda çiziliyor ve küçültülerek
bindiriliyor: PIL'in `arc`ı kenar yumuşatmıyor, merdiven bırakıyor.
"""

import os
from PIL import Image, ImageDraw

KOK = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CIKTI = os.path.join(KOK, "public", "avatar")

# Taranarak bulunan ağız çubuğu ve rengi.
AGIZ_RENGI = (57, 47, 44, 255)
SILME_UST, SILME_ALT = 237, 249
SILME_SOL, SILME_SAG = 230, 264

# Gülümseme: uçları yukarıda, ortası aşağıda bir parabol.
YAY_SOL, YAY_SAG = 232, 262
YAY_TEPE, YAY_DERINLIK = 238.0, 9.0
YAY_KALINLIK = 3.1

BUYUTME = 4


def duz_agzi_sil(im: Image.Image) -> None:
    """Çubuğu, üstündeki ve altındaki krem arasında ara değerle kapatır."""
    px = im.load()
    for x in range(SILME_SOL, SILME_SAG):
        ust = px[x, SILME_UST]
        alt = px[x, SILME_ALT]
        for y in range(SILME_UST + 1, SILME_ALT):
            t = (y - SILME_UST) / (SILME_ALT - SILME_UST)
            px[x, y] = tuple(round(ust[i] * (1 - t) + alt[i] * t) for i in range(4))


def gulumseme_ciz(im: Image.Image) -> Image.Image:
    """Parabol boyunca daireler — uçları yuvarlak, ortası hafif kalın."""
    k = BUYUTME
    kat = Image.new("RGBA", (im.width * k, im.height * k), (0, 0, 0, 0))
    d = ImageDraw.Draw(kat)

    for i in range(400):
        t = i / 399
        # 4t(1−t) t=0,5'te 1, uçlarda 0: ortası en aşağıda.
        egri = 4 * t * (1 - t)
        x = YAY_SOL + (YAY_SAG - YAY_SOL) * t
        y = YAY_TEPE + YAY_DERINLIK * egri
        r = YAY_KALINLIK * (0.72 + 0.28 * egri)
        d.ellipse([(x - r) * k, (y - r) * k, (x + r) * k, (y + r) * k], fill=AGIZ_RENGI)

    return Image.alpha_composite(im, kat.resize(im.size, Image.LANCZOS))


def main() -> None:
    kaynak = os.path.join(CIKTI, "loopy-sakin-512.webp")
    im = Image.open(kaynak).convert("RGBA")

    duz_agzi_sil(im)
    im = gulumseme_ciz(im)

    for b in (512, 256):
        yol = os.path.join(CIKTI, f"loopy-neseli-{b}.webp")
        im.resize((b, b), Image.LANCZOS).save(yol, quality=88, method=6)
        print(f"  loopy-neseli-{b}.webp  {os.path.getsize(yol) // 1024} KB")


if __name__ == "__main__":
    main()
