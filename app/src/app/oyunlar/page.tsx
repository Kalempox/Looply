import Link from "next/link";
import { redirect } from "next/navigation";
import * as oturum from "@/domain/session";
import * as masaOturumu from "@/domain/masa";
import { K2 } from "@/domain/masa";
import { OYUNLAR, gununOyunu, type HerhangiOyun } from "@/oyunlar";
import { isGunu } from "@/lib/tarih";
import {
  OyuncuSayfa,
  SayfaBasi,
  OyuncuBolum,
  KartDokusu,
  kartStili,
} from "@/components/oyuncu";
import { RENK, oyunRengi } from "@/components/oyuncu-renk";
import { oyunGorseli } from "@/components/oyuncu-gorsel";
import { OyunIkonu } from "@/components/oyuncu-ikon";

export const dynamic = "force-dynamic";
export const metadata = { title: "Oyunlar · CafePlay" };

/**
 * Oyun kataloğu — Ü66.
 *
 * ── Neden ayrı sayfa ────────────────────────────────────────
 *
 * Ürün sahibi: *"Blok vb. oyunlarımızın bulunduğu alan farklı bir
 * sayfa olmalı ve orada kategori kategori ayrılmalı."* Ana ekranın
 * altında iki küçük karo olarak duruyorlardı ve orada kalmaları
 * ürünün asıl içeriğini dipnota çeviriyordu.
 *
 * Ana ekranda yalnızca **bugünün oyunu** kaldı: kafede on beş dakikası
 * olan oyuncunun kararı "hangi oyunu oynasam" değil, "oynayayım mı".
 * Seçmek isteyen buraya geliyor.
 *
 * ── Kategoriler ─────────────────────────────────────────────
 *
 * Üç oyuna üç kategori yapılmadı; o, kategori değil etiket olurdu.
 * İki kategori var ve ayrım oyuncunun hissettiği şey: **düşünerek**
 * mi oynuyorsun yoksa **yetişerek** mi.
 *
 * ── Alt şeritte dördüncü durak yok ──────────────────────────
 *
 * Şerit üç durakta kalıyor (bkz. `oyuncu-nav.tsx`). Bu sayfa "Oyna"
 * durağının altında bir iç sayfa ve üstteki geri düğmesiyle ana
 * ekrana dönüyor.
 */

type Kategori = {
  ad: string;
  ozet: string;
  oyunlar: string[];
};

const KATEGORILER: Kategori[] = [
  {
    ad: "Düşünerek",
    ozet: "Acele yok, doğru hamle var",
    oyunlar: ["blok", "kelime"],
  },
  {
    ad: "Yetişerek",
    ozet: "Hızlanıyor, sen yavaşlayamıyorsun",
    oyunlar: ["dusen"],
  },
];

export default async function OyunlarSayfasi() {
  const o = await oturum.oku();
  if (!o || o.rol !== "oyuncu") redirect("/giris");

  const masa = await masaOturumu.aktif(o.ozneId);
  const kazandirir = !!masa && (masa.kanitMaskesi & K2) !== 0;
  const bugun = gununOyunu(isGunu());

  // Kategoriye girmemiş oyun ekrandan düşmemeli: yeni bir oyun
  // eklendiğinde katalog listesi güncellenmezse oyun kaybolurdu.
  const yerlesik = new Set(KATEGORILER.flatMap((k) => k.oyunlar));
  const digerleri = OYUNLAR.filter((oy) => !yerlesik.has(oy.id));

  return (
    <OyuncuSayfa aktif="/oyna" geri={{ href: "/oyna", etiket: "Ana ekran" }}>
      <SayfaBasi ust="Katalog" baslik="Oyunlar" renk="gok" gorsel="kumanda">
        <p className="text-[13px] leading-relaxed text-yazi-sonuk">
          {kazandirir
            ? "Hepsi puan ve XP kazandırıyor. Bugünün oyunu iki katı veriyor."
            : "Konumun doğrulanmadan oynayabilirsin ama puan ve XP yazılmaz."}
        </p>
      </SayfaBasi>

      {KATEGORILER.map((kat) => {
        const liste = kat.oyunlar
          .map((id) => OYUNLAR.find((oy) => oy.id === id))
          .filter((oy): oy is HerhangiOyun => !!oy);
        if (liste.length === 0) return null;

        return (
          <OyuncuBolum key={kat.ad} baslik={kat.ad} not={kat.ozet}>
            <ul className="flex flex-col gap-3">
              {liste.map((oy) => (
                <li key={oy.id}>
                  <OyunKarti oyun={oy} bugunMu={oy.id === bugun.id} />
                </li>
              ))}
            </ul>
          </OyuncuBolum>
        );
      })}

      {digerleri.length > 0 && (
        <OyuncuBolum baslik="Diğer">
          <ul className="flex flex-col gap-3">
            {digerleri.map((oy) => (
              <li key={oy.id}>
                <OyunKarti oyun={oy} bugunMu={oy.id === bugun.id} />
              </li>
            ))}
          </ul>
        </OyuncuBolum>
      )}
    </OyuncuSayfa>
  );
}

/**
 * Katalogdaki tek oyun.
 *
 * Arkada oyunun kendi çizimi soluk duruyor (Ü66) — kart artık bir
 * satır değil, oyunun kapağı. Bugünün oyunu altın bir pulla
 * işaretleniyor; ayrı bir kart olarak yukarı çıkarılmıyor çünkü o
 * zaman aynı oyun ekranda iki kez görünürdü.
 */
function OyunKarti({ oyun, bugunMu }: { oyun: HerhangiOyun; bugunMu: boolean }) {
  const r = RENK[oyunRengi(oyun.id)];

  return (
    <Link
      href={`/oyna/${oyun.id}`}
      className="kart-golge kart-gel relative block overflow-hidden rounded-3xl px-5 py-5 transition-transform hover:-translate-y-0.5"
      style={kartStili(oyunRengi(oyun.id))}
    >
      <KartDokusu renk={oyunRengi(oyun.id)} gorsel={oyunGorseli(oyun.id)} />

      <div className="relative flex items-start gap-4">
        <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-yuzey shadow-sm">
          <OyunIkonu oyunId={oyun.id} boy={32} />
        </span>

        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-2">
            <span className="font-display text-xl leading-tight font-bold">{oyun.ad}</span>
            {bugunMu && (
              <span className="rounded-full border border-odul bg-yuzey px-2 py-0.5 etiket-caps text-[10px] text-odul-koyu">
                Bugünün oyunu · ×2
              </span>
            )}
          </span>
          <span className="mt-1 block text-[13px] leading-relaxed" style={{ color: r.koyu }}>
            {oyun.ozet}
          </span>
          <span className="mt-2.5 inline-flex items-center gap-1.5 etiket-caps" style={{ color: r.koyu }}>
            Oyna →
          </span>
        </span>
      </div>
    </Link>
  );
}
