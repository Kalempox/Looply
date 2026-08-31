import Link from "next/link";
import { redirect } from "next/navigation";
import * as oturum from "@/domain/session";
import { envanter, type EnvanterKuponu } from "@/domain/odul";
import { bakim } from "@/domain/bakim";
import { Sayfa, Baslik } from "@/components/ui";
import { OyuncuNav, NavBosluk } from "@/components/oyuncu-nav";

export const dynamic = "force-dynamic";

/**
 * "Ödüllerim" — kazanılan ödüllerin envanteri.
 *
 * Oyuncunun bu ekranda sorduğu iki soru var: *neyim var* ve *nerede
 * kullanabilirim*. Bu yüzden her kartın üstünde kafe adı duruyor;
 * kupon kafeye bağlı (Ü5) ve yanlış kafeye gitmek boşa yürümek demek.
 *
 * **Ekranda TL yok** (E9). Ödülün adı var, değeri yok; geçerlilik
 * damgası da yok. Kasiyerin sistemi atlaması tasarımla engelleniyor —
 * telefonda "80 TL" yazan bir ekran gösterilip kasada kabul edilmesi
 * mümkün olmamalı. Değeri yalnızca kasa ekranı görür (Faz 7).
 */
export default async function OdullerSayfasi() {
  const o = await oturum.oku();
  if (!o || o.rol !== "oyuncu") redirect("/giris");

  // Süresi dolanları kapat, ertelenmişleri aç — dakikada en fazla bir kez.
  // Ekranın doğruluğu buna bağlı değil (durum zamandan hesaplanıyor); bu
  // yalnızca defteri ve bütçe iadesini toparlıyor.
  await bakim();

  const e = await envanter(o.ozneId);
  const bosMu = !e.kullanilabilir.length && !e.bekleyen.length && !e.gecmis.length;

  return (
    <Sayfa>
      <Baslik ust="Envanter">Ödüllerim</Baslik>

      {bosMu ? (
        <div className="rounded-2xl border border-cizgi bg-yuzey px-6 py-8">
          <div className="text-3xl leading-none" aria-hidden>
            🎟️
          </div>
          <p className="mt-4 text-[15px] leading-relaxed text-yazi-sonuk">
            Henüz ödülün yok. Bir CafePlay kafesinde masadaki karekodu okutup oynadığında
            kazandıkların burada birikir.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-10">
          <Bolum
            baslik="Kullanılabilir"
            bos="Şu an kullanabileceğin kupon yok."
            kuponlar={e.kullanilabilir}
            odul
          />

          {e.bekleyen.length > 0 && (
            <Bolum
              baslik="Yakında açılıyor"
              not="Büyük ödüller kazanıldığı anda değil, 24 saat sonra açılır."
              kuponlar={e.bekleyen}
            />
          )}

          {e.gecmis.length > 0 && <Bolum baslik="Geçmiş" kuponlar={e.gecmis} sonuk />}
        </div>
      )}

      <NavBosluk />
      <OyuncuNav aktif="/oduller" />
    </Sayfa>
  );
}

/* ── Parçalar ──────────────────────────────────────────── */

function Bolum({
  baslik,
  not,
  bos,
  kuponlar,
  odul,
  sonuk,
}: {
  baslik: string;
  not?: string;
  bos?: string;
  kuponlar: EnvanterKuponu[];
  odul?: boolean;
  sonuk?: boolean;
}) {
  return (
    <section>
      <h2 className="mb-1 etiket-caps text-yazi-sonuk">
        {baslik}
      </h2>
      {not && <p className="mb-3 text-[12px] leading-relaxed text-yazi-sonuk">{not}</p>}

      {kuponlar.length === 0 ? (
        bos && <p className="mt-2 text-[13px] text-yazi-sonuk">{bos}</p>
      ) : (
        <ul className={`mt-3 flex flex-col gap-2.5 ${sonuk ? "opacity-55" : ""}`}>
          {kuponlar.map((k) => (
            <KuponKarti key={k.id} kupon={k} odul={odul} />
          ))}
        </ul>
      )}
    </section>
  );
}

const DURUM_ETIKETI: Record<EnvanterKuponu["durum"], string> = {
  kullanilabilir: "Kasada göster",
  beklemede: "Birazdan açılıyor",
  kullanildi: "Kullanıldı",
  suresi_doldu: "Süresi doldu",
  geri_alindi: "Geri alındı",
};

function KuponKarti({ kupon, odul }: { kupon: EnvanterKuponu; odul?: boolean }) {
  const tarih = kupon.durum === "beklemede" ? kupon.aktiflesme : kupon.sonKullanim;
  const tarihEtiketi = kupon.durum === "beklemede" ? "Açılış" : "Son kullanım";
  const acilabilir = kupon.durum === "kullanilabilir" || kupon.durum === "beklemede";

  const govde = (
    <>
      <div className="etiket-caps text-yazi-sonuk">
        {kupon.cafeAdi}
      </div>

      <div className="mt-1.5 font-display text-xl leading-tight font-bold">{kupon.baslik}</div>

      <div className="mt-3 flex items-baseline justify-between gap-3">
        <span
        className={`etiket-caps ${
            kupon.durum === "kullanilabilir" ? "text-odul-koyu" : "text-yazi-sonuk"
          }`}
        >
          {DURUM_ETIKETI[kupon.durum]}
        </span>
        <span className="font-data text-[10px] text-yazi-sonuk tabular">
          {tarihEtiketi}{" "}
          {tarih.toLocaleDateString("tr-TR", { day: "numeric", month: "long" })}
        </span>
      </div>
    </>
  );

  return (
    <li>
      {acilabilir ? (
        <Link
          href={`/oduller/${kupon.id}`}
          className={`block rounded-2xl border bg-yuzey px-5 py-4 ${
            odul ? "border-odul" : "border-cizgi"
          }`}
        >
          {govde}
        </Link>
      ) : (
        <div className="rounded-2xl border border-cizgi bg-yuzey px-5 py-4">{govde}</div>
      )}
    </li>
  );
}
