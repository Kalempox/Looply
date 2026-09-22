import Link from "next/link";
import { notFound } from "next/navigation";
import { defteriOku } from "@/sms/gelistirme-defteri";
import { kodEkrandaGosterilir } from "@/sms";
import { SeviyeKutlamasi } from "@/components/seviye-kutlamasi";
import { Avatar } from "@/components/avatar";
import { RozetKutlamasi } from "@/components/rozet-kutlamasi";
import { withBypass } from "@/db/context";
import { basiliKod } from "@/domain/qr";
import { Yenileyici, TemizleDugmesi } from "./kontroller";

type Masa = { cafeAdi: string; masaAdi: string; kod: string };

/**
 * Masa karekodu kısayolları — veritabanı kapalıysa SESSİZCE boş döner.
 *
 * ── Neden yutuluyor ─────────────────────────────────────────
 *
 * Bu sayfanın asıl işi **kod defteri** ve defter tamamen bellekten
 * çalışıyor; veritabanına hiç ihtiyacı yok. Kısayollar bir kolaylık.
 *
 * Kısayollar madde 38'de ana sayfadan buraya taşınırken sorgu doğrudan
 * sayfanın gövdesine kondu ve sayfa bir anda veritabanına bağımlı hâle
 * geldi: veritabanı kapalıyken **defter de dahil sayfanın tamamı** boş
 * geliyordu. Yani "kod nereye gitti" sorusunun tek cevap yeri, tam da
 * bir şeyler ters gittiğinde ölüyordu.
 *
 * Hata yutmak genelde kötüdür; burada bilerek yapılıyor çünkü kaybedilen
 * şey bir kolaylık, korunan şey teşhis aracının kendisi. Hatanın kendisi
 * zaten sunucu logunda duruyor.
 */
async function masaKisayollari(): Promise<Masa[]> {
  try {
    const satirlar = await withBypass("geliştirme kısayolları", (db) =>
      db.all<{ cafe_adi: string; masa_adi: string; qr_secret: Buffer }>(
        `SELECT c.name AS cafe_adi, t.label AS masa_adi, t.qr_secret
           FROM cafe_tables t JOIN cafes c ON c.id = t.cafe_id
          WHERE c.status = 'approved' AND t.active = true AND t.sort_order < 3
          ORDER BY c.name, t.sort_order`,
      ),
    );
    return satirlar.map((m) => ({
      cafeAdi: m.cafe_adi,
      masaAdi: m.masa_adi,
      kod: basiliKod(m),
    }));
  } catch {
    return [];
  }
}

type Kupon = {
  kod: string;
  baslik: string;
  cafeAdi: string;
  oyuncu: string;
  durum: string;
  /** Aktivasyon saati dolmadıysa kasada "geçersiz" döner (Ü129). */
  bekliyor: boolean;
};

/**
 * Kasada denenecek kuponlar — Ü135.
 *
 * ── Neden bu liste gerekti ──────────────────────────────────
 *
 * Karekod zincirinin iki ucu var ve ikisi de kamerasız denenebiliyordu:
 * kafe karekodu zaten bir adres (yukarıdaki kısayollar), kasa ekranı da
 * **6 haneli kod** kabul ediyor — iOS Safari'de `BarcodeDetector`
 * olmadığı için elle giriş bir yedek değil, birinci sınıf yol.
 *
 * Eksik olan tek şey o kodu **bulmaktı**: oyuncunun telefonunu açıp
 * Ödüllerim → kupon → kodu okumak gerekiyordu. Test ederken bu, akışın
 * en yavaş halkasıydı.
 *
 * ⚠️ **Jeton değil KOD listeleniyor.** Kasa ekranındaki elle giriş alanı
 * `toUpperCase()` uyguluyor; `qr_token` büyük/küçük harfe duyarlı ve
 * oradan geçmiyor. Kamera jetonu okuyor, insan kodu yazıyor — iki ayrı
 * yol ve ikisi de aynı kupona çözülüyor (Ü19).
 *
 * ⚠️ Yalnızca **kullanılabilir** kuponlar: kullanılmış ya da süresi
 * dolmuş bir kuponu kasada denemek "geçersiz" cevabı verir ve test eden
 * kişi bunu bir arıza sanır. Kenar durumları bilerek denemek isteyen
 * zaten veritabanından seçer.
 */
async function denenecekKuponlar(): Promise<Kupon[]> {
  try {
    const satirlar = await withBypass("geliştirme: denenecek kuponlar", (db) =>
      db.all<{
        code: string;
        cafe_adi: string;
        baslik: string | null;
        yuzde: number | null;
        urun_adi: string | null;
        player_id: string;
        status: string;
        activates_at: Date;
      }>(
        `SELECT k.code, c.name AS cafe_adi, r.title AS baslik,
                pc.percent AS yuzde, p.name AS urun_adi,
                k.player_id, k.status, k.activates_at
           FROM coupons k
           JOIN cafes c ON c.id = k.cafe_id
           LEFT JOIN rewards r ON r.id = k.reward_id
           LEFT JOIN percentage_campaigns pc ON pc.id = k.campaign_id
           LEFT JOIN products p ON p.id = pc.product_id
          WHERE k.status = 'active' AND k.expires_at > now()
          ORDER BY k.issued_at DESC
          LIMIT 12`,
      ),
    );

    return satirlar.map((k) => ({
      kod: k.code,
      baslik:
        k.baslik ??
        (k.yuzde != null ? `%${k.yuzde}${k.urun_adi ? ` · ${k.urun_adi}` : ""}` : "Ödül"),
      cafeAdi: k.cafe_adi,
      // Oyuncunun adı ŞİFRELİ ve burada çözülmüyor: test listesi için
      // kimliğin son altı hanesi yeter, kişisel veriyi bir ekrana daha
      // taşımanın gerekçesi yok.
      oyuncu: k.player_id.slice(-6),
      durum: k.status,
      // ⚠️ Karşılaştırma SUNUCUDA: `Date.now()` bileşen gövdesinde
      // çağrılamıyor (React saflık kuralı) ve zaten sunucunun saati
      // doğru olanı — kuponu açan da o.
      bekliyor: k.activates_at.getTime() > Date.now(),
    }));
  } catch {
    return [];
  }
}

export const dynamic = "force-dynamic";
export const metadata = { title: "Geliştirme defteri · Looply" };

/**
 * Geliştirme defteri.
 *
 * Test ederken "kod nereye gitti" sorusunun tek cevap yeri. Giden kodları
 * ve **gönderilmeyenleri sebebiyle birlikte** gösteriyor — kayıtsız numara,
 * dolu kota, kilitli numara, aşılmış günlük tavan.
 *
 * Canlıda bu sayfa yok: `kodEkrandaGosterilir()` iki şart birden arıyor
 * (APP_ENV canlı değil **ve** sahte SMS sağlayıcısı) ve canlıda ikisi
 * birlikte sağlanamıyor. Sağlanmıyorsa sayfa 404 döner.
 */
export default async function GelistirmeDefteri() {
  if (!kodEkrandaGosterilir()) notFound();

  const kayitlar = defteriOku();

  const [masalar, kuponlar] = await Promise.all([
    masaKisayollari(),
    denenecekKuponlar(),
  ]);

  return (
    <main className="min-h-dvh bg-zemin text-yazi">
      <Yenileyici />

      <div className="mx-auto w-full max-w-2xl px-5 py-10">
        <header className="mb-8 border-b border-cizgi pb-5">
          <div className="mb-2 etiket-caps text-odul-koyu">
            Yalnızca geliştirme
          </div>
          <h1 className="font-display text-3xl font-extrabold tracking-tight">
            Geliştirme defteri
          </h1>
          <p className="mt-2 text-[14px] leading-relaxed text-yazi-sonuk">
            Giden doğrulama kodları ve gönderilmeyenler. Sayfa üç saniyede bir
            kendini yeniliyor — açık bırakıp yan sekmede test edebilirsin.
          </p>
        </header>

        {/*
          Kutlama önizlemesi — Ü146.

          Seviye atlama kutlaması yalnızca eşiği geçen turun sonunda bir
          kez görünüyor; onu gözle denemek için XP biriktirip doğru anda
          oynamak gerekiyordu. Kamerasız kupon denemesi (Ü135) hangi
          sebeple buradaysa bu da aynı sebeple burada: **denenemeyen şey
          düzeltilemiyor.**

          ⚠️ Yalnızca görünüm. Buradaki rozet hiçbir deftere bakmıyor,
          gerçek seviyeyi göstermiyor ve hiçbir şey yazmıyor.
        */}
        <section className="mb-8">
          <h2 className="mb-3 etiket-caps text-yazi-sonuk">
            Seviye kutlaması — yalnızca görünüm
          </h2>
          <SeviyeKutlamasi seviye={3} kafeAdi="Kafe A" />
        </section>

        <section className="mb-8">
          <h2 className="mb-3 etiket-caps text-yazi-sonuk">
            Rozet kutlaması — yalnızca görünüm
          </h2>
          <RozetKutlamasi rozetler={["İlk oyun", "Üç gün üst üste"]} />
        </section>

        <section className="mb-8">
          <h2 className="mb-3 etiket-caps text-yazi-sonuk">Loopy — hareketleri</h2>

          {/*
            Tek render var ve yüz değişmiyor: burada görülen şey
            **hareket**. Dördünü yan yana koymak şart, çünkü bir
            hareketin küçük boyda kaybolduğu ancak karşılaştırınca fark
            ediliyor.
          */}
          <div className="rounded-2xl border border-cizgi bg-yuzey px-4 py-5">
            <div className="flex flex-wrap items-end gap-6">
              {(
                [
                  ["sakin", "duruş"],
                  ["keyifli", "okşanınca"],
                  ["mutlu", "sevinince"],
                  ["sasirdi", "şaşırınca"],
                ] as const
              ).map(([i, etiket]) => (
                <div key={i} className="text-center">
                  <Avatar ifade={i} boy={96} />
                  <div className="mt-1 font-data text-[10px] text-yazi-sonuk">
                    {etiket}
                  </div>
                </div>
              ))}
            </div>

            <p className="mt-6 mb-2 etiket-caps text-[10px] text-yazi-sonuk">
              Küçük boy — 28 piksel (listede böyle görünecek)
            </p>
            <Avatar boy={28} />
          </div>
        </section>

        {kayitlar.length === 0 ? (
          <p className="rounded-2xl border border-cizgi bg-cukur px-4 py-10 text-center text-[14px] text-yazi-sonuk">
            Henüz kayıt yok. Bir yerde doğrulama kodu iste, burada görünsün.
          </p>
        ) : (
          <ul className="space-y-2">
            {kayitlar.map((k, i) => (
              <li
                key={`${k.zaman}-${i}`}
                className={`rounded-2xl border bg-yuzey px-4 py-3.5 ${
                  k.kod ? "border-odul" : "border-cizgi opacity-75"
                }`}
              >
                <div className="flex items-center gap-4">
                  <span className="min-w-0 flex-1">
                    <span className="block font-data text-[11px] tracking-wide text-yazi-sonuk">
                      {new Date(k.zaman).toLocaleTimeString("tr-TR")} · {k.telefon}
                    </span>
                    <span className="mt-1 block etiket-caps text-vurgu">
                      {k.nereden}
                    </span>
                    <span className="mt-0.5 block text-[14px]">{k.olay}</span>
                    {k.not && (
                      <span className="mt-0.5 block font-data text-[10px] text-yazi-sonuk">
                        {k.not}
                      </span>
                    )}
                  </span>

                  {k.kod && (
                    <span className="shrink-0 font-data text-2xl font-bold tracking-[0.2em] text-odul-koyu tabular">
                      {k.kod}
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-8 flex items-center justify-between border-t border-cizgi pt-6">
          <TemizleDugmesi />
          <span className="font-data text-[10px] text-yazi-sonuk">
            Bellekte tutulur · sunucu yeniden başlayınca silinir
          </span>
        </div>

        <Kisayollar masalar={masalar} kuponlar={kuponlar} />
      </div>
    </main>
  );
}

/**
 * Test kısayolları — madde 38'de ana sayfadan buraya taşındı.
 *
 * Ana sayfa artık bir vitrin; masa karekodları ve kayıtlı numaralar orada
 * ürünün parçası sanılıyordu. Silinmediler çünkü test ederken gerçekten
 * gerekiyorlar: karekodlar her tohumlamada değişiyor ve elle adres yazmak
 * işkence.
 *
 * Bu sayfanın tamamı canlıda zaten 404 — ayrı bir kapıya gerek yok.
 */
function Kisayollar({ masalar, kuponlar }: { masalar: Masa[]; kuponlar: Kupon[] }) {
  return (
    <section className="mt-12 border-t border-cizgi pt-8">
      <h2 className="mb-4 etiket-caps text-odul-koyu">Kısayollar</h2>

      {masalar.length > 0 && (
        <>
          <p className="mb-2.5 etiket-caps text-yazi-sonuk">Kafe karekodları</p>
          <ul className="mb-6 grid grid-cols-2 gap-2.5">
            {masalar.map((m) => (
              <li key={m.kod}>
                <a
                  href={`/m/${m.kod}`}
                  className="block rounded-2xl border border-cizgi bg-yuzey px-4 py-4 hover:border-vurgu"
                >
                  <span className="block etiket-caps text-yazi-sonuk">
                    {m.cafeAdi}
                  </span>
                  <span className="mt-1 block font-display text-lg font-bold">
                    {m.masaAdi}
                  </span>
                  <span className="etiket-caps mt-1 block text-[10px] text-vurgu">
                    karekodu okut →
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </>
      )}

      {/*
        Ü135: kasada denenecek kuponlar. Karekod zincirinin ikinci ucu.
        Kamera gerekmiyor — kod kasa ekranındaki alana yazılıyor.
      */}
      <p className="mb-2.5 etiket-caps text-yazi-sonuk">
        Kasada denenecek kuponlar
      </p>
      {kuponlar.length === 0 ? (
        <p className="mb-6 rounded-2xl border border-cizgi bg-yuzey px-4 py-4 text-[13px] leading-relaxed text-yazi-sonuk">
          Kullanılabilir kupon yok. Yukarıdaki kafe karekodunu okutup oyna —
          kazandığın kupon burada kodyla birlikte belirir.
        </p>
      ) : (
        <>
          <ul className="mb-3 grid gap-2.5 sm:grid-cols-2">
            {kuponlar.map((k) => (
                <li
                  key={k.kod}
                  className="rounded-2xl border border-cizgi bg-yuzey px-4 py-3.5"
                >
                  <span className="flex items-baseline justify-between gap-3">
                    <span className="min-w-0">
                      <span className="block truncate text-[14px] font-semibold">
                        {k.baslik}
                      </span>
                      <span className="block text-[11px] text-yazi-sonuk">
                        {k.cafeAdi} · oyuncu …{k.oyuncu}
                      </span>
                    </span>
                    <span className="shrink-0 rounded-lg bg-cukur px-2.5 py-1.5 font-data text-[15px] font-bold tracking-widest tabular">
                      {k.kod}
                    </span>
                  </span>
                  {k.bekliyor && (
                    <span className="mt-2 block text-[11px] text-odul-koyu">
                      ⏳ Henüz açılmadı — kasada &ldquo;geçersiz&rdquo; döner.
                      Aktivasyon saati dolmalı.
                    </span>
                  )}
                </li>
            ))}
          </ul>
          <p className="mb-6 text-[12px] leading-relaxed text-yazi-sonuk">
            Kodu <Link href="/kasa" className="underline">kasa ekranındaki</Link> alana
            yaz — kamerayla okutmakla aynı kupona çözülür (Ü19).{" "}
            <strong className="text-yazi">
              Kasa ekranı yalnızca kayıtlı cihazda açılıyor
            </strong>{" "}
            (G11): önce panelden <em>Personel → Bu cihazı kaydet</em>.
          </p>
        </>
      )}

      <div className="rounded-lg border border-cizgi bg-cukur px-4 py-3.5">
        <p className="mb-2.5 etiket-caps text-yazi-sonuk">Kayıtlı numaralar</p>
        <dl className="space-y-1.5 font-data text-[11px]">
          <Numara k="Kafe A yöneticisi" v="0532 000 00 01" />
          <Numara k="Kafe B yöneticisi" v="0532 000 00 02" />
          <Numara k="Platform yöneticisi" v="0531 000 00 01" />
          <Numara k="Platform desteği" v="0531 000 00 02" />
          <Numara k="Kasiyer PIN" v="1234" />
        </dl>
        <p className="mt-3 text-[12px] leading-relaxed text-yazi-sonuk">
          Bunların dışındaki numaralar işletme ve platform ekranlarında{" "}
          <strong className="text-yazi">kayıtsız</strong> sayılır ve kod
          gönderilmez (G27). Oyuncu tarafında her numara kaydolabilir.
        </p>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2.5">
        <Link
          href="/"
          className="rounded-lg border border-cizgi px-4 py-3 text-center etiket-caps text-yazi-sonuk"
        >
          Vitrin
        </Link>
        <a
          href="/cikis"
          className="rounded-lg border border-cizgi px-4 py-3 text-center etiket-caps text-yazi-sonuk"
        >
          Oturumu kapat
        </a>
      </div>
    </section>
  );
}

function Numara({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-yazi-sonuk">{k}</dt>
      <dd className="tabular">{v}</dd>
    </div>
  );
}
