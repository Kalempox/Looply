import { acilmaMetni } from "@/domain/bekleme-metni";
import Link from "next/link";
import { redirect } from "next/navigation";
import * as oturum from "@/domain/session";
import { envanter, type EnvanterKuponu } from "@/domain/odul";
import { bakim } from "@/domain/bakim";
import { OyuncuSayfa, SayfaBasi, Sayac, OyuncuBolum } from "@/components/oyuncu";
import { RENK } from "@/components/oyuncu-renk";
import { Gorsel, gorselSec, GORSEL_RENGI } from "@/components/oyuncu-gorsel";
import { Bilet } from "@/components/bilet";
import { KazimaKarti } from "@/components/kazima-karti";
import { kuponuKaz } from "./actions";

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
export default async function OdullerSayfasi({
  searchParams,
}: {
  searchParams: Promise<{ g?: string }>;
}) {
  const sp = await searchParams;
  /**
   * 🔴 Ödüllerim ikiye ayrıldı — Ü159.
   *
   * Ürün sahibi: *"süresi geçenler, kullanılmışlar, yakında açılanlar
   * aynı sayfada olmamalı; ilk Ödüllerim'e tıkladığında kullanılabilir
   * olanları görmeli."*
   *
   * Haklıydı ve sebebi ekranın işinde: bu sayfanın **tek yapılacak işi**
   * kasada kupon göstermek. Kullanılmış ve süresi geçmiş kuponlar bir iş
   * değil, bir kayıt — ama aynı yığında dururken oyuncunun gözü onları
   * da tarıyor ve hazır kuponunu aramak zorunda kalıyor.
   *
   * ⚠️ Sekme **adreste** (`?g=gecmis`), istemci durumunda değil: panelin
   * sayfalamasıyla (Ü123, `?s=3`) aynı kalıp. Bağlantı paylaşılabiliyor,
   * geri tuşu çalışıyor ve sunucu bileşeni istemciye dönmüyor.
   *
   * ⚠️ Varsayılan **kullanılabilir**: bilinmeyen bir değer gelirse de
   * oraya düşüyor. Geçmişi varsayılan yapmak, ekranı açan oyuncuya önce
   * kaçırdıklarını göstermek olurdu.
   */
  const gecmisMi = sp.g === "gecmis";

  const o = await oturum.oku();
  if (!o || o.rol !== "oyuncu") redirect("/giris");

  // Süresi dolanları kapat, ertelenmişleri aç — dakikada en fazla bir kez.
  // Ekranın doğruluğu buna bağlı değil (durum zamandan hesaplanıyor); bu
  // yalnızca defteri ve bütçe iadesini toparlıyor.
  await bakim();

  const e = await envanter(o.ozneId);
  const bosMu =
    !e.kazinacak.length &&
    !e.kullanilabilir.length &&
    !e.bekleyen.length &&
    !e.kullanilan.length &&
    !e.kacirilan.length;

  // Ü128: kullanılabilir kuponlar kafeye göre gruplanıyor.
  const kafeler = kafeyeGore(e.kullanilabilir);

  return (
    <OyuncuSayfa aktif="/oduller" yuva={false}>
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
            /* Ü97: saat söylenmiyor — sürpriz olan ödül değil, zamanı. */
            alt={e.bekleyen.length > 0 ? "zamanı gelince" : "bekleyen yok"}
          />
        </div>
      </SayfaBasi>

      {!bosMu && <OdulSekmeleri gecmisMi={gecmisMi} e={e} />}

      {bosMu ? (
        <div className="relative overflow-hidden rounded-3xl border border-cizgi bg-yuzey px-6 py-8 text-center">
          <span
            aria-hidden
            className="pointer-events-none absolute -right-6 -bottom-8 text-yazi-sonuk opacity-[0.10]"
          >
            <Gorsel ad="bilet" boy={140} />
          </span>
          <p className="relative text-[15px] leading-relaxed text-yazi-sonuk">
            Henüz ödülün yok. Bir Looply kafesinde masadaki karekodu okutup oynadığında
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
          {/*
            ═══ Kazınacak kuponlar (Ü141) ═══════════════

            Ürün sahibi: *"oyun oynayıp kupon kazanan kişilerin
            kuponlarım kısmına bu kazıma animasyonunu ekle."*

            ── Neden en üstte ve neden ayrı ────────────

            Bu kartlar ekranın **tek yapılacak işi**: geri kalan her şey
            durum bildiriyor, bunlar bir eylem bekliyor. Gruplara
            karışsalardı oyuncu kendi ödülünü aramak zorunda kalırdı.

            ⚠️ Sayaçlara da girmiyorlar (bkz. `domain/odul.ts`):
            kazınmamış kupon kasada gösterilemez ve "Kasada
            gösterebilirsin" sayısına eklenseydi oyuncu kasaya boşuna
            giderdi.

            ⚠️ Kartlarda **ödül hakkında hiçbir bilgi yok** ve bu
            sunucu tarafında sağlanıyor — ad, cins ve kategori
            gönderilmiyor. Burada saklansaydı sayfanın kaynağına bakan
            herkes kazımadan görürdü.
          */}
          {!gecmisMi && e.kazinacak.length > 0 && (
            <OyuncuBolum
              baslik={
                e.kazinacak.length > 1
                  ? `${e.kazinacak.length} kuponun kazınmayı bekliyor`
                  : "Bir kuponun kazınmayı bekliyor"
              }
              not="Ne kazandığını kazıyınca göreceksin."
              renk="amber"
            >
              <ul className="flex flex-col gap-3">
                {e.kazinacak.map((k) => (
                  <li key={k.id}>
                    <KazimaKarti
                      kuponId={k.id}
                      cafeAdi={k.cafeAdi}
                      bekliyor={k.durum === "beklemede"}
                      son={k.sonKullanim.toLocaleDateString("tr-TR", {
                        day: "numeric",
                        month: "short",
                      })}
                      ac={kuponuKaz}
                    />
                  </li>
                ))}
              </ul>
            </OyuncuBolum>
          )}

          {/*
            Açılma anı (Ü98).

            ⚠️ Ü97 oyuncuya *"zamanı gelince"* diyor ama zamanı geldiğinde
            uygulama içinde hiçbir şey söylemiyordu: kupon sessizce
            "Yakında açılıyor"dan "Kullanılabilir"e geçiyordu. Bekleme
            mizahının karşılığı olan **an** buydu ve yoktu — söz verilip
            tutulmamış bir vaatti.

            ⚠️ Bu şerit aynı kuponları AYRICA gösteriyor, listeden
            almıyor: oyuncu ödülünü alışık olduğu yerde bulmaya devam
            etmeli. Yirmi dört saat sonra kutlama kendiliğinden kalkıyor.
          */}
          {e.yeniAcilan.length > 0 && (
            <div className="gir mb-7 rounded-2xl border border-odul bg-odul-zemin px-5 py-5">
              <div className="etiket-caps text-odul-koyu">
                {e.yeniAcilan.length > 1 ? `${e.yeniAcilan.length} ödülün açıldı` : "Ödülün açıldı"}
              </div>
              <ul className="mt-2 flex flex-col gap-2">
                {e.yeniAcilan.map((k) => (
                  <li key={k.id}>
                    <p className="text-[14px] leading-relaxed text-yazi-sonuk">
                      {acilmaMetni(k.id)}
                    </p>
                    <p className="mt-0.5 font-display text-[17px] leading-tight font-bold">
                      {k.baslik}
                    </p>
                    <p className="text-[12px] text-yazi-sonuk">{k.cafeAdi}</p>
                  </li>
                ))}
              </ul>
              <p className="mt-3 border-t border-odul/40 pt-2.5 text-[12px] leading-relaxed text-yazi-sonuk">
                Kasada gösterip kullanabilirsin.
              </p>
            </div>
          )}

          {/*
            Ü128: kupon listesi **kafeye göre gruplanıyor.**

            Oyuncu farklı kafelerde oynuyor ve kuponları tek bir listede
            karışıyordu; her kartın altında kafe adı yazsa da "bugün bu
            kafeye gidiyorum, elimde ne var" sorusu ancak satır satır
            okuyarak cevaplanıyordu. Kasada sıra beklerken yapılacak iş
            bu değil.

            ⚠️ Kafe başlığı **tek kafede de** çiziliyor. Gizleseydik iki
            kafeli oyuncunun ekranı bir anda başka bir düzene geçerdi;
            aynı ekranın iki hâli olmasındansa tek kafede de aynı
            iskelet duruyor.
          */}
          {!gecmisMi && (
          <OyuncuBolum
            baslik="Kullanılabilir"
            renk="kahve"
            not={e.kullanilabilir.length > 0 ? "kasada göster" : undefined}
          >
            {kafeler.length === 0 ? (
              <p className="rounded-2xl border border-cizgi bg-yuzey px-5 py-5 text-[14px] text-yazi-sonuk">
                Şu an kullanabileceğin kupon yok.
              </p>
            ) : (
              <div className="flex flex-col gap-6">
                {kafeler.map((g) => (
                  <section key={g.cafeId}>
                    <div className="mb-2.5 flex items-baseline justify-between gap-3">
                      <h3 className="font-display text-[16px] leading-tight font-bold">
                        {g.cafeAdi}
                      </h3>
                      <span className="shrink-0 text-[12px] text-yazi-sonuk">
                        {g.kuponlar.length} kupon
                      </span>
                    </div>
                    <ul className="flex flex-col gap-3">
                      {g.kuponlar.map((k) => (
                        <li key={k.id}>
                          <BiletKarti kupon={k} />
                        </li>
                      ))}
                    </ul>
                  </section>
                ))}
              </div>
            )}
          </OyuncuBolum>
          )}

          {gecmisMi && e.bekleyen.length > 0 && (
            <OyuncuBolum baslik="Yakında açılıyor" not="zamanı gelince">
              <ul className="flex flex-col gap-2.5">
                {e.bekleyen.map((k) => (
                  <li key={k.id}>
                    <SakinKart kupon={k} />
                  </li>
                ))}
              </ul>
            </OyuncuBolum>
          )}

          {/*
            Ü128: geçmiş ikiye ayrıldı. Tek yığındayken "bunu yaşadım" ile
            "bunu kaçırdım" aynı sönük listede duruyordu ve ikisi de bir
            şey ifade etmiyordu.
          */}
          {gecmisMi && e.kullanilan.length > 0 && (
            <OyuncuBolum baslik="Kullandıkların" not={`${e.kullanilan.length} kupon`}>
              <ul className="flex flex-col gap-2.5 opacity-80">
                {e.kullanilan.map((k) => (
                  <li key={k.id}>
                    <SakinKart kupon={k} />
                  </li>
                ))}
              </ul>
            </OyuncuBolum>
          )}

          {gecmisMi && e.kacirilan.length > 0 && (
            <OyuncuBolum baslik="Süresi geçenler">
              <ul className="flex flex-col gap-2.5 opacity-60">
                {e.kacirilan.map((k) => (
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

/**
 * Kuponları kafeye göre gruplar — Ü128.
 *
 * ⚠️ Sıra **envanterin sırasından** türüyor, kafe adına göre değil:
 * `envanter()` kuponları en yeniden eskiye diziyor, yani en son kupon
 * kazandığın kafe üstte çıkıyor. Alfabetik sıralasaydık "Akkahve" adlı
 * kafe, oyuncunun beş dakika önce oynadığı kafenin üstünde durur ve
 * kasada aranan kupon aşağıda kalırdı.
 */
/**
 * Ödüllerim'in iki sekmesi — Ü159.
 *
 * ⚠️ `<Link>` ile, düğme değil: sekme bir **adres**, bir durum değil.
 * Böylece geri tuşu çalışıyor, bağlantı paylaşılabiliyor ve sunucu
 * bileşeni istemciye dönmek zorunda kalmıyor.
 *
 * ⚠️ Sayılar sekmenin üstünde duruyor: oyuncu geçmişe **girmeden**
 * orada bir şey olup olmadığını görüyor. Sayı olmasaydı boş bir
 * sekmeye tıklamak tek yol olurdu.
 */
function OdulSekmeleri({
  gecmisMi,
  e,
}: {
  gecmisMi: boolean;
  e: { kazinacak: unknown[]; kullanilabilir: unknown[]; bekleyen: unknown[]; kullanilan: unknown[]; kacirilan: unknown[] };
}) {
  const simdi = e.kazinacak.length + e.kullanilabilir.length;
  const gecmis = e.bekleyen.length + e.kullanilan.length + e.kacirilan.length;

  const stil = (secili: boolean) =>
    `flex-1 rounded-xl px-4 py-2.5 text-center text-[14px] font-bold transition-colors ${
      secili ? "bg-yazi text-yuzey" : "text-yazi-sonuk hover:text-yazi"
    }`;

  return (
    <nav className="mb-6 flex gap-1.5 rounded-2xl border border-cizgi bg-yuzey p-1.5">
      <Link href="/oduller" className={stil(!gecmisMi)} aria-current={!gecmisMi ? "page" : undefined}>
        Kullanılabilir
        {simdi > 0 && <span className="ml-1.5 font-data text-[12px] opacity-70">{simdi}</span>}
      </Link>
      <Link
        href="/oduller?g=gecmis"
        className={stil(gecmisMi)}
        aria-current={gecmisMi ? "page" : undefined}
      >
        Geçmiş
        {gecmis > 0 && <span className="ml-1.5 font-data text-[12px] opacity-70">{gecmis}</span>}
      </Link>
    </nav>
  );
}

function kafeyeGore(
  kuponlar: EnvanterKuponu[],
): { cafeId: string; cafeAdi: string; kuponlar: EnvanterKuponu[] }[] {
  const harita = new Map<string, { cafeId: string; cafeAdi: string; kuponlar: EnvanterKuponu[] }>();

  for (const k of kuponlar) {
    let g = harita.get(k.cafeId);
    if (!g) {
      g = { cafeId: k.cafeId, cafeAdi: k.cafeAdi, kuponlar: [] };
      harita.set(k.cafeId, g);
    }
    g.kuponlar.push(k);
  }

  return [...harita.values()];
}

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
  // Ü141: kapalı kupon bu listeye hiç girmiyor (`kazinacak`a gidiyor),
  // yani ad burada kesin dolu. Yedek dizgi yalnızca tipi daraltıyor.
  const baslik = kupon.baslik ?? "";
  const gorsel = gorselSec(baslik, kupon.tur, kupon.kategoriTuru);

  return (
    <Bilet
      veri={{
        href: `/oduller/${kupon.id}`,
        kafe: kupon.cafeAdi,
        baslik,
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
  /*
    Ü141: geçmişte kalmış ve hiç kazınmamış bir kupon buraya düşebiliyor
    — oyuncu kazımadan süresi dolmuşsa. Adı yok ve uydurulmuyor: kart
    ne olduğunu bilmediğimizi söylüyor. `gorselSec` de boş başlıkla
    çağrılıp genel çizime düşüyor, yanlış bir kategori seçmiyor.
  */
  const baslik = kupon.baslik ?? "Açılmamış ödül";
  const r = RENK[GORSEL_RENGI[gorselSec(kupon.baslik ?? "", kupon.tur, kupon.kategoriTuru)]];

  const govde = (
    <>
      <div className="etiket-caps text-yazi-sonuk">{kupon.cafeAdi}</div>
      <div className="mt-1.5 font-display text-[17px] leading-tight font-bold">{baslik}</div>
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
