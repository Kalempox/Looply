import { redirect } from "next/navigation";
import * as oturum from "@/domain/session";
import * as masaOturumu from "@/domain/masa";
import * as oyunSecimi from "@/domain/oyun-secimi";
import { K2 } from "@/domain/masa";
import { type HerhangiOyun } from "@/oyunlar";
import { OyuncuSayfa, SayfaBasi } from "@/components/oyuncu";
import { OyunKaruseli } from "./karusel";

export const dynamic = "force-dynamic";
export const metadata = { title: "Oyunlar · Looply" };

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
  // Ü109: katalog kafenin açık oyunlarını gösteriyor.
  const acik = await oyunSecimi.acikOyunlar(masa?.cafeId ?? null);
  const bugun = await oyunSecimi.gununOyunuKafede(masa?.cafeId ?? null);

  // Kategoriye girmemiş oyun ekrandan düşmemeli: yeni bir oyun
  // eklendiğinde katalog listesi güncellenmezse oyun kaybolurdu.
  const yerlesik = new Set(KATEGORILER.flatMap((k) => k.oyunlar));
  const digerleri = acik.filter((oy) => !yerlesik.has(oy.id));

  /** Karuselin sırası: kategoriler sırayla, sonra kategorisizler. */
  const karusellListesi = [
    ...KATEGORILER.flatMap((kat) =>
      kat.oyunlar
        .map((id) => acik.find((oy) => oy.id === id))
        .filter((oy): oy is HerhangiOyun => !!oy)
        .map((oy) => ({ oy, kategori: kat.ad })),
    ),
    ...digerleri.map((oy) => ({ oy, kategori: "Diğer" })),
  ].map(({ oy, kategori }) => ({
    id: oy.id,
    ad: oy.ad,
    ozet: oy.ozet,
    kategori,
    bugunMu: oy.id === bugun.id,
  }));

  return (
    <OyuncuSayfa aktif="/oyna" geri={{ href: "/oyna", etiket: "Ana ekran" }} yuva={false}>
      {/*
        ⚠️ `koyu` yalnızca BU ekranda — Ü182. Karusel kartları Ü181'de
        koyuya geçti ve pastel başlık onların üstünde yabancı kaldı;
        aynı ekranda iki ayrı kart dili konuşuluyordu.
      */}
      {/* Ü187: `gorsel="kumanda"` yerine üretilmiş `tum-oyunlar` sahnesi —
          altındaki karusel neon, başlık silik bir harita desenindeydi. */}
      <SayfaBasi ust="Katalog" baslik="Oyunlar" renk="gok" sahne="tum-oyunlar" koyu>
        <p className="text-[13px] leading-relaxed text-white/75">
          {kazandirir
            ? "Hepsi puan ve XP kazandırıyor. Bugünün oyunu iki katı veriyor."
            : "Konumun doğrulanmadan oynayabilirsin ama puan ve XP yazılmaz."}
        </p>
      </SayfaBasi>

      {/*
        Ü143: katalog karusele geçti.

        ⚠️ Sıra **kategorilere göre** kuruluyor, `acik` listesinin kendi
        sırasına göre değil: karusel tek bir halka ama oyuncunun soldan
        sağa göreceği düzen hâlâ "önce düşünerek, sonra yetişerek".
        Kategori başlıkları kalktı, kategori adı kartın üstünde duruyor.

        ⚠️ Kategoriye girmemiş oyun **sona** ekleniyor, düşmüyor: yeni
        bir oyun eklenip `KATEGORILER` güncellenmezse oyun katalogdan
        sessizce kaybolurdu (aynı koruma liste sürümünde de vardı).
      */}
      <OyunKaruseli oyunlar={karusellListesi} />
    </OyuncuSayfa>
  );
}
