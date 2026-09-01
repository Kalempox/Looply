import Link from "next/link";
import { redirect } from "next/navigation";
import * as oturum from "@/domain/session";
import { envanter, type EnvanterKuponu } from "@/domain/odul";
import { bakim } from "@/domain/bakim";
import { Sayfa } from "@/components/ui";
import { SayfaBasi, Sayac, OyuncuBolum } from "@/components/oyuncu";
import { RENK, TUR_RENGI } from "@/components/oyuncu-renk";
import { BiletIkonu, HediyeIkonu } from "@/components/oyuncu-ikon";
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
 *
 * ── Renk kuponun cinsinden geliyor (Ü65) ────────────────────
 *
 * İlk denemede beş kupon alt alta duruyordu ve **beşi de aynı koyu
 * mordu** — cüzdan değil, aynı kartın beş kopyası. Ürün sahibi haklı
 * olarak *"her yere bu mor efekti koyma"* dedi.
 *
 * Artık her bilet cinsinin renginde: ürün amber, yüzde menekşe, tutar
 * nane. Renk rastgele değil — rastgele olsaydı süs olurdu; cins zaten
 * bilinen bir şey ve renk onu okumadan gösteriyor.
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
      <SayfaBasi
        ust="Envanter"
        baslik="Ödüllerim"
        renk="amber"
        ikon={<BiletIkonu boy={130} />}
      >
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
        <div className="rounded-3xl border border-cizgi bg-yuzey px-6 py-8 text-center">
          <div className="flex justify-center">
            <HediyeIkonu boy={64} />
          </div>
          <p className="mt-4 text-[15px] leading-relaxed text-yazi-sonuk">
            Henüz ödülün yok. Bir CafePlay kafesinde masadaki karekodu okutup oynadığında
            kazandıkların burada birikir.
          </p>
          <Link
            href="/oyna"
            className="mt-5 inline-block rounded-xl bg-vurgu px-6 py-3 font-display text-[15px] font-bold tracking-tight text-white"
          >
            Oynamaya başla
          </Link>
        </div>
      ) : (
        <>
          <OyuncuBolum
            baslik="Kullanılabilir"
            renk="amber"
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
              <ul className="flex flex-col gap-2.5 opacity-60">
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

      <NavBosluk />
      <OyuncuNav aktif="/oduller" />
    </Sayfa>
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
 * Bu kart oyuncunun kasaya uzattığı şey. Diğer kartlarla aynı beyaz
 * dikdörtgen olduğunda "bunu göstereceğim" hissi vermiyordu. Zımba
 * çentikleri, doygun renk ve sol kenardaki koçan, ekrandaki tek
 * fiziksel nesne izlenimi veriyor.
 *
 * Çentikler `radial-gradient` ile **kartın kenarına oyulmuş** iki
 * boşluk: üstüne yerleştirilen daireler olsaydı arkadaki sayfa rengini
 * bilmek gerekirdi ve kart her zeminde ayrı davranırdı.
 *
 * ── TL yok ──────────────────────────────────────────────────
 *
 * E9: ödülün adı var, değeri yok. Bilet ne kadar "değerli" görünürse
 * görünsün, üstünde bir tutar yazmıyor.
 */
function BiletKarti({ kupon }: { kupon: EnvanterKuponu }) {
  const r = RENK[TUR_RENGI[kupon.tur]];

  return (
    <Link
      href={`/oduller/${kupon.id}`}
      className="relative block overflow-hidden rounded-2xl text-white transition-transform active:scale-[0.99]"
      style={{
        background: `linear-gradient(120deg, ${r.canli} 0%, ${r.ana} 60%, ${r.koyu} 100%)`,
      }}
    >
      {/* Kenardaki zımba çentikleri — biletin tek süsü. */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 0 68%, var(--color-zemin) 9px, transparent 9px)," +
            "radial-gradient(circle at 100% 68%, var(--color-zemin) 9px, transparent 9px)",
        }}
      />

      <div className="relative flex items-stretch">
        {/* Koçan: biletin renkli gövdesinden koparılan uç. Yalnızca
            görsel — kupon tek parça ve kod QR ekranında. */}
        <span
          aria-hidden
          className="flex w-12 shrink-0 items-center justify-center bg-white/15"
        >
          <BiletIkonu boy={24} renk={TUR_RENGI[kupon.tur]} />
        </span>

        <span className="min-w-0 flex-1 px-4 py-4">
          <span className="block etiket-caps text-white/70">{kupon.cafeAdi}</span>
          <span className="mt-1 block font-display text-xl leading-tight font-bold">
            {kupon.baslik}
          </span>

          {/* Kesikli çizgi: biletin koparma yeri. */}
          <span className="mt-3 block border-t border-dashed border-white/35 pt-2.5">
            <span className="flex items-baseline justify-between gap-3">
              <span className="etiket-caps text-white">Kasada göster →</span>
              <span className="font-data text-[10px] text-white/65 tabular">
                son{" "}
                {kupon.sonKullanim.toLocaleDateString("tr-TR", {
                  day: "numeric",
                  month: "short",
                })}
              </span>
            </span>
          </span>
        </span>
      </div>
    </Link>
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
  const r = RENK[TUR_RENGI[kupon.tur]];

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
    "block rounded-2xl border border-cizgi bg-yuzey px-5 py-4 border-l-4 transition-colors";

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
