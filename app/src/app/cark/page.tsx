import Link from "next/link";
import { redirect } from "next/navigation";
import * as oturum from "@/domain/session";
import * as masaOturumu from "@/domain/masa";
import * as cark from "@/domain/cark";
import { Sayfa, Baslik, MasaKunyesi } from "@/components/ui";
import { OyuncuNav, NavBosluk } from "@/components/oyuncu-nav";
import { GunlukCark } from "./cark-kabuk";

export const dynamic = "force-dynamic";
export const metadata = { title: "Şans çarkı · CafePlay" };

/**
 * Günlük şans çarkı (Ü49).
 *
 * ── Neden kafede ────────────────────────────────────────────
 *
 * Çark ödül dağıtıyor ve ödül kafenin bütçesinden çıkıyor. Kafe dışında
 * çevrilebilseydi, hiç gelmeyen biri her gün ödül biriktirirdi — Ü3'ün
 * kapattığı kapı budur.
 *
 * ── Neden ayrı sayfa ────────────────────────────────────────
 *
 * Ana ekrandaki kart yalnızca "çark hazır" diyor. Çarkın kendisi ekranı
 * dolduran bir şey; `/oyna` zaten puan, kupon, seviye, liderlik ve oyun
 * listesini taşıyor ve altıncı bir büyük blok orayı okunmaz yapardı.
 */
export default async function CarkSayfasi() {
  const o = await oturum.oku();
  if (!o || o.rol !== "oyuncu") redirect("/giris");

  const masa = await masaOturumu.aktif(o.ozneId);
  if (!masa) {
    return (
      <Sayfa>
        <Baslik ust="Şans çarkı">Çark kafede döner</Baslik>
        <p className="text-[15px] leading-relaxed text-yazi-sonuk">
          Çarkı çevirmek için bir CafePlay kafesinde olman ve masadaki karekodu okutman
          gerekiyor. Ödül o kafenin bütçesinden çıkıyor.
        </p>
        <Link href="/oyna" className="mt-6 inline-block text-[15px] font-semibold underline">
          Ana ekrana dön
        </Link>
        <NavBosluk />
        <OyuncuNav aktif="/oyna" />
      </Sayfa>
    );
  }

  const durum = await cark.durum({ playerId: o.ozneId, cafeId: masa.cafeId });
  const dilimler = durum.acik || durum.sebep === "sure" ? durum.dilimler : [];

  return (
    <Sayfa>
      <MasaKunyesi kafe={masa.cafeAdi} masa={masa.masaAdi ?? "—"} />

      <Baslik ust="Şans çarkı">Günde bir kez</Baslik>

      {dilimler.length === 0 ? (
        <p className="text-[15px] leading-relaxed text-yazi-sonuk">
          {cark.durumMetni(durum)}
        </p>
      ) : (
        <GunlukCark
          dilimler={dilimler.map((d) => ({ baslik: d.baslik }))}
          acik={durum.acik}
          kapaliMetin={cark.durumMetni(durum)}
        />
      )}

      <p className="mt-8 font-data text-[10px] leading-relaxed tracking-wide text-yazi-sonuk">
        Çıkan ödül {masa.cafeAdi} tarafından karşılanır ve kasada gösterilir. Çarkın sonucu
        sunucuda belirlenir.
      </p>

      <NavBosluk />
      <OyuncuNav aktif="/oyna" />
    </Sayfa>
  );
}
