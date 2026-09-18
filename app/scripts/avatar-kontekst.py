"""fal/kontext'ten gelen Loopy karelerini işler — Ü181.

Bugün tek kare: `kuponlu` — elinde ödül tutarak havaya sıçrayan Loopy.

── 🔴 Kare nasıl üretildi ──────────────────────────────────

Metinden DEĞİL, karakterin kendisinden: fal'ın görsel referanslı ucu
(flux-pro/kontext) `ilmek-sakin-1024.png`i alıp yalnızca pozu ve elindeki
nesneyi değiştirdi. Sıfırdan üretmek başka bir karakter çizerdi ve bu
projede o yol üç kez kapandı (Ü173).

Bu, Ü179'daki `neseli` + üstüne çizilmiş vektör kupon çözümünün yerine
geçiyor. O çözüm ürün sahibinin *"orada hiç olmadı"* dediği şeydi ve
haklıydı: 3B bir gövdenin eline yapıştırılmış düz bir kart, iki ayrı
malzeme olarak okunuyordu. Şimdi ödül karakterle aynı render'dan.

── 🔴 Neden genel eşik değil, taşma dolgusu ────────────────

Zemin beyaz ama **gövde de krem**: "beyaza yakın her pikseli sil"
deseydik karakterin yarısı giderdi. Ölçüldü — gövde ortalama (240, 230,
210), beyazdan uzaklığı ~45; yere düşen yumuşak gölge ise beyazdan ~12.

Dolgu köşelerden başlıyor ve yalnızca **kenara bağlı** beyazı siliyor.
Gölge de zemine bağlı olduğu için onunla birlikte gidiyor — ⚠️ ve
gitmesi gerekiyor: gölge karenin içinde kalsaydı zıplarken karakterle
havaya çıkardı (Ü173'ün aynı kuralı).
"""

import os
from collections import deque

from PIL import Image

KOK = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
GELEN = os.path.join(os.path.dirname(KOK), "gelen", "avatar")

# Hangi ham kare hangi isimle üretiliyor.
#
# ⚠️ `kacan-1`/`kacan-2` BURADAN ÇIKTI (Ü183). İki duruş karesini CSS'te
# değiştirip koşu yapmayı denemiştim; ürün sahibi *"sen CSS ile berbat
# yapıyorsun"* dedi ve haklıydı — iki kare bir koşu döngüsüne yetmiyor.
# Yerine ürün sahibinin yeşil ekran videosu geçti:
# `scripts/loopy-kacan-uret.py`.
KARELER = ("kuponlu",)
CIKTI = os.path.join(KOK, "public", "avatar")

# Beyazdan bu uzaklığa kadar olan her şey zemin sayılıyor.
# Gölge ~12, gövde ~45 → 28 ikisini ayırıyor.
TOLERANS = 28
BOYLAR = (512, 256)


def zemini_sil(im: Image.Image) -> Image.Image:
    px = im.load()
    g, y = im.size
    gorulen = bytearray(g * y)
    kuyruk = deque()

    def zemin_mi(x: int, b: int) -> bool:
        r, ye, m, _ = px[x, b]
        return (255 - r) + (255 - ye) + (255 - m) <= TOLERANS * 3

    for x in range(g):
        for b in (0, y - 1):
            if not gorulen[b * g + x] and zemin_mi(x, b):
                gorulen[b * g + x] = 1
                kuyruk.append((x, b))
    for b in range(y):
        for x in (0, g - 1):
            if not gorulen[b * g + x] and zemin_mi(x, b):
                gorulen[b * g + x] = 1
                kuyruk.append((x, b))

    while kuyruk:
        x, b = kuyruk.popleft()
        px[x, b] = (255, 255, 255, 0)
        for dx, db in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nx, nb = x + dx, b + db
            if 0 <= nx < g and 0 <= nb < y and not gorulen[nb * g + nx] and zemin_mi(nx, nb):
                gorulen[nb * g + nx] = 1
                kuyruk.append((nx, nb))

    return im


def yalniz_govde(im: Image.Image) -> Image.Image:
    """
    Gövdeye bağlı olmayan her şeyi siler.

    🔴 Taşma dolgusu tek başına yetmedi: yere düşen gölgenin **en koyu
    ortası** toleransın dışında kalıyor ve dolgu ona çarpınca duruyor.
    Sonuç, ayakların altında havada asılı duran gri bir leke — karta
    konduğunda kir gibi okunuyor.

    Burada en opak pikselden (kesinlikle gövde) başlayıp saydam olmayan
    komşular üzerinden yayılıyoruz; ulaşılamayan ne varsa siliniyor.
    Gölge gövdeye değmiyor, o yüzden gidiyor.
    """
    px = im.load()
    g, y = im.size

    en_iyi, tohum = -1, None
    for b in range(0, y, 4):
        for x in range(0, g, 4):
            a = px[x, b][3]
            if a > en_iyi:
                en_iyi, tohum = a, (x, b)
    if tohum is None:
        return im

    gorulen = bytearray(g * y)
    kuyruk = deque([tohum])
    gorulen[tohum[1] * g + tohum[0]] = 1
    while kuyruk:
        x, b = kuyruk.popleft()
        for dx, db in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nx, nb = x + dx, b + db
            if 0 <= nx < g and 0 <= nb < y and not gorulen[nb * g + nx] and px[nx, nb][3] > 8:
                gorulen[nb * g + nx] = 1
                kuyruk.append((nx, nb))

    for b in range(y):
        sat = b * g
        for x in range(g):
            if px[x, b][3] and not gorulen[sat + x]:
                px[x, b] = (255, 255, 255, 0)
    return im


def golge_artigini_sil(im: Image.Image) -> Image.Image:
    """
    Alt banttaki yer gölgesi artığını siler.

    🔴 Üçüncü geçiş ve gerekiyor: taşma dolgusu gölgenin en koyu
    ortasında duruyor, `yalniz_govde` de o artık ayağa **değdiği için**
    onu gövdenin parçası sayıp koruyor. Sonuç, ayakların altında beyaz
    bir sürtme izi.

    Ayrım ölçülerek bulundu: artık NÖTR ve PARLAK (RGB ~222/217/214,
    doygunluk 12), gövde kremi ise doygun (doygunluk 82). Koyu bacaklar
    da parlaklık eşiğinin altında kalıyor.

    ⚠️ Kural yalnızca alt %20'de çalışıyor. Gövdenin üstünde de nötr ve
    parlak pikseller var — gözlerin beyaz parıltıları. Bant sınırı
    olmasaydı gözler delinirdi.
    """
    px = im.load()
    g, y = im.size
    bant = int(y * 0.80)

    for b in range(bant, y):
        for x in range(g):
            r, ye, m, a = px[x, b]
            if a <= 40:
                continue
            doygunluk = max(r, ye, m) - min(r, ye, m)
            parlaklik = (r + ye + m) / 3
            if doygunluk < 25 and parlaklik > 170:
                px[x, b] = (255, 255, 255, 0)
    return im


def isle(ad: str) -> None:
    im = Image.open(os.path.join(GELEN, f"{ad}.png")).convert("RGBA")
    im = zemini_sil(im)
    im = yalniz_govde(im)
    im = golge_artigini_sil(im)

    kutu = im.getbbox()
    if kutu:
        im = im.crop(kutu)

    # Kare tuvale ortala: `Avatar` kareyi bekliyor (genişlik = boy).
    kenar = max(im.size)
    tuval = Image.new("RGBA", (kenar, kenar), (0, 0, 0, 0))
    tuval.paste(im, ((kenar - im.width) // 2, (kenar - im.height) // 2))

    os.makedirs(CIKTI, exist_ok=True)
    for b in BOYLAR:
        yol = os.path.join(CIKTI, f"loopy-{ad}-{b}.webp")
        tuval.resize((b, b), Image.LANCZOS).save(yol, quality=88, method=6)
        print(f"  loopy-{ad}-{b}.webp  {os.path.getsize(yol) // 1024} KB")


if __name__ == "__main__":
    for ad in KARELER:
        isle(ad)
