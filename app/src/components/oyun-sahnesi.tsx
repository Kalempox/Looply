import Image from "next/image";

/**
 * Oyun kartlarının sahne görselleri — Ü176'da çizildi, Ü180'de üretildi.
 *
 * ── 🔴 Çizimden görsele neden dönüldü ───────────────────────
 *
 * Ü176'da Düşen'in sahnesi SVG olarak **çizilmişti** ve gerekçesi
 * sağlamdı: *"blok zaten geometri, karakter için render şart blok için
 * değil."* O gerekçe hâlâ doğru ama ürün sahibinin istediği şey değişti:
 * *"kullanıcıları çekmek ve daha ilgi çekici olmak için parlak
 * fütüristik bir şeyler gerekiyor."*
 *
 * Parlak fütüristik bir sahne artık yalnızca geometri değil: ışık
 * hüzmeleri, kıvılcımlar, hacimli parlama, uçuşan parçalar. Bunları SVG
 * ile taklit etmek, Ü173'te maskotta iki kez reddedilen yola girmekti.
 *
 * ── Üretim ──────────────────────────────────────────────────
 *
 * fal.ai / flux-pro, ham kareler `gelen/oyun/` (gitignore'da), işlenmiş
 * hâlleri `public/oyun/` — `scripts/oyun-sahne-uret.py`.
 *
 * ⚠️ Kesim alfayı **parlaklıktan** türetiyor (siyah zeminden fark),
 * düz eşikten değil: parlayan bir nesnenin kenarı keskin değil ve düz
 * eşik haleyi ya kesiyor ya zemini birlikte getiriyor.
 *
 * 🔴 Bu, yedi turluk bir arayışın sonucu ve dersi şu: **tahta
 * çizdirilemiyor.** Bulmaca tahtasının boş hücreleri koyu olmak zorunda,
 * kesim ise koyu olanı saydam yapıyor — tahta karta konduğunda eriyordu.
 * Blok kartı bu yüzden tahta değil **patlama** gösteriyor, katalog kartı
 * da tek sahne değil bir **küme**.
 *
 * ── Ölçüler neden burada yazılı ─────────────────────────────
 *
 * Her sahne alfa sınırına kırpıldığı için kendi oranında; kareye
 * doldurulsalardı geniş olanlar küçülürdü. `next/image` asıl ölçüyü
 * bilmek zorunda, o yüzden script'in bastığı sayılar buraya elle
 * geçiyor. Sahne değişirse script tekrar çalıştırılıp bu tablo
 * güncellenmeli.
 */
const SAHNE: Record<string, { en: number; boy: number }> = {
  dusen: { en: 270, boy: 512 },
  blok: { en: 512, boy: 512 },
  yilan: { en: 456, boy: 512 },
  "tum-oyunlar": { en: 477, boy: 512 },
};

/** Bu oyunun üretilmiş sahnesi var mı? Çağıran yoksa eski çizime düşüyor. */
export function sahneVarMi(oyunId: string): boolean {
  return oyunId in SAHNE;
}

/**
 * Bir oyunun sahnesi.
 *
 * ⚠️ `aria-hidden`: sahne bir süs, bilgiyi kartın metni taşıyor. Ekran
 * okuyucuya "patlayan bloklar" diye okunması kimseye bir şey anlatmazdı.
 *
 * @param boy ekrandaki YÜKSEKLİK; genişlik sahnenin kendi oranından
 *            geliyor, o yüzden dar sahneler (Düşen) dar kalıyor.
 */
export function OyunSahnesi({
  oyun,
  boy = 120,
  className = "",
}: {
  oyun: string;
  boy?: number;
  className?: string;
}) {
  const olcu = SAHNE[oyun];
  if (!olcu) return null;

  const en = Math.round((olcu.en / olcu.boy) * boy);

  return (
    <Image
      src={`/oyun/${oyun}-512.webp`}
      alt=""
      aria-hidden
      width={olcu.en}
      height={olcu.boy}
      className={className}
      style={{ height: boy, width: en }}
    />
  );
}
