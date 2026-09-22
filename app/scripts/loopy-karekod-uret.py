"""Basılı karekodun ortasına giren Loopy karesini üretir — Ü246.

── Neden ayrı bir dosya, neden `loopy-mutlu-512.webp` değil ──

Karekodun ortasındaki rozet, sembolün **%7'si kadar** bir ada. Oraya
konan her piksel silinmiş bir modül demek ve bütçeyi hata düzeltme
karşılıyor. Yani rozetin içindeki boşluk bedava değil: karakterin
çevresindeki şeffaf kenar payı da modül yiyor.

Yayındaki `loopy-mutlu-512.webp` 512×512'lik bir karede duruyor ve
karakter onun yalnızca 276×336'sını kaplıyor — yani kenarların %46'sı
boş. O dosya rozete konsaydı karakter, aynı hasar bedeline **yarı
boyda** görünürdü.

Bu script karakteri alfa sınırına kırpıyor: aynı bedelle iki kat
büyük Loopy.

── Kaynak neden `gelen/`ten ────────────────────────────────

`gelen/avatar/islenmis/ilmek-mutlu-1024.png` yayındaki karenin **iki
kat çözünürlüklü** hâli (`ilmek`, Ü174'te Loopy adını almadan önceki
adı). Doğrulandı: 1024'e büyütülmüş 512'lik sürümle alfası birebir
örtüşüyor, yani aynı kare — yalnızca daha keskin.

Baskı bunu gerektiriyor. 25 cm'lik bir afişte rozet 6,2 cm ve 300
dpi'da 732 piksel ister; 512'lik dosyadan kırpılan 276 piksel oraya
2,65 kat büyütülürdü. 1024'ten kırpılan 546 piksel 1,34 kat kalıyor.

⚠️ `gelen/` sürüm takibinde DEĞİL. Bu script bir kez koşup çıktısını
`public/`e bırakıyor; çıktı depoda duruyor, kaynak durmuyor. Kaynak
kaybolursa yayındaki 512'lik kareden de üretilebilir — yalnızca büyük
baskıda yumuşak kalır.

── ⚠️ Hangi kare ───────────────────────────────────────────

`mutlu`. Ürün sahibinin isteği: *"loopy karakterimiz olsun looply
logosu değil ve mutluykenki hali olsun."* `components/avatar.tsx`teki
haritada `mutlu` → kollar havada, ağız açık gülüyor.

Kullanım: `python scripts/loopy-karekod-uret.py`
"""

from pathlib import Path

from PIL import Image

KOK = Path(__file__).resolve().parent.parent
KAYNAK = KOK.parent / "gelen" / "avatar" / "islenmis" / "ilmek-mutlu-1024.png"
YEDEK = KOK / "public" / "avatar" / "loopy-mutlu-512.webp"
CIKTI = KOK / "public" / "avatar" / "loopy-mutlu-karekod.webp"


def main() -> None:
    yol = KAYNAK if KAYNAK.exists() else YEDEK
    if yol is YEDEK:
        print(f"⚠️  {KAYNAK.name} yok, yayındaki 512'lik kareye düşülüyor")

    im = Image.open(yol).convert("RGBA")
    kutu = im.split()[3].getbbox()
    if kutu is None:
        raise SystemExit("alfa boş — kaynak şeffaf değil")

    kirpik = im.crop(kutu)
    en, boy = kirpik.size

    # WebP ve KAYIPLI. Kayıpsız denendi: 242 KB çıktı ve bu dosya iki
    # yerde birden taşınıyor — sayfada `<image>` olarak, baskıya giden
    # tek parça SVG'de ise base64 gömülü. Gömülü hâlde kayıpsız sürüm
    # SVG'yi 320 KB'a çıkarıyordu.
    #
    # ⚠️ Kalite 92, varsayılan 80 değil: karakterin yüzü rozette
    # yalnızca birkaç yüz piksel ve JPEG benzeri bulanıklık orada
    # doğrudan gülümsemeyi siliyor.
    kirpik.save(CIKTI, "WEBP", quality=92, method=6)

    print(f"kaynak : {yol.name} {im.size}")
    print(f"kırpım : {kutu} -> {en}x{boy}  (oran {en / boy:.3f})")
    print(f"çıktı  : {CIKTI.relative_to(KOK)}  {CIKTI.stat().st_size // 1024} KB")
    print()
    print("Oran `components/karekod.tsx` icindeki LOOPY_ORANI ile ayni olmali.")


if __name__ == "__main__":
    main()
