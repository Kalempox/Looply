"""Loopy'nin karelerini renklendirilebilir üç katmana böler — Ü186.

Girdi `public/avatar/loopy-<kare>-512.webp`, çıktı aynı klasöre
`loopy-<kare>-<katman>-512.webp`.

── 🔴 Neden katman, neden hazır renk değil ─────────────────

Palet 66 gövde + 15 şerit. Hepsini hazır üretmek 5 kare × 81 = 405
dosya ve ~6 MB demekti. Üç katman toplamı ise kare başına ~15 KB —
bugünkü TEK karenin bile altında.

Renk tarayıcıda veriliyor: gri katmanın üstüne renk, çarpma kipinde.
Matematiği şu bağıntı:

    rgb(h, s, v) = v · rgb(h, s, 1)

Sabit ton ve doygunlukta RGB parlaklıkla doğrusal değişiyor; "her
pikseli kendi parlaklığıyla çarp" demek tam olarak `multiply`. Gölgeler
bu yüzden korunuyor.

── Üç katman ───────────────────────────────────────────────

    sabit  kapak, kol, bacak, yüz — kendi renginde, hiç dokunulmuyor
    govde  bardağın gövdesi, PARLAKLIK olarak
    serit  çapraz şerit, PARLAKLIK olarak

⚠️ Üç maske **ayrık**: her piksel tam bir katmana ait. Kesişselerdi
üst üste binen yerde renk iki kez çarpılır, koyu bir leke kalırdı.

── 🔴 Şerit hangi piksel: iki kural çöktü, üçüncüsü tuttu ──

"Doygun ve kırmızı baskın" maskesine şeritten başka şeyler de giriyor:
burun her karede, `keyifli`de tutulan KALP, `kuponlu`da ALTIN ÖDÜL.

  1. "en büyük bağlı parçayı al" → kalp 20985, altın 16480 piksel;
     ikisi de şeritten (~2900) büyük, ikisi de kazanıyordu.
  2. "gövdeye en çok değeni al" → kalp göğse dayalı, gövdeyle uzun bir
     sınırı var. Yine kalp kazandı. Üstelik kalp şeride DEĞİYOR, yani
     tek bir bileşen hâlinde birleşiyorlar; bağlantıyla ayrılamıyorlar.
  3. **TON** ✅ — ölçüldü ve üçü net ayrılıyor:

        şerit  0,061   (239/116/44)
        kalp   0,034   (231/129/103)
        altın  0,111   (203/151/51)

Piksel bazında dar bir ton penceresi kalbi ve altını baştan dışarıda
bırakıyor. Geriye burun kalıyor; o da küçük olduğu için bileşen boyutu
ile eleniyor.

⚠️ Doygunluk ORANLA ölçülüyor (`(mx−mn)/mx`), farkla değil: gölgedeki
şerit koyu ama hâlâ doygun, mutlak fark ise orada düşük çıkıyor ve
şeridin gölgeli yarısı maskeden düşüyordu.

── 🔴 Gövde de ayıklanıyor: buhar ve madalyonun yıldızı ────

"Açık ve az doygun" kuralı bardağın gövdesini veriyor ama yanında iki
şeyi daha topluyor: `keyifli`de kapaktan çıkan BUHAR, `kuponlu`da altın
madalyonun BEYAZ YILDIZI. İkisi de açık ve nötr. Renklendirilseydi
oyuncunun seçtiği renk buharı ve yıldızı da boyardı — ilk denemede tam
olarak bu oldu.

Boyut yetmedi: `keyifli`de gövde kalp ve kollarla parçalanıyor ve buhar
parçaları gövde parçalarıyla aynı boyutta (2879 · 1714 · 1129 · gövde
3473). Konum ele verdi — buhar y 97-192, gövde y 227-304 — ama sabit bir
sınır kareden kareye kayardı.

Kural: **en büyük parça, artı şeride değen her parça.** Şerit bardağın
üstünde; gövdenin bölünmüş parçaları ona değiyor, buhar ve yıldız
değmiyor.

⚠️ Son adım küçük delikleri dolduruyor. `kuponlu` karesi görsel
referanstan üretildiği için dokusu daha gürültülü; gövdede tek tük
piksel doygunluk eşiğini geçip maskeden düşüyor ve renklendirilince
benekli bir yüzey kalıyordu. Yalnızca **120 pikselden küçük** ve
tamamen gövdeyle çevrili boşluklar dolduruluyor — gözler (~500+) ve
ağız bu sınırın çok üstünde, onlara dokunulmuyor.
"""

import os
from collections import deque

import numpy as np
from PIL import Image

KOK = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
KLASOR = os.path.join(KOK, "public", "avatar")

# ⚠️ `kacan` YOK ve olamaz: o 100 karelik tek bir animasyon dosyası,
# gövdeyle şerit iç içe. Orada Loopy varsayılan renginde kalıyor.
KARELER = ("sakin", "neseli", "mutlu", "keyifli", "kuponlu")

# ⚠️ TEK boy ve bilerek. Yanındaki eski tam kareler 512 ve 256 olarak
# duruyor ama 256'yı hiçbir zaman kimse yüklemedi: `next/image` küçük
# boyları zaten 512'den türetiyor, maske de ham dosyayı istiyor ve o da
# 512. İkinci boy `public/` içinde kimsenin okumadığı bir dosya olurdu.
BOY = 512

# Maske eşikleri — hepsi ölçülerek bulundu (bkz. başlıktaki tablo).
SERIT_TON_ALT, SERIT_TON_UST = 0.045, 0.072
SERIT_DOYGUNLUK_ORANI = 0.50
SERIT_PARLAKLIK = 110
# Burnu eleyen sınır: `sakin`de burun 183 piksel, şerit 2892.
EN_KUCUK_PARCA = 400
# Gövde parçalarında gürültüyü eleyen sınır.
EN_KUCUK_GOVDE = 300
# Doldurulacak en büyük delik. Göz ve ağız bunun çok üstünde.
EN_BUYUK_DELIK = 120

GOVDE_DOYGUNLUK = 85
GOVDE_PARLAKLIK = 150
SEFFAFLIK = 60


def kucukleri_at(m: np.ndarray) -> np.ndarray:
    """
    Küçük bağlı bileşenleri siler — pratikte burun.

    ⚠️ "En büyüğü tut" DEĞİL: şerit, önündeki kol tarafından ikiye
    bölünebiliyor ve o zaman iki parçanın ikisi de gerçek. Eşiğin
    altındakiler atılıyor, üstündekilerin hepsi kalıyor.
    """
    out = np.zeros_like(m)
    for p in parcalar(m, EN_KUCUK_PARCA):
        for cy, cx in p:
            out[cy, cx] = True
    return out


def parcalar(m: np.ndarray, en_az: int) -> list[list[tuple[int, int]]]:
    """Maskeyi bağlı bileşenlere ayırır, küçükleri atar."""
    y, x = m.shape
    gorulen = np.zeros_like(m)
    cikti = []
    for by in range(y):
        for bx in range(x):
            if not m[by, bx] or gorulen[by, bx]:
                continue
            kuyruk = deque([(by, bx)])
            gorulen[by, bx] = True
            p = []
            while kuyruk:
                cy, cx = kuyruk.popleft()
                p.append((cy, cx))
                for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    ny, nx = cy + dy, cx + dx
                    if 0 <= ny < y and 0 <= nx < x and m[ny, nx] and not gorulen[ny, nx]:
                        gorulen[ny, nx] = True
                        kuyruk.append((ny, nx))
            if len(p) >= en_az:
                cikti.append(p)
    return cikti


def govde_ayikla(m: np.ndarray, serit: np.ndarray) -> np.ndarray:
    """En büyük parça + şeride değen parçalar — bkz. başlıktaki not."""
    y, x = m.shape
    ps = parcalar(m, EN_KUCUK_GOVDE)
    if not ps:
        return m

    en_buyuk = max(range(len(ps)), key=lambda i: len(ps[i]))
    out = np.zeros_like(m)
    for i, p in enumerate(ps):
        degiyor = i == en_buyuk or any(
            0 <= cy + dy < y and 0 <= cx + dx < x and serit[cy + dy, cx + dx]
            for cy, cx in p
            for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1))
        )
        if degiyor:
            for cy, cx in p:
                out[cy, cx] = True

    # Küçük delikleri doldur — beneklenmeyi bitiren adım.
    for delik in parcalar(~out, 1):
        if len(delik) > EN_BUYUK_DELIK:
            continue
        if any(cy in (0, y - 1) or cx in (0, x - 1) for cy, cx in delik):
            continue  # dışarıya açılan boşluk, delik değil
        for cy, cx in delik:
            out[cy, cx] = True
    return out


def isle(kare: str) -> None:
    kaynak = os.path.join(KLASOR, f"loopy-{kare}-512.webp")
    a = np.asarray(Image.open(kaynak).convert("RGBA")).astype(np.float32)
    rgb, al = a[:, :, :3], a[:, :, 3]
    mx = rgb.max(axis=2)
    doygunluk = mx - rgb.min(axis=2)

    # Ton: kırmızı baskın piksellerde (mx == R) yeşil ile mavinin farkı.
    with np.errstate(divide="ignore", invalid="ignore"):
        ton = np.where(doygunluk > 0, (rgb[:, :, 1] - rgb[:, :, 2]) / np.maximum(doygunluk, 1) / 6, 0)
        doy_orani = np.where(mx > 0, doygunluk / np.maximum(mx, 1), 0)

    ham_serit = (
        (al > SEFFAFLIK)
        & (rgb[:, :, 0] >= mx - 1)
        & (mx > SERIT_PARLAKLIK)
        & (doy_orani > SERIT_DOYGUNLUK_ORANI)
        & (ton >= SERIT_TON_ALT)
        & (ton <= SERIT_TON_UST)
    )
    # ⚠️ Şerit maskeden AÇIKÇA düşülüyor. Gövde eşiği 55'ten 85'e
    # çıkarıldı (kuponlu karesinin gürültülü dokusunda şeridin
    # kenarında pürüzlü bir bant kalıyordu) ve bu eşikte şeridin
    # gölgeli pikselleri de gövdeye giriyor. Çıkarılmasaydı aynı piksel
    # iki katmanda birden çizilir, renk iki kez çarpılırdı.
    ham_govde = (
        (al > SEFFAFLIK) & (doygunluk <= GOVDE_DOYGUNLUK) & (mx > GOVDE_PARLAKLIK)
    )
    serit = kucukleri_at(ham_serit)
    govde = govde_ayikla(ham_govde & ~serit, serit)
    sabit = (al > 0) & ~govde & ~serit

    # Parlaklık katmanı: gri değer = pikselin kendi parlaklığı.
    gri = np.dstack([mx, mx, mx])

    for ad, maske, gri_mi in (
        ("sabit", sabit, False),
        ("govde", govde, True),
        ("serit", serit, True),
    ):
        im = Image.fromarray(
            np.dstack([gri if gri_mi else rgb, np.where(maske, al, 0)]).astype(np.uint8)
        )
        yol = os.path.join(KLASOR, f"loopy-{kare}-{ad}-{BOY}.webp")
        im.resize((BOY, BOY), Image.LANCZOS).save(yol, quality=88, method=6)
        kb = os.path.getsize(yol) // 1024
        print(f"  loopy-{kare}-{ad}  {int(maske.sum()):6d} piksel  {kb:3d} KB")


if __name__ == "__main__":
    for kare in KARELER:
        isle(kare)
