import Link from "next/link";
import { redirect } from "next/navigation";
import * as oturum from "@/domain/session";
import { envanter, type EnvanterKuponu } from "@/domain/odul";
import { bakim } from "@/domain/bakim";
import { OyuncuSayfa, SayfaBasi, Sayac, OyuncuBolum } from "@/components/oyuncu";
import { RENK } from "@/components/oyuncu-renk";
import { Gorsel, gorselSec, GORSEL_RENGI } from "@/components/oyuncu-gorsel";
import { Bilet } from "@/components/bilet";

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
 *
 * ── Renk yerine çizim (Ü66) ─────────────────────────────────
 *
 * İlk denemede (Ü65) her bilet cinsinin doygun renginde bir gradyandı
 * ve ürün sahibi *"fazla cırtlak"* dedi. Haklıydı: beş bilet alt alta
 * beş duvar demekti ve renk, karta bakan gözün ilk gördüğü şeydi —
 * oysa oyuncunun aradığı şey "hangi kupon".
 *
 * Şimdi zemin pastel, arkada **kuponun kendi çizimi** duruyor: kahve
 * indiriminde fincan, tatlıda pasta, yüzdede etiket. Renk hâlâ cinsi
 * söylüyor ama artık fısıldayarak.
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
    <OyuncuSayfa aktif="/oduller">
      <SayfaBasi ust="Envanter" baslik="Ödüllerim" renk="amber" gorsel="bilet">
        <div className="grid grid-cols-2 gap-2.5">
          <Sayac
            etiket="Kasada gösterebilirsin"
            deger={String(e.kullanilabilir.length)}
            renk={e.kullanilabilir.length > 0 ? "amber" : undefined}
            alt={e.kullanilabilir.length === 0 ? "şu an hazır kupon yok" : undefined}
          />
          <Sayac
            etiket="Yakında açılıyor"
            deger={String(e.bekleyen.length)}
            alt={e.bekleyen.length > 0 ? "24 saat sonra" : "bekleyen yok"}
          />
        </div>
      </SayfaBasi>

      {bosMu ? (
        <div className="relative overflow-hidden rounded-3xl border border-cizgi bg-yuzey px-6 py-8 text-center">
          <span
            aria-hidden
            className="pointer-events-none absolute -right-6 -bottom-8 text-yazi-sonuk opacity-[0.10]"
          >
            <Gorsel ad="bilet" boy={140} />
          </span>
          <p className="relative text-[15px] leading-relaxed text-yazi-sonuk">
            Henüz ödülün yok. Bir CafePlay kafesinde masadaki karekodu okutup oynadığında
            kazandıkların burada birikir.
          </p>
          <Link
            href="/oyna"
            className="relative mt-5 inline-block rounded-xl bg-vurgu px-6 py-3 font-display text-[15px] font-bold tracking-tight text-white"
          >
            Oynamaya başla
          </Link>
        </div>
      ) : (
        <>
          <OyuncuBolum
            baslik="Kullanılabilir"
            renk="kahve"
            not={e.kullanilabilir.length > 0 ? "kasada göster" : undefined}
          >
            {e.kullanilabilir.length === 0 ? (
              <p className="rounded-2xl border border-cizgi bg-yuzey px-5 py-5 text-[14px] text-yazi-sonuk">
                Şu an kullanabileceğin kupon yok.
              </p>
            ) : (
              <ul className="flex flex-col gap-3">
                {e.kullanilabilir.map((k) => (
                  <li key={k.id}>
                    <BiletKarti kupon={k} />
                  </li>
                ))}
              </ul>
            )}
          </OyuncuBolum>

          {e.bekleyen.length > 0 && (
            <OyuncuBolum baslik="Yakında açılıyor" not="24 saat">
              <ul className="flex flex-col gap-2.5">
                {e.bekleyen.map((k) => (
                  <li key={k.id}>
                    <SakinKart kupon={k} />
                  </li>
                ))}
              </ul>
            </OyuncuBolum>
          )}

          {e.gecmis.length > 0 && (
            <OyuncuBolum baslik="Geçmiş">
              <ul className="flex flex-col gap-2.5 opacity-70">
                {e.gecmis.map((k) => (
                  <li key={k.id}>
                    <SakinKart kupon={k} />
                  </li>
                ))}
              </ul>
            </OyuncuBolum>
          )}
        </>
      )}
    </OyuncuSayfa>
  );
}

/* ── Parçalar ──────────────────────────────────────────── */

const DURUM_ETIKETI: Record<EnvanterKuponu["durum"], string> = {
  kullanilabilir: "Kasada göster",
  beklemede: "Birazdan açılıyor",
  kullanildi: "Kullanıldı",
  suresi_doldu: "Süresi doldu",
  geri_alindi: "Geri alındı",
};

/**
 * Kullanılabilir kupon — bilet.
 *
 * ── Neden bilet ─────────────────────────────────────────────
 *
 * Bu kart oyuncunun kasaya uzattığı şey. Görünümü `components/bilet.tsx`
 * içinde (Ü72): koyu doygun zemin, kategori deseni, sağ kenardan taşan
 * çizim. Buradaki iş yalnızca kuponu o biçime çevirmek.
 *
 * ── TL yok ──────────────────────────────────────────────────
 *
 * E9: ödülün adı var, değeri yok. Bilet ne kadar "değerli" görünürse
 * görünsün, üstünde bir tutar yazmıyor.
 */
function BiletKarti({ kupon }: { kupon: EnvanterKuponu }) {
  const gorsel = gorselSec(kupon.baslik, kupon.tur, kupon.kategoriTuru);

  return (
    <Bilet
      veri={{
        href: `/oduller/${kupon.id}`,
        kafe: kupon.cafeAdi,
        baslik: kupon.baslik,
        gorsel,
        renk: GORSEL_RENGI[gorsel],
        son: kupon.sonKullanim.toLocaleDateString("tr-TR", {
          day: "numeric",
          month: "short",
        }),
      }}
    />
  );
}

/**
 * Bekleyen ve geçmiş kupon — sakin kart.
 *
 * Bilet olmamaları bilinçli: kasada gösterilemeyecek bir şeyin bilet
 * gibi durması, oyuncuyu kasaya boşuna gönderir. Cins rengi burada
 * yalnızca sol kenarda bir şerit — hangi kupon olduğu görünüyor ama
 * kart "beni kullan" demiyor.
 */
function SakinKart({ kupon }: { kupon: EnvanterKuponu }) {
  const bekliyor = kupon.durum === "beklemede";
  const tarih = bekliyor ? kupon.aktiflesme : kupon.sonKullanim;
  const r = RENK[GORSEL_RENGI[gorselSec(kupon.baslik, kupon.tur, kupon.kategoriTuru)]];

  const govde = (
    <>
      <div className="etiket-caps text-yazi-sonuk">{kupon.cafeAdi}</div>
      <div className="mt-1.5 font-display text-[17px] leading-tight font-bold">{kupon.baslik}</div>
      <div className="mt-2.5 flex items-baseline justify-between gap-3">
        <span className="etiket-caps text-yazi-sonuk">{DURUM_ETIKETI[kupon.durum]}</span>
        <span className="font-data text-[10px] text-yazi-sonuk tabular">
          {bekliyor ? "açılış" : "son"}{" "}
          {tarih.toLocaleDateString("tr-TR", { day: "numeric", month: "short" })}
        </span>
      </div>
    </>
  );

  const sinif =
    "block rounded-2xl border border-cizgi border-l-4 bg-yuzey px-5 py-4 transition-colors";

  return bekliyor ? (
    <Link
      href={`/oduller/${kupon.id}`}
      className={`${sinif} hover:border-yazi-sonuk/40`}
      style={{ borderLeftColor: r.canli }}
    >
      {govde}
    </Link>
  ) : (
    <div className={sinif} style={{ borderLeftColor: r.canli }}>
      {govde}
    </div>
  );
}
