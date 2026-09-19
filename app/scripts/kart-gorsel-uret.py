"""Kart illüstrasyonlarını keser — Ü189.

Girdi `gelen/kart/p-<ad>.png` (gitignore'da), çıktı
`public/kart/<ad>-512.webp`.

── 🔴 Neden üretildi ───────────────────────────────────────

Ürün sahibi referans gönderdi: her kartın sağında, kartın konusunu
anlatan büyük bir 3B illüstrasyon. *"Ödül kartlarında Loopy ödül türüne
göre kahve içiyor, tatlı yiyor, indirimlerde ödül açıyor; çarkta çarkı
çeviriyor; streakte ateşler içinde."*

⚠️ Loopy METİNDEN üretilmedi. *"Bizim Loopy'miz aynı kalacak"* dedi ve
tek yolu var: elde olan kareyi **referans olarak yükleyip** ondan
türetmek (`forge_reference` → `reference_upload` → `editOf`). Metinden
istenirse her seferinde başka bir karakter çıkıyor.

🔴 `editOf` yerel dosya yolu KABUL ETMİYOR, yüklenmiş bir assetId
istiyor. İlk denemede yol verildi ve dört kez `upstream_error` döndü;
"uç bozuk" diye teşhis kondu ve yanlıştı.

── 🔴 "Hamurumsu" turu: negatif liste unutulunca ───────────

İlk parti geldi ve ürün sahibi *"hepsi çok hamurumsu, daha parlak shiny
ve dikkat çekici olmalı"* dedi. Sebep prompt'taydı: "glossy 3D look"
yazılmıştı ama NEGATİF LİSTE yoktu.

Bu tam olarak oyun sahnelerinin ilk turunda yaşanan hata
(`oyun-sahne-uret.py`de yazılı): `clay`, `matte clay`, `plasticine`,
`pastel`, `toy` yazılmadan model kendi alışkanlığına dönüyor. Liste
geri konunca — artı `dough`, `doughy`, `chalky`, `flat lighting` —
yüzeyler cam gibi oldu.

⚠️ İkinci turda iki kayma kaldı ve ürün sahibi bilerek kabul etti:
çarkın dilim renkleri bizim pastel tablomuzdan biraz uzaklaştı, ateş
karesinde Loopy'nin kolları siyahtan kahverengiye döndü.

── Kesim ───────────────────────────────────────────────────

Alfa sınırına kırpılıp KAREYE tamamlanıyor. Kare şart: kartta sabit bir
kutuya oturuyorlar ve kare olmayan bir görsel oranını bozar.

⚠️ Parıltı ve ışık halesi kırpmaya DAHİL: onlar karakterin değil ama
kompozisyonun parçası. Dışarıda bırakmak parlamayı kesip geri
hamurumsu bir siluet bırakırdı.
"""

import os

import numpy as np
from PIL import Image

KOK = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
GELEN = os.path.join(os.path.dirname(KOK), "gelen", "kart")
KLASOR = os.path.join(KOK, "public", "kart")

KARELER = {
    "cark": "p-cark.png",
    "ates": "p-ates.png",
    "tatli": "p-tatli.png",
    "kahve": "p-kahve.png",
    "sicak": "p-sicak.png",
    "yiyecek": "p-yiyecek.png",
    "hediye": "p-hediye.png",
}

BOY = 512
PAY = 0.03
# Bu alfanın altı "yok" sayılıyor. Düşük tutuldu: parıltıların dış
# kenarı çok soluk ve daha yüksek bir eşik halenin ucunu kesiyor.
ESIK = 6


def isle(ad: str, dosya: str) -> None:
    im = Image.open(os.path.join(GELEN, dosya)).convert("RGBA")
    al = np.asarray(im)[:, :, 3]
    ys, xs = np.nonzero(al > ESIK)
    kutu = im.crop((int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1))

    kenar = max(kutu.size)
    pay = int(kenar * PAY)
    tuval = Image.new("RGBA", (kenar + 2 * pay, kenar + 2 * pay), (0, 0, 0, 0))
    tuval.alpha_composite(
        kutu, (pay + (kenar - kutu.width) // 2, pay + (kenar - kutu.height) // 2)
    )

    yol = os.path.join(KLASOR, f"{ad}-{BOY}.webp")
    tuval.resize((BOY, BOY), Image.LANCZOS).save(yol, quality=86, method=6)
    kb = os.path.getsize(yol) // 1024
    print(f"  {ad:7s} {kutu.width}x{kutu.height} -> {BOY}x{BOY}  {kb} KB")


if __name__ == "__main__":
    os.makedirs(KLASOR, exist_ok=True)
    for ad, dosya in KARELER.items():
        isle(ad, dosya)
