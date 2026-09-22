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
 *
 * ── 🔴 `olcek`: dar çizim aynı boyda daha az yer kaplıyor ───
 *
 * Ü187'de ürün sahibi *"Düşen ve Yılan'ın kartlarındaki oyun görselimiz
 * daha büyük olmalı"* dedi ve tek bir `boy` değeri onu veremiyor.
 * Sebebi ölçülebilir: dört sahnenin oranları çok farklı. Aynı yükseklikte
 * kartta kapladıkları GENİŞLİK —
 *
 *     boy 290'da:   düşen 153   yılan 258   blok 290
 *
 * Düşen'in kulesi dikey çizildi; yükseklik eşitlenince o, Yılan'ın
 * yarısı kadar yer kaplıyor ve kartın sol yarısı boş kalıyor. Ürün
 * sahibinin şikâyet ettiği boşluk tam olarak bu.
 *
 * `olcek` dar sahneye fazladan yükseklik veriyor; çağıran tek bir taban
 * boy geçiyor ve dördü de kartı benzer oranda dolduruyor. Sayı gözle
 * seçildi: 290 tabanda düşen 325'te oturuyor, 350'de bloklar sıkışıp
 * üst sıra tırtıklanıyor.
 */
const SAHNE: Record<string, { en: number; boy: number; olcek?: number }> = {
  dusen: { en: 270, boy: 512, olcek: 1.12 },
  blok: { en: 512, boy: 512 },
  yilan: { en: 456, boy: 512 },
  "tum-oyunlar": { en: 477, boy: 512 },
  ayir: { en: 433, boy: 512 },
  /*
    Ü265 · beş sahne daha. Hepsi ürün sahibinin gönderdiği kart
    referanslarından **kesildi**: illüstrasyon bandı kırpıldı, kartın
    kendi koyu zemini yumuşak eşikle saydama çevrildi (glow korunsun
    diye sert maske değil).

    ⚠️ Köşedeki uygulama ikonu kırpmanın dışında bırakıldı. Bir turda
    silinerek denendi ve **iz bıraktı**: silinen dikdörtgen tam saydam
    oluyor, çevresinde ise zeminin kalıntısı duruyor ve aradaki fark
    kartta dikdörtgen bir yama gibi görünüyordu.

    ⚠️ Bıçak ve Tuğla Kırıcı'nın referansında illüstrasyonun içine
    "BÖLÜM 1 / SKOR 0" yazıları gömülüydü; kırpma onların altından
    başlıyor.
  */
  sekme: { en: 423, boy: 512 },
  ikibin: { en: 425, boy: 512 },
  bagla: { en: 523, boy: 512 },
  bicak: { en: 554, boy: 512 },
  kirici: { en: 626, boy: 512 },
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
 * @param boy TABAN yükseklik. Sahnenin kendi `olcek`i bunu çarpıyor ve
 *            genişlik oranından geliyor — yani çağıran "bu kartta
 *            sahneler şu kadar yer kaplasın" diyor, hangi sahnenin ne
 *            kadar uzaması gerektiğini bilmek zorunda kalmıyor.
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

  const gercekBoy = Math.round(boy * (olcu.olcek ?? 1));
  const en = Math.round((olcu.en / olcu.boy) * gercekBoy);

  return (
    <Image
      src={`/oyun/${oyun}-512.webp`}
      alt=""
      aria-hidden
      width={olcu.en}
      height={olcu.boy}
      className={className}
      style={{ height: gercekBoy, width: en }}
    />
  );
}
