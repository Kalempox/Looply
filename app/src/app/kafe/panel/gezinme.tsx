"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LooplyLogo } from "@/components/logo";
import type { IsletmeTuru } from "@/domain/cark-kosul";
import { GUNLUK, GUNLUK_GENIS, KURULUM, duraklar, type Durak } from "./duraklar";

/**
 * İşletme panelinin gezinmesi — Ü58.
 *
 * ── İki biçim, tek liste ────────────────────────────────────
 *
 * Telefonda **alt şerit**, bilgisayarda **sol kenar çubuğu**. Aynı
 * duraklar, aynı dosya: ikisi ayrı bileşen olsaydı biri güncellenir
 * diğeri unutulurdu.
 *
 * ⚠️ **Yol ve ad artık burada değil, `duraklar.ts`te.** Panelin ana ekranı
 * aynı yolları ikinci kez elle yazıyordu ve iki liste ayrışmıştı; tablo
 * ortak bir düz modüle taşındı. Bu dosyada kalan şey **sunum**: ikon,
 * yerleşim, seçili durum.
 *
 * ── Neden kenar çubuğu gerekti ──────────────────────────────
 *
 * Panel yalnızca telefondan bakılacak diye tasarlanmıştı: içerik dar bir
 * kolonda ortalanıyor, alt şerit ekranın altına yapışıyordu. Kafe sahibi
 * paneli **bilgisayardan da** açıyor ve orada ekranın üçte ikisi bomboş
 * kalıyordu — 2000 piksellik bir ekranda 900 piksellik bir sütun.
 * Referans yönetim panellerinin hepsi (Orchid, Valex, Enlite) sol
 * kenar çubuğu + tam genişlik içerik kullanıyor.
 *
 * ── Neden kenar çubuğunda daha çok durak var ────────────────
 *
 * Alt şeritte dört durak var çünkü telefonda beşinci ikon okunmuyor.
 * Kenar çubuğunda yer bol: kurulum ekranları da oraya giriyor ve kafe
 * sahibi "ürünler" için panele dönmek zorunda kalmıyor.
 *
 * ── 🔴 İşletme türüne göre farklılaşma (Ü137 → bu tur) ──────
 *
 * Ü137 butik kipini açtı: butikte **oyun yok**, çark hakkını kasiyer
 * alışverişe bakarak veriyor. Ama bu gezinme sabit bir listeydi ve
 * `isletme_turu`ya hiç bakmıyordu — yani oyunu olmayan işletme, menüsünde
 * "Oyunlar" durağı görüyor ve açtığında yönetecek bir şey bulamıyordu.
 *
 * ⚠️ **Menüden gizlemek bir denetim değil, bir nezaket.** Asıl kapı
 * `oyun-secimi.degistir` içinde: butik için oyun ayarı **reddediliyor**.
 * Burada yapılan yalnızca olmayan bir şeyi menüde göstermemek — adres
 * çubuğuna elle yazan biri sunucuda duruyor.
 */

/**
 * Yol → ikon.
 *
 * ⚠️ Tabloda değil burada: ikon bir sunum kararı ve `duraklar.ts` düz bir
 * modül olarak kalmalı (testten JSX'siz okunabilsin diye). Bir durak
 * eklenip ikonu unutulursa çizim boş kalmaz — test ikisini eşliyor.
 */
const IKONLAR: Record<string, () => React.ReactElement> = {
  "/kafe/panel": PanelIkonu,
  "/kafe/panel/oduller": OdulIkonu,
  "/kafe/panel/rapor": RaporIkonu,
  "/kafe/panel/butce": ButceIkonu,
  "/kafe/panel/cark": CarkIkonu,
  "/kafe/panel/kampanyalar": KampanyaIkonu,
  "/kafe/panel/konum": KonumIkonu,
  "/kafe/panel/urunler": UrunIkonu,
  "/kafe/panel/karekod": MasaIkonu,
  "/kafe/panel/oyunlar": OyunIkonu,
  "/kafe/panel/personel": PersonelIkonu,
  "/kafe/panel/happy-hour": SaatIkonu,
  "/kafe/panel/subeler": SubeIkonu,
};

/**
 * ⚠️ `turu` varsayılanı **kafe**: oturum okunamadığında (çerez yok, rol
 * uymuyor) menü eski hâline dönüyor. Butik menüsünü varsayılan yapmak,
 * geçici bir okuma hatasında kafenin oyun durağını kaybetmesi demekti.
 */
export function PanelGezinme({ turu = "kafe" }: { turu?: IsletmeTuru }) {
  const yol = usePathname();
  const gunluk = duraklar(GUNLUK, turu);
  const gunlukGenis = duraklar(GUNLUK_GENIS, turu);
  const kurulum = duraklar(KURULUM, turu);

  // "/kafe/panel" her alt sayfanın da öneki; yalnızca tam eşleşmede
  // seçili sayılıyor, yoksa bütün duraklar birden aydınlanırdı.
  const secili = (d: string) => (d === "/kafe/panel" ? yol === d : yol.startsWith(d));

  return (
    <>
      {/* ── Telefon: alt şerit ─────────────────────────── */}
      <nav
        aria-label="İşletme paneli"
        className="fixed inset-x-0 bottom-0 z-20 border-t border-cizgi bg-yuzey/95 backdrop-blur lg:hidden"
      >
        <ul className="mx-auto flex w-full max-w-4xl">
          {gunluk.map((d) => {
            const Ikon = IKONLAR[d.yol];
            return (
              <li key={d.yol} className="flex-1">
                <Link
                  href={d.yol}
                  aria-current={secili(d.yol) ? "page" : undefined}
                  className={`flex flex-col items-center gap-1 py-2.5 transition-colors ${
                    secili(d.yol) ? "text-vurgu" : "text-yazi-sonuk hover:text-yazi"
                  }`}
                >
                  <Ikon />
                  <span className="etiket-caps text-[10px]">{d.ad}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* ── Bilgisayar: sol kenar çubuğu ────────────────── */}
      <aside
        aria-label="İşletme paneli"
        className="fixed inset-y-0 left-0 z-20 hidden w-60 flex-col border-r border-cizgi bg-yuzey lg:flex"
      >
        {/*
          Marka işareti — düz yazı değil (Ü123). Panelin köşesinde
          "Looply" düz metinken vitrindeki logoyla aynı ürün gibi
          durmuyordu; işaret tek bir dosyadan geliyor.

          İşaret aynı zamanda **ana panele dönüş**: her yönetim panelinde
          köşedeki logo o işi görür ve kullanıcı onu denemeden önce
          düşünmez. Denediğinde hiçbir şey olmazsa da ürün eksik gelir.
        */}
        <Link
          href="/kafe/panel"
          aria-label="İşletme paneline dön"
          className="block border-b border-cizgi px-5 py-5 transition-colors hover:bg-cukur"
        >
          <LooplyLogo boyut={19} hediye={false} />
          <span className="etiket-caps mt-2 block text-[10px] text-yazi-sonuk">
            İşletme paneli
          </span>
        </Link>

        <div className="flex-1 overflow-y-auto px-3 py-4">
          <Grup baslik="Günlük" duraklar={gunlukGenis} secili={secili} />
          <div className="mt-5">
            <Grup baslik="Kurulum" duraklar={kurulum} secili={secili} />
          </div>
        </div>

        <div className="border-t border-cizgi px-5 py-4">
          {/* ⚠️ `<Link>` DEĞİL: Next, Link hedeflerini üretimde önceden
              getiriyor ve `/cikis` bir GET route'u — paneli açmak oturumu
              kapatıyordu. Çıkış zaten tam sayfa bir geçiş. */}
          <a href="/cikis" className="text-[13px] text-yazi-sonuk underline hover:text-yazi">
            Çıkış yap
          </a>
        </div>
      </aside>
    </>
  );
}

function Grup({
  baslik,
  duraklar,
  secili,
}: {
  baslik: string;
  duraklar: readonly Durak[];
  secili: (yol: string) => boolean;
}) {
  return (
    <div>
      <div className="etiket-caps px-2 pb-2 text-[9px] text-yazi-sonuk">{baslik}</div>
      <ul className="space-y-0.5">
        {duraklar.map((d) => {
          const Ikon = IKONLAR[d.yol];
          const aktif = secili(d.yol);
          return (
            <li key={d.yol}>
              <Link
                href={d.yol}
                aria-current={aktif ? "page" : undefined}
                className={`flex items-center gap-3 rounded-lg px-2.5 py-2 text-[14px] font-semibold transition-colors ${
                  aktif ? "bg-vurgu/10 text-vurgu" : "text-yazi-sonuk hover:bg-cukur hover:text-yazi"
                }`}
              >
                <Ikon />
                {d.ad}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/* ── İkonlar ──────────────────────────────────────────────────
 *
 * Satır içi SVG: emoji kullanılmıyor (işletme tarafının kuralı) ve dış
 * kaynak da yok — ikon için ağ isteği yapmak gereksiz.
 * `currentColor` sayesinde seçili rengi bağlantıdan miras alıyorlar.
 */

const ORTAK = {
  width: 20,
  height: 20,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.7,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
} as const;

function PanelIkonu() {
  return (
    <svg {...ORTAK}>
      <rect x="3" y="3" width="7" height="9" rx="1.5" />
      <rect x="14" y="3" width="7" height="5" rx="1.5" />
      <rect x="14" y="12" width="7" height="9" rx="1.5" />
      <rect x="3" y="16" width="7" height="5" rx="1.5" />
    </svg>
  );
}

function OdulIkonu() {
  return (
    <svg {...ORTAK}>
      <path d="M4 9h16v11a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V9Z" />
      <path d="M3 5.5h18V9H3z" />
      <path d="M12 5.5V21" />
      <path d="M12 5.5S10.5 3 8.75 3a2 2 0 1 0 0 4H12Zm0 0S13.5 3 15.25 3a2 2 0 1 1 0 4H12Z" />
    </svg>
  );
}

function RaporIkonu() {
  return (
    <svg {...ORTAK}>
      <path d="M3 21h18" />
      <rect x="5" y="12" width="4" height="7" rx="1" />
      <rect x="10" y="7" width="4" height="12" rx="1" />
      <rect x="15" y="14" width="4" height="5" rx="1" />
    </svg>
  );
}

function ButceIkonu() {
  return (
    <svg {...ORTAK}>
      <rect x="2.5" y="6" width="19" height="13" rx="2" />
      <path d="M2.5 10.5h19" />
      <circle cx="17" cy="15" r="1.3" />
    </svg>
  );
}

function UrunIkonu() {
  return (
    <svg {...ORTAK}>
      <path d="M4 8h12v7a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4V8Z" />
      <path d="M16 10h2.5a2.5 2.5 0 0 1 0 5H16" />
      <path d="M7 4.5v1.5M11 3.5v2.5" />
    </svg>
  );
}

function MasaIkonu() {
  return (
    <svg {...ORTAK}>
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <path d="M14 14h3v3h-3zM18 18h3v3h-3z" />
    </svg>
  );
}

/** Ü109: oyun yönetimi — kumanda kolu. */
function OyunIkonu() {
  return (
    <svg {...ORTAK}>
      <rect x="2" y="7" width="20" height="11" rx="4" />
      <path d="M7 11v3M5.5 12.5h3M15.5 11.5h.01M18 13.5h.01" />
    </svg>
  );
}

function PersonelIkonu() {
  return (
    <svg {...ORTAK}>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M2.8 20a6.2 6.2 0 0 1 12.4 0" />
      <path d="M16 5.4a3.2 3.2 0 0 1 0 5.2M17.5 20a6.2 6.2 0 0 0-2.3-4.8" />
    </svg>
  );
}

function SaatIkonu() {
  return (
    <svg {...ORTAK}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7.5V12l3 2" />
    </svg>
  );
}

/**
 * Kampanya — yüzde işareti.
 *
 * Ödül ikonu bir hediye kutusu; bu bir yüzde. İki durak yan yana duruyor
 * ve menüye bakışta hangisinin hangisi olduğu ikondan anlaşılmalı —
 * kampanyanın tek tipi zaten yüzde indirimi.
 */
function KampanyaIkonu() {
  return (
    <svg {...ORTAK}>
      <path d="M18.5 5.5 5.5 18.5" />
      <circle cx="8" cy="8" r="2.4" />
      <circle cx="16" cy="16" r="2.4" />
    </svg>
  );
}

/** Konum — harita iğnesi. */
function KonumIkonu() {
  return (
    <svg {...ORTAK}>
      <path d="M12 21s7-5.5 7-11a7 7 0 1 0-14 0c0 5.5 7 11 7 11Z" />
      <circle cx="12" cy="10" r="2.6" />
    </svg>
  );
}

/** Şube — iki bina yan yana. */
function SubeIkonu() {
  return (
    <svg {...ORTAK}>
      <path d="M3 21V8.5L8.5 5 14 8.5V21" />
      <path d="M14 12.5 19.5 9.5 21 10.5V21" />
      <path d="M2 21h20M7 13h3.5M7 17h3.5" />
    </svg>
  );
}

/** Çark — dilimli bir daire ve üstünde gösterge. */
function CarkIkonu() {
  return (
    <svg {...ORTAK}>
      <circle cx="12" cy="13" r="8" />
      <path d="M12 5v16M4 13h16M6.3 7.3l11.4 11.4M17.7 7.3 6.3 18.7" />
      <circle cx="12" cy="13" r="2.2" fill="currentColor" stroke="none" />
    </svg>
  );
}
