import Link from "next/link";
import { RENK, type OyuncuRengi } from "./oyuncu-renk";
import { DESEN, Sahne } from "./oyuncu-sahne";
import { type KuponGorseli } from "./oyuncu-gorsel";

/**
 * Kupon bileti — Ü72.
 *
 * ── Nasıl buraya gelindi ────────────────────────────────────
 *
 * Ü69-71 arasında bilet dört stil denemesinden geçti ve açık zeminli
 * ışın stilinde karar kılınmıştı. Ürün sahibi bir tur sonra kendi
 * tasarımını gösterdi ve karar değişti: **koyu doygun zemin, kartın
 * tamamına döşenmiş desen, sağ kenardan taşan büyük çizim.**
 *
 * Öncekinden farkı zenginlik. Açık zeminli kart doğruydu ama boştu:
 * bir renk, bir kontur çizim, bir çizgi. Şimdi üç katman var — zemin,
 * desen, sahne — ve kart bakılacak bir şeye dönüşüyor.
 *
 * ── Üç kategori, üç sahne (ürün sahibinin kuralı) ───────────
 *
 * *"Filtre kahve de çay da sıcak içecek; ikisinde de kenardaki görsel
 * aynı olmalı, yoksa her kafede farklı sıcak içecekler olduğundan
 * buraya sürekli görsel üretmek zorunda kalırız."*
 *
 * Kural bakım maliyetini sıfırlıyor: kafe menüsüne ne eklerse eklesin
 * `gorselSec()` onu sıcak içecek / tatlı / para üçlüsünden birine
 * düşürüyor ve yeni çizim gerekmiyor.
 *
 * ── Işın gitti ──────────────────────────────────────────────
 *
 * Ü70'te ışın dokusu "kartların ana ekrandaki durum kartıyla
 * akrabalığını kuran tek detay" diye korunmuştu. Desen o işi daha iyi
 * yapıyor ve ikisi birlikte gürültü oluyordu; ışın bilette bırakıldı.
 * Diğer kartlar (fırsat, oyun, başlık) hâlâ ışın dokusunda — orada
 * anlatacak bir desen yok.
 *
 * ── Değişmeyen ──────────────────────────────────────────────
 *
 * TL değeri yok (E9), geçerlilik damgası yok. Bilet ne kadar "değerli"
 * görünürse görünsün kasada okutulmadan hiçbir şey ifade etmiyor.
 */

export type BiletVerisi = {
  href: string;
  kafe: string;
  baslik: string;
  gorsel: KuponGorseli;
  renk: OyuncuRengi;
  /** "8 Eyl" — biletin son kullanım günü. */
  son: string;
};

export function Bilet({ veri }: { veri: BiletVerisi }) {
  const r = RENK[veri.renk];

  return (
    <Link
      href={veri.href}
      className="kart-golge kart-gel parilti relative block h-[124px] overflow-hidden rounded-2xl transition-transform active:scale-[0.99]"
      style={{
        // Koyu ve doygun: `koyu` tondan `ana` tona. Beyaz metin bu iki
        // durağın hepsinde AA geçiyor; pastel zeminde geçmiyordu ve
        // metni koyu yapmak gerekiyordu.
        background: `linear-gradient(115deg, ${r.koyu} 0%, ${r.ana} 100%)`,
      }}
    >
      {/* Desen kartın tamamına döşeniyor. */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{ backgroundImage: DESEN[veri.gorsel], backgroundRepeat: "repeat" }}
      />

      {/*
        Sahne sağ kenardan taşıyor ve kırpılıyor.

        Tam sığdırılsaydı "kartın içine bir resim koyduk" gibi
        okunurdu; taşan çizim kartı bir nesne hâline getiriyor.
      */}
      <span
        aria-hidden
        className="pointer-events-none absolute top-1/2 -right-4 -translate-y-1/2"
      >
        <Sahne ad={veri.gorsel} boy={126} />
      </span>

      {/*
        Sahnenin metne değdiği yerde zemin koyulaşıyor.

        Çizim kartın rengine yakın tonlarda ve metnin sağ ucu onun
        üstüne düşüyordu. Soldan sağa açılan bu perde metni tamamen
        okunur bırakıyor, çizimi ise kapatmıyor.
      */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background: `linear-gradient(100deg, ${r.koyu} 26%, ${r.koyu}cc 44%, transparent 64%)`,
        }}
      />

      {/* Toka: biletin takıldığı yer. Kartı çantaya asılan bir etikete
          çeviriyor — koçandan farklı olarak bir yön de veriyor. */}
      <span aria-hidden className="absolute top-1/2 left-2.5 -translate-y-1/2">
        <Toka renk={r.canli} />
      </span>

      {/*
        Metin kolonu sağdan **96 piksel** dar.

        İlk denemede tam genişlikteydi ve "son 8 Eyl" tarihi çizimin
        altında kalıyordu; perde metni okunur tutuyor ama üstüne binen
        bir çizim perdeyle çözülmüyor. Kesikli çizginin de çizimden
        önce bitmesi ürün sahibinin tasarımındaki hâli.
      */}
      <div className="relative flex h-full flex-col justify-center pr-24 pl-12">
        {/*
          Tarih **üst satırda**, kafe adının yanında.

          Alt satırda `justify-between` ile sağa yaslıydı ve çizimin
          altında kalıyordu; metin kolonunu daraltmak da yetmedi çünkü
          fincanın kulpu sola doğru uzuyor. Üst satırda hem yer var hem
          de alt satır ürün sahibinin tasarımındaki gibi tek bir eyleme
          kalıyor.
        */}
        <span className="block etiket-caps text-white/55">
          {veri.kafe} <span className="text-white/35">· son {veri.son}</span>
        </span>
        <span className="mt-1 block font-display text-xl leading-tight font-bold text-white">
          {veri.baslik}
        </span>

        {/* Kesikli çizgi: biletin koparma yeri. */}
        <span className="mt-2.5 block border-t border-dashed border-white/30 pt-2">
          <span className="etiket-caps" style={{ color: r.canli }}>
            Kasada göster →
          </span>
        </span>
      </div>
    </Link>
  );
}

/**
 * Sol kenardaki toka.
 *
 * Zımba çentiğinin yerini aldı. Çentik biletin **koparıldığını**
 * söylüyordu; oysa bu kupon koparılmıyor, kasada okutuluyor. Toka
 * "taşınan bir etiket" diyor ve kartın soluna doğal bir başlangıç
 * veriyor.
 */
function Toka({ renk }: { renk: string }) {
  return (
    <svg width="22" height="42" viewBox="0 0 22 42" fill="none" aria-hidden>
      <path
        d="M11 8v10"
        stroke={renk}
        strokeWidth="4"
        strokeLinecap="round"
      />
      <circle cx="11" cy="6" r="5" stroke={renk} strokeWidth="3.4" fill="none" />
      <rect x="3" y="17" width="16" height="20" rx="6" stroke={renk} strokeWidth="3.4" fill="none" />
      <circle cx="11" cy="27" r="3" fill={renk} />
    </svg>
  );
}
