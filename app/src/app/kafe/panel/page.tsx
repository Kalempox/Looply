import Link from "next/link";
import { redirect } from "next/navigation";
import { withCafe } from "@/db/context";
import { kafeYoneticisiGerekli } from "@/domain/yetki";
import * as oturum from "@/domain/session";
import { durum as butceDurumu } from "@/domain/butce";
import { IsletmeSayfa, IsletmeBaslik, Bolum, Rozet, IsletmeUyari } from "@/components/isletme";

export const dynamic = "force-dynamic";
export const metadata = { title: "İşletme paneli · CafePlay" };

/**
 * Kafe paneli.
 *
 * Faz 6'nın konusu (bütçe, ürün, kampanya, rapor). Şu an yalnızca kimliğin
 * oturduğunu ve kiracı izolasyonunun çalıştığını gösteriyor: buradaki her
 * sorgu `withCafe` bağlamından geçiyor, `cafe_id` oturumdan geliyor.
 */
export default async function KafePaneli() {
  const o = await kafeYoneticisiGerekli();

  const veri = await withCafe(o.cafeId, async (db) => {
    // Dikkat: sorgularda cafe_id süzgeci YOK. Satırları RLS süzüyor.
    const kafe = await db.one<{
      name: string;
      city: string | null;
      slug: string;
      lat: number | null;
      lng: number | null;
    }>(`SELECT name, city, slug, lat, lng FROM cafes`);
    const masa = await db.one<{ n: string }>(`SELECT count(*) AS n FROM cafe_tables`);
    const personel = await db.one<{ n: string }>(
      `SELECT count(*) AS n FROM staff WHERE active = true`,
    );
    const cihaz = await db.one<{ n: string }>(
      `SELECT count(*) AS n FROM cafe_devices WHERE active = true`,
    );
    return {
      kafe,
      konumVar: kafe?.lat != null && kafe?.lng != null,
      masa: Number(masa?.n ?? 0),
      personel: Number(personel?.n ?? 0),
      cihaz: Number(cihaz?.n ?? 0),
    };
  });

  const butce = await butceDurumu(o.cafeId);

  return (
    <IsletmeSayfa genis>
      <IsletmeBaslik ust="İşletme paneli" alt={veri.kafe?.city ?? undefined}>
        {veri.kafe?.name ?? "İşletme"}
      </IsletmeBaslik>

      {/* Kurulumun geri kalanı doğru olsa bile konum yoksa hiçbir şey
          kazanılmıyor. Bu yüzden uyarı listenin içinde değil, en üstte. */}
      {!veri.konumVar && (
        <div className="mb-8">
          <IsletmeUyari>
            <strong>Kafenin konumu belirlenmemiş.</strong> Oyuncular konumlarını
            doğrulayamıyor; puan, ödül ve kupon hiç kazanılmıyor.{" "}
            <Link href="/kafe/panel/konum" className="underline">
              Konumu işaretle
            </Link>
          </IsletmeUyari>
        </div>
      )}

      <Bolum baslik="Kurulum durumu">
        <div className="grid grid-cols-3 gap-px overflow-hidden rounded-2xl border border-cizgi bg-cizgi">
          <Sayi etiket="Masa" deger={veri.masa} />
          <Sayi etiket="Personel" deger={veri.personel} />
          <Sayi etiket="Kayıtlı cihaz" deger={veri.cihaz} />
        </div>
      </Bolum>

      {butce.donem ? (
        <Bolum baslik="Bu dönemin bütçesi">
          <Link
            href="/kafe/panel/butce"
            className="block rounded-2xl border border-cizgi bg-yuzey px-4 py-4 hover:bg-cukur"
          >
            <div className="flex items-baseline justify-between">
              <span className="etiket-caps text-yazi-sonuk">
                Dağıtılabilir
              </span>
              <span className="font-data text-[12px] text-yazi-sonuk tabular">
                {tlYaz(butce.donem.taahhutKurus)} TL taahhüt
              </span>
            </div>
            <div className="mt-1.5 font-data text-3xl leading-none font-bold tabular">
              {tlYaz(butce.dagitilabilirKurus)}
              <span className="ml-1 text-[13px] font-normal">TL</span>
            </div>
            <div className="mt-2 font-data text-[11px] text-yazi-sonuk tabular">
              {tlYaz(butce.rezerveKurus)} TL açık kuponlarda · {tlYaz(butce.harcananKurus)} TL
              kasada harcandı
            </div>
          </Link>
        </Bolum>
      ) : (
        <Bolum baslik="Bu dönemin bütçesi">
          <IsletmeUyari tur="bekle">
            Henüz bütçe belirlemedin. Bütçe olmadan hiçbir ödül dağıtılamaz.{" "}
            <Link href="/kafe/panel/butce" className="underline">
              Bütçeyi belirle
            </Link>
          </IsletmeUyari>
        </Bolum>
      )}

      <Bolum baslik="Kurulum">
        <ul className="divide-y divide-cizgi border-y border-cizgi">
          <Gorev
            baslik="Kafe konumu"
            aciklama="Oyuncunun kafede olduğunu doğrulamanın tek yolu"
            yol="/kafe/panel/konum"
            durum={veri.konumVar ? "acik" : "eksik"}
          />
          <Gorev
            baslik="Personel ve PIN"
            aciklama="Kasiyer hesabı aç, PIN ver, kasa cihazını kaydet"
            yol="/kafe/panel/personel"
            durum="acik"
          />
          <Gorev
            baslik="Haftalık bütçe"
            aciklama="En az 1.500 TL — kullanılmayan kuponun maliyeti yok"
            yol="/kafe/panel/butce"
            durum="acik"
          />
          <Gorev
            baslik="Ürünler"
            aciklama="Menün — ödüllerin ve kampanyaların dayanağı"
            yol="/kafe/panel/urunler"
            durum="acik"
          />
          <Gorev
            baslik="Ödül kataloğu"
            aciklama="Ürün ödülü ve TL tavanlı indirim kuponu"
            yol="/kafe/panel/oduller"
            durum="acik"
          />
          <Gorev
            baslik="Happy Hour"
            aciklama="Boş saatine görünür bir TL havuzu ayır"
            yol="/kafe/panel/happy-hour"
            durum="acik"
          />
          <Gorev
            baslik="Ürün kampanyaları"
            aciklama="Yüzde indirimi — tavan, adet ve süre limitiyle"
            yol="/kafe/panel/kampanyalar"
            durum="acik"
          />
          <Gorev
            baslik="Masa karekodları"
            aciklama="Masalara yapıştırılacak kodlar — ekle, yazdır, yapıştır"
            yol="/kafe/panel/masalar"
            durum={veri.masa > 0 ? "acik" : "eksik"}
          />
          <Gorev
            baslik="Raporlar"
            aciklama="Gelen nitelikli oyuncu, fiilen kullanılan indirim, hangi saat doluyor"
            yol="/kafe/panel/rapor"
            durum="acik"
          />
        </ul>
      </Bolum>

      <nav className="mt-10 flex items-center gap-5 border-t border-cizgi pt-6 text-[14px]">
        <form action={cikisYap}>
          <button type="submit" className="text-yazi-sonuk underline">
            Çıkış yap
          </button>
        </form>
      </nav>
    </IsletmeSayfa>
  );
}

function tlYaz(kurus: number): string {
  return (kurus / 100).toLocaleString("tr-TR", { maximumFractionDigits: 0 });
}

function Sayi({ etiket, deger }: { etiket: string; deger: number }) {
  return (
    <div className="bg-yuzey px-4 py-5">
      <div className="etiket-caps text-yazi-sonuk">
        {etiket}
      </div>
      <div className="mt-2 font-data text-2xl leading-none font-bold tabular">{deger}</div>
    </div>
  );
}

function Gorev({
  baslik,
  aciklama,
  yol,
  durum,
}: {
  baslik: string;
  aciklama: string;
  yol?: string;
  durum: "acik" | "sirada" | "eksik";
}) {
  const icerik = (
    <>
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-semibold">{baslik}</span>
        <span className="block text-[13px] text-yazi-sonuk">{aciklama}</span>
      </span>
      {durum === "acik" ? (
        <Rozet tur="onayli">açık</Rozet>
      ) : durum === "eksik" ? (
        <Rozet tur="red">eksik</Rozet>
      ) : (
        <Rozet tur="pasif">sırada</Rozet>
      )}
    </>
  );

  return (
    <li>
      {yol ? (
        <Link href={yol} className="flex items-center gap-4 py-3.5 hover:bg-cukur">
          {icerik}
        </Link>
      ) : (
        <div className="flex items-center gap-4 py-3.5 opacity-60">{icerik}</div>
      )}
    </li>
  );
}

async function cikisYap() {
  "use server";
  await oturum.kapat("kullanici_cikisi");
  redirect("/kafe/giris");
}
