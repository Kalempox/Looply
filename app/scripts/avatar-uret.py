"""Yeni maskotun karelerini kaynaktan tek geçişte üretir — Ü173.

Kaynak: `gelen/avatar/`  ·  Çıktı: `app/public/avatar/`

── Üç tur sürdü, gerekçeleri burada ─────────────────────────

1. İlk geçiş her kareyi kendi içeriğine göre kırptı. Ölçüler tutmadı:
   bardak gövdesi `sakin`de 133, `keyifli`de 74 piksel çıktı. Ekranda
   bu "karakter sevinince küçülüyor" diye görünürdü — süslemeler
   (uçuşan kalpler, kıvılcım çizgileri) çerçeveyi geriyor, bardak da
   onunla küçülüyor.

2. İkinci geçiş bardağa göre ölçekledi ama tuvali sabit bıraktı ve bu
   kez KIRPTI: `keyifli`nin bacakları tuvalden taştı. Dinamik poz,
   aynı bardak ölçeğinde sakin duruştan daha geniş yer kaplıyor.

3. Bu geçiş ikisini birden çözüyor: bardak ölçeği eşitleniyor VE
   tuval en geniş kareye göre seçiliyor. Karakter tuvalde biraz küçük
   duruyor — bedeli o, karşılığında hiçbir kare kırpılmıyor ve hiçbiri
   ötekinden büyük görünmüyor.

⚠️ Kaynaktan TEK geçiş: her turda `1024.png`leri yeniden ölçeklemek
üst üste yeniden örnekleme demekti ve kenarlar yumuşuyordu.

── Süslemeler neden atılıyor ────────────────────────────────

Havada duran kalpler ve kıvılcım çizgileri siliniyor. İki sebep:
ölçek (onları korumak bardağı yarı boyda bırakıyor) ve tekrar —
kıvılcımları CSS zaten çiziyor (`ilmek-kivilcimlar`), görselde de
olsaydı ekranda iki kat kıvılcım olurdu.

⚠️ Karakterin TUTTUĞU kalp kalıyor: gövdeye değiyor, yani aynı
bağlantılı bileşenin parçası. Atılan yalnızca havada duranlar.
"""

import os
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage

GELEN = r"C:\Users\abbus\OneDrive\Desktop\cafemasa\gelen\avatar"
CIKTI = r"C:\Users\abbus\OneDrive\Desktop\cafemasa\app\public\avatar"
ONIZLEME = r"C:\tmp\kare"

# (kaynak anahtarı, çıktı adı, elle ölçek düzeltmesi)
#
# 🔴 Ölçek ELLE ayarlanıyor ve bu bir yenilgi değil, doğru araç.
#
# İki otomatik ölçü denendi ve ikisi de başka bir sebeple yanıldı:
#
#   · gövde YÜKSEKLİĞİ  → dönme yanılttı. Eğik bardağın dikey uzanımı
#     kısa çıkıyor, ölçü telafi için büyütüyor.
#   · gövde ALANI       → örtülme yanılttı. `keyifli`de bardağın bir
#     kısmını kalp ve kollar kapatıyor, görünen alan gerçeğinden küçük.
#
# Her ölçü bir sonraki karışıklığa takıldı ve ikisi de "eşit" diyordu
# — sayı doğru, ölçtüğü şey yanlıştı. Dört el yapımı kare için gözle
# ayarlamak hem daha hızlı hem daha dürüst: doğrulaması da gözle.
KAYNAKLAR = [
    ("looply ana karakter", "sakin", 1.00),
    ("sinirli", "sinirli", 1.00),
    ("mutlu", "mutlu", 1.10),
    ("sevgi", "keyifli", 0.72),
]

# Tuvalin kaç piksel olacağı ve bardağın tuvalde kaplayacağı oran.
BOY = 1024
GOVDE_ORANI = 0.34  # √(gövde alanı) tuval boyunun %34'ü


def kaynak_bul(anahtar: str) -> str:
    for f in sorted(os.listdir(GELEN)):
        if f.lower().endswith((".png", ".jpg", ".jpeg")) and anahtar.lower() in f.lower():
            return os.path.join(GELEN, f)
    raise FileNotFoundError(anahtar)


def beyazi_ayikla(im: Image.Image, esik: int = 26) -> Image.Image:
    """Köşelerden taşma dolgusu — genel eşik DEĞİL.

    Bardağın gövdesi krem, buhar da neredeyse beyaz. "Beyaza yakın her
    pikseli sil" deseydik buharı ve gövdedeki parlamaları da silerdik.
    Taşma dolgusu yalnızca kenardan bağlantılı olanı siliyor.
    """
    im = im.convert("RGB")
    g, y = im.size
    calisma = im.copy()
    for nokta in [(0, 0), (g - 1, 0), (0, y - 1), (g - 1, y - 1)]:
        ImageDraw.floodfill(calisma, nokta, (255, 0, 255), thresh=esik)
    a = np.array(calisma)
    maske = ~((a[..., 0] == 255) & (a[..., 1] == 0) & (a[..., 2] == 255))
    sonuc = np.dstack([np.array(im), (maske * 255).astype(np.uint8)])
    return Image.fromarray(sonuc)


def karakteri_ayir(im: Image.Image) -> Image.Image:
    a = np.array(im.getchannel("A")) > 40
    etiket, adet = ndimage.label(a)
    if adet <= 1:
        return im
    boyut = ndimage.sum(a, etiket, range(1, adet + 1))
    maske = (etiket == int(np.argmax(boyut)) + 1).astype(np.uint8) * 255
    yeni = np.array(im)
    yeni[..., 3] = np.minimum(yeni[..., 3], maske)
    return Image.fromarray(yeni)


def govde_olcu(im: Image.Image):
    """Bardak gövdesinin ALANI ve ağırlık merkezi — hizalamanın çapası.

    🔴 Yükseklik DEĞİL, alan. Yükseklikle denendi ve yanılttı: eğik bir
    bardağın dikey uzanımı gerçek boyundan kısa çıkıyor, ölçü onu
    telafi etmek için büyütüyor ve `keyifli` karesi ötekilerden gözle
    görülür biçimde şişiyordu — üstelik sayı "280 = 280" diyordu.

    Alan dönmeden etkilenmiyor; karekökü doğrudan ölçek veriyor.

    Buhar da kreme yakın ama AYRI bir bileşen; en büyüğü almak onu eliyor.
    """
    a = np.array(im)
    r, g, b, al = (a[..., i].astype(int) for i in range(4))
    krem = (al > 200) & (r > 195) & (g > 180) & (b > 150) & ((r - b) < 70) & ((r - b) > 8)
    etiket, adet = ndimage.label(krem)
    if adet == 0:
        return None
    boyut = ndimage.sum(krem, etiket, range(1, adet + 1))
    m = etiket == int(np.argmax(boyut)) + 1
    ys, xs = np.where(m)
    return float(m.sum()) ** 0.5, float(xs.mean()), float(ys.mean())


def main() -> None:
    os.makedirs(CIKTI, exist_ok=True)
    hazir = []

    for anahtar, ad, elle in KAYNAKLAR:
        yol = kaynak_bul(anahtar)
        im = Image.open(yol)
        alfaliMi = im.mode in ("RGBA", "LA") and im.convert("RGBA").getchannel("A").getextrema()[0] < 255
        im = im.convert("RGBA") if alfaliMi else beyazi_ayikla(im)
        im = karakteri_ayir(im)

        gk = govde_olcu(im)
        if gk is None:
            print(f"  ! {ad}: bardak gövdesi bulunamadı"); continue
        govdeOlcu, merkezX, merkezY = gk

        oran = (BOY * GOVDE_ORANI) / govdeOlcu * elle
        yeni = im.resize((round(im.width * oran), round(im.height * oran)), Image.LANCZOS)
        hazir.append((ad, yeni, merkezX * oran, merkezY * oran, os.path.basename(yol), alfaliMi))

    # Tuval: bardak merkezi ortada olacak şekilde her kareye gereken yarıçap
    gerekli = 0
    for _, im, mx, my, _, _ in hazir:
        gerekli = max(gerekli, mx, im.width - mx, my, im.height - my)
    print(f"tuval: {BOY}px · gereken yarıçap {gerekli:.0f}px (yarısı {BOY/2})")
    if gerekli > BOY / 2:
        # %3 pay: sıfır olsaydı karakter tuvale yapışırdı ve CSS'teki
        # ezilme/uzama animasyonu kenardan taşardı.
        kucult = (BOY / 2 * 0.97) / gerekli
        print(f"  → hepsi ×{kucult:.3f} küçültülüyor ki hiçbiri kırpılmasın")
    else:
        kucult = 1.0

    print("\nkare       kaynak                        gövde   dosya")
    for ad, im, mx, my, kaynak, alfaliMi in hazir:
        if kucult != 1.0:
            im = im.resize((max(1, round(im.width * kucult)), max(1, round(im.height * kucult))), Image.LANCZOS)
            mx, my = mx * kucult, my * kucult

        tuval = Image.new("RGBA", (BOY, BOY), (0, 0, 0, 0))
        tuval.alpha_composite(im, (round(BOY / 2 - mx), round(BOY / 2 - my)))

        tuval.save(os.path.join(CIKTI, f"ilmek-{ad}-1024.png"), optimize=True)
        for b in (512, 256):
            tuval.resize((b, b), Image.LANCZOS).save(
                os.path.join(CIKTI, f"ilmek-{ad}-{b}.webp"), quality=88, method=6
            )

        gk = govde_olcu(tuval)
        kb = os.path.getsize(os.path.join(CIKTI, f"ilmek-{ad}-512.webp")) // 1024
        kirpik = tuval.getbbox()
        tasti = kirpik[0] <= 0 or kirpik[1] <= 0 or kirpik[2] >= BOY or kirpik[3] >= BOY
        print(f"  {ad:9} {kaynak[:28]:30} {gk[0]:6.1f}   {kb:3} KB{'  ⚠️ TAŞTI' if tasti else ''}")

    # Önizleme şeritleri
    kucukler = [
        (ad, Image.open(os.path.join(CIKTI, f"ilmek-{ad}-256.webp")).convert("RGBA"))
        for ad, *_ in hazir
    ]
    for zemin, dosya in [((24, 24, 32), "koyu"), ((250, 250, 252), "acik")]:
        serit = Image.new("RGBA", (256 * len(kucukler), 256), zemin + (255,))
        for i, (_, k) in enumerate(kucukler):
            serit.alpha_composite(k, (256 * i, 0))
        serit.convert("RGB").save(os.path.join(ONIZLEME, f"avatar-serit-{dosya}.png"))
    print(f"\nönizleme: {ONIZLEME}")


if __name__ == "__main__":
    main()
