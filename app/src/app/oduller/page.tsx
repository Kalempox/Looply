import Link from "next/link";
import { redirect } from "next/navigation";
import * as oturum from "@/domain/session";
import { envanter, type EnvanterKuponu } from "@/domain/odul";
import { bakim } from "@/domain/bakim";
import { Sayfa } from "@/components/ui";
import { KoyuKart, CamKutu, OyuncuBolum } from "@/components/oyuncu";
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
 * ── Görsel dil: çarkın dili (Ü64) ───────────────────────────
 *
 * Ekran beyaz kartlardan oluşuyordu ve ana ekranın koyu durum
 * kartından buraya geçince ürün iki farklı uygulamaya bölünüyordu.
 * Şimdi baş kısım koyu, kullanılabilir kuponlar **bilet** gibi
 * duruyor: kenarında zımba çentikleri, altın çerçeve, koyu zemin.
 *
 * Ayrım bilerek: bilet gibi duran tek şey **kullanılabilir** kupon.
 * Bekleyen ve geçmiş sakin ve açık kalıyor — kasada gösterilecek olan
 * hangisi sorusu, ekranın en uzaktan okunan cevabı olmalı.
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
      <section className="mb-9">
        <KoyuKart>
          <p className="etiket-caps text-white/60">Envanter</p>
          <h1 className="mt-1 font-display text-3xl leading-none font-extrabold tracking-tight">
            Ödüllerim
          </h1>

          <div className="mt-5 grid grid-cols-2 gap-2.5">
            <CamKutu
              etiket="Kasada gösterebilirsin"
              deger={String(e.kullanilabilir.length)}
              altin={e.kullanilabilir.length > 0}
              alt={e.kullanilabilir.length === 0 ? "şu an hazır kupon yok" : undefined}
            />
            <CamKutu
              etiket="Yakında açılıyor"
              deger={String(e.bekleyen.length)}
              alt={e.bekleyen.length > 0 ? "24 saat sonra" : "bekleyen yok"}
            />
          </div>
        </KoyuKart>
      </section>

      {bosMu ? (
        <div className="rounded-2xl border border-cizgi bg-yuzey px-6 py-8 text-center">
          <div className="text-4xl leading-none" aria-hidden>
            🎟️
          </div>
          <p className="mt-4 text-[15px] leading-relaxed text-yazi-sonuk">
            Henüz ödülün yok. Bir CafePlay kafesinde masadaki karekodu okutup oynadığında
            kazandıkların burada birikir.
          </p>
          <Link
            href="/oyna"
            className="mt-5 inline-block rounded-lg bg-vurgu px-6 py-3 font-display text-[15px] font-bold tracking-tight text-white"
          >
            Oynamaya başla
          </Link>
        </div>
      ) : (
        <>
          <OyuncuBolum
            baslik="Kullanılabilir"
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
 * çentikleri ve koyu zemin, ekrandaki tek fiziksel nesne izlenimi
 * veriyor.
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
  return (
    <Link
      href={`/oduller/${kupon.id}`}
      className="relative block overflow-hidden rounded-2xl border border-odul/70 text-white transition-transform active:scale-[0.99]"
      style={{
        background: "linear-gradient(140deg, #3d2374 0%, #241246 60%, #180d30 100%)",
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

      <div className="relative px-5 py-4">
        <div className="etiket-caps text-white/55">{kupon.cafeAdi}</div>
        <div className="mt-1.5 font-display text-xl leading-tight font-bold">{kupon.baslik}</div>

        {/* Kesikli çizgi: biletin koparma yeri. */}
        <div className="mt-3.5 border-t border-dashed border-white/25 pt-3">
          <div className="flex items-baseline justify-between gap-3">
            <span className="etiket-caps text-odul">Kasada göster →</span>
            <span className="font-data text-[10px] text-white/50 tabular">
              son {kupon.sonKullanim.toLocaleDateString("tr-TR", {
                day: "numeric",
                month: "short",
              })}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}

/**
 * Bekleyen ve geçmiş kupon — sakin kart.
 *
 * Bilet olmamaları bilinçli: kasada gösterilemeyecek bir şeyin bilet
 * gibi durması, oyuncuyu kasaya boşuna gönderir.
 */
function SakinKart({ kupon }: { kupon: EnvanterKuponu }) {
  const bekliyor = kupon.durum === "beklemede";
  const tarih = bekliyor ? kupon.aktiflesme : kupon.sonKullanim;

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

  return bekliyor ? (
    <Link
      href={`/oduller/${kupon.id}`}
      className="block rounded-2xl border border-cizgi bg-yuzey px-5 py-4 transition-colors hover:border-yazi-sonuk/40"
    >
      {govde}
    </Link>
  ) : (
    <div className="rounded-2xl border border-cizgi bg-yuzey px-5 py-4">{govde}</div>
  );
}
