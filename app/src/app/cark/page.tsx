import Link from "next/link";
import { redirect } from "next/navigation";
import * as oturum from "@/domain/session";
import * as masaOturumu from "@/domain/masa";
import * as cark from "@/domain/cark";
import * as carkHakki from "@/domain/cark-hakki";
import { cookies } from "next/headers";
import { Sayfa, Baslik, MasaKunyesi } from "@/components/ui";
import { OyuncuNav, NavBosluk } from "@/components/oyuncu-nav";
import { GunlukCark } from "./cark-kabuk";

export const dynamic = "force-dynamic";
export const metadata = { title: "Şans çarkı · Looply" };

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
export default async function CarkSayfasi({
  searchParams,
}: {
  searchParams: Promise<{ cark?: string }>;
}) {
  const sp = await searchParams;
  const o = await oturum.oku();
  if (!o || o.rol !== "oyuncu") redirect("/giris");

  const masa = await masaOturumu.aktif(o.ozneId);

  /*
    ── Butik yolu (Ü137) ──────────────────────────────────────

    Masa oturumu yoksa **çark hakkı** aranıyor: butikte oyun yok, hakkı
    kasiyer veriyor.

    ⚠️ Bekleyen jeton önce sahipleniyor. Müşteri QR'ı okuttuğunda oturumu
    yoksa girişe gidiyor ve jeton çerezde kalıyor; dönüşte burası onu
    buluyor. Giriş akışına hiç dokunulmadı (`/h/[jeton]` notu).
  */
  if (!masa) {
    const bekleyen = (await cookies()).get(carkHakki.HAK_COOKIE)?.value;
    if (bekleyen) {
      const cozum = await carkHakki.coz(bekleyen);
      if (cozum.durum === "gecerli") {
        await carkHakki.sahiplen(cozum.hakId, o.ozneId);
      }
    }
  }

  const hak = masa ? null : await carkHakki.acikHak(o.ozneId);

  if (!masa && !hak) {
    return (
      <Sayfa>
        <Baslik ust="Şans çarkı">Çark hakkın yok</Baslik>
        <p className="text-[15px] leading-relaxed text-yazi-sonuk">
          <strong className="text-yazi">Kafede:</strong> masadaki karekodu okut, oyna —
          çark oyunun sonunda dönüyor.
          <br />
          <br />
          <strong className="text-yazi">Butikte:</strong> alışverişini yaptıktan sonra
          kasadan çark hakkı iste. Kasiyerin gösterdiği karekodu okut.
          <br />
          <br />
          Ödül işletmenin bütçesinden çıkıyor; bu yüzden çark ancak orada dönüyor.
        </p>
        <Link href="/oyna" className="mt-6 inline-block text-[15px] font-semibold underline">
          Ana ekrana dön
        </Link>
        <NavBosluk />
        <OyuncuNav aktif="/oyna" />
      </Sayfa>
    );
  }

  const cafeId = masa ? masa.cafeId : hak!.cafeId;

  // İşletme adı iki kaynaktan gelebiliyor: kafede masa oturumundan,
  // butikte hakkın kendisinden. Alt yazıdaki "ödülü kim karşılıyor"
  // cümlesi ikisinde de doğru olmalı.
  const isletmeAdi = masa ? masa.cafeAdi : await carkHakki.isletmeAdi(cafeId);

  const durum = await cark.durum({ playerId: o.ozneId, cafeId });
  // Ü158: aralık kafenin ayarı — ekrandaki cümle bunu söylemeli.
  const carkAralik = await cark.aralikSaat(cafeId);
  const dilimler = durum.acik || durum.sebep === "sure" ? durum.dilimler : [];

  return (
    <Sayfa>
      {/*
        Künye yalnızca kafede: butikte masa diye bir şey yok ve "—" yazan
        bir masa satırı, olmayan bir kavramı varmış gibi gösterirdi.
      */}
      {masa && <MasaKunyesi kafe={masa.cafeAdi} masa={masa.masaAdi ?? "—"} />}

      <Baslik ust="Şans çarkı">Günde bir kez</Baslik>

      {dilimler.length === 0 ? (
        <p className="text-[15px] leading-relaxed text-yazi-sonuk">
          {cark.durumMetni(durum)}
        </p>
      ) : (
        <GunlukCark
          otomatikAc={sp.cark === "1"}
          dilimler={dilimler.map((d) => ({ baslik: d.baslik }))}
          acik={durum.acik}
          kapaliMetin={cark.durumMetni(durum)}
          aralikSaat={carkAralik}
        />
      )}

      <p className="mt-8 font-data text-[10px] leading-relaxed tracking-wide text-yazi-sonuk">
        Çıkan ödül {isletmeAdi} tarafından karşılanır ve kasada gösterilir. Çarkın sonucu
        sunucuda belirlenir.
      </p>

      <NavBosluk />
      <OyuncuNav aktif="/oyna" />
    </Sayfa>
  );
}
