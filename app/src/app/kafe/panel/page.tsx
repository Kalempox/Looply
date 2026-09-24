import Link from "next/link";
import { redirect } from "next/navigation";
import { withCafe } from "@/db/context";
import { kafeYoneticisiGerekli } from "@/domain/yetki";
import * as oturum from "@/domain/session";
import { durum as butceDurumu, saatYaz } from "@/domain/butce";
import * as panel from "@/domain/panel";
import * as rapor from "@/domain/rapor";
import { bugunBeklenen } from "@/domain/beklenen";
import * as upsell from "@/domain/upsell";
import { panelDurumu } from "@/domain/panel-durum";
import { subeler as subeleriBul } from "@/domain/cafe";
import { isletmeTuru } from "@/domain/cark-kosul";
import { PanelKabugu, DurumKartlari } from "./kabuk";
import { SaatFormu } from "./butce/kontroller";
import { isGunu, gunEkle, gunYaz } from "@/lib/tarih";
import { SayiKarti, IKON, type Alan } from "@/components/gosterge";
import {
  IsletmeSayfa,
  IsletmeBaslik,
  Bolum,
  Rozet,
  IsletmeUyari,
} from "@/components/isletme";

export const dynamic = "force-dynamic";
export const metadata = { title: "İşletme paneli · Looply" };

/**
 * Kafe paneli.
 *
 * ── Neden liste değil kart ──────────────────────────────────
 *
 * Önceki hâli her şeyi satır satır yazıyordu ve dokuz satırın dokuzunda da
 * yeşil "açık" rozeti vardı: eksik olan iki madde o yeşilliğin arasında
 * kayboluyordu. Panel okunacak bir belge değil, **bakılacak bir gösterge** —
 * kafe sahibinin ilk sorusu "bugün ne durumdayım".
 *
 * Şimdi eksik olan kendini kırmızı kenarla gösteriyor, tamam olan sessiz
 * kalıyor. Bütçe tek bakışta okunan bir çubuğa dönüştü.
 *
 * Her sorgu `withCafe` bağlamından geçiyor; `cafe_id` oturumdan geliyor ve
 * satırları RLS süzüyor.
 */
export default async function KafePaneli({
  searchParams,
}: {
  searchParams: Promise<{ gun?: string }>;
}) {
  const sp = await searchParams;
  const o = await kafeYoneticisiGerekli();

  /**
   * 🔴 Butikte oyun yok (Ü137) — kurulum listesi de bunu bilmeli.
   *
   * Kenar çubuğu `panel/duraklar.ts`ten süzülüyor; buradaki kartlar ayrı
   * yazıldığı için aynı süzgeci kendileri uygulamak zorunda.
   */
  const turu = await isletmeTuru(o.cafeId);

  const veri = await withCafe(o.cafeId, async (db) => {
    // Dikkat: sorgularda cafe_id süzgeci YOK. Satırları RLS süzüyor.
    const kafe = await db.one<{
      name: string;
      city: string | null;
      slug: string;
      lat: number | null;
      lng: number | null;
    }>(`SELECT name, city, slug, lat, lng FROM cafes`);
    const masa = await db.one<{ n: string }>(
      `SELECT count(*) AS n FROM cafe_tables`,
    );
    const personel = await db.one<{ n: string }>(
      `SELECT count(*) AS n FROM staff WHERE active = true`,
    );
    // Ü285: cihaz kaydı kalktı; kasa için sayılan şey kasiyer.
    const kasiyer = await db.one<{ n: string }>(
      `SELECT count(*) AS n FROM staff WHERE active = true AND role = 'cashier'`,
    );
    return {
      kafe,
      konumVar: kafe?.lat != null && kafe?.lng != null,
      masa: Number(masa?.n ?? 0),
      personel: Number(personel?.n ?? 0),
      kasiyer: Number(kasiyer?.n ?? 0),
    };
  });

  /**
   * Ü99: panelin baş bölümü üç dönemi birden okuyor.
   *
   * ⚠️ Yeni SQL yazılmadı — `rapor.ozet` bu sayıları zaten hesaplıyor ve
   * **kişi bazlı** "yeni müşteri" tanımı da onun içinde (bu kafede daha
   * önce hiç oynamamış oyuncu). Panelde ayrı bir hesap kursaydık iki
   * ekran aynı soruya iki farklı cevap verirdi.
   */
  /**
   * Hangi güne bakıyoruz? (Ü101)
   *
   * ⚠️ **Gelecek gün seçilemiyor.** Adres çubuğuna yarının tarihi
   * yazılabilirdi ve panel boş sayılarla "yarın hiç müşteri gelmedi" der
   * gibi görünürdü. İleri düğmesi de bugünde kapanıyor.
   *
   * ⚠️ Biçim doğrulanıyor: `gun` istemciden geliyor ve doğrudan SQL
   * parametresine giriyor. Parametreli sorgu enjeksiyonu zaten kapatıyor
   * ama bozuk bir metin sorguyu hataya düşürür; süzgeç önce burada.
   */
  const bugun = isGunu();
  const istenen = /^\d{4}-\d{2}-\d{2}$/.test(sp.gun ?? "") ? sp.gun! : bugun;
  const gun = istenen > bugun ? bugun : istenen;
  const buGun = gun === bugun;
  const buAyBasi = `${gun.slice(0, 7)}-01`;
  const [butce, gosterge, bugunku, son7, buAy, beklenen, huni, durum, subeListesi] =
    await Promise.all([
    butceDurumu(o.cafeId),
    panel.ozet(o.cafeId, gun),
    rapor.ozet(o.cafeId, { baslangic: gun, bitis: gunEkle(gun, 1) }),
    rapor.ozet(o.cafeId, { baslangic: gunEkle(gun, -6), bitis: gunEkle(gun, 1) }),
    rapor.ozet(o.cafeId, { baslangic: buAyBasi, bitis: gunEkle(gun, 1) }),
    bugunBeklenen(o.cafeId),
    upsell.huni(o.cafeId, { baslangic: gunEkle(gun, -6), bitis: gunEkle(gun, 1) }),
    panelDurumu(o.cafeId),
    subeleriBul(o.ozneId),
  ]);

  return (
    <IsletmeSayfa genis>
      {/* Ü101: şube seçici + uyarı çanı. Görselin üst şeridi. */}
      <PanelKabugu
        kafeAdi={veri.kafe?.name ?? "İşletme"}
        sehir={veri.kafe?.city ?? null}
        subeler={subeListesi.map((x) => ({ cafeId: x.cafeId, kafeAdi: x.kafeAdi }))}
        aktifCafeId={o.cafeId}
        durum={durum}
        gun={gun}
        bugun={bugun}
      />

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

      {/* ── Çalışma saatleri (Ü288) ──────────────────────
          Ürün sahibi: *"kafenin açılış saati panel kısmında olmalı, bu temel
          bir şey — ben zor buluyorum, müşteri hiç bulamaz."* Bütçe sayfasının
          dibindeydi. Ödül ve bütçe yalnızca bu saatlerde dağıtılıyor (Ü90),
          yani yanlış saat "kupon neden çıkmıyor"un en sık sebebi. */}
      <section
        id="calisma-saatleri"
        className="mb-8 scroll-mt-6 rounded-2xl border border-cizgi bg-yuzey p-5"
      >
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-[16px] font-semibold">Çalışma saatlerin</h2>
          <span className="font-data text-[18px] font-bold tabular">
            {saatYaz(butce.pencere.baslangic)}–{saatYaz(butce.pencere.bitis)}
          </span>
        </div>
        <p className="mt-1 mb-4 text-[13px] text-yazi-sonuk">
          Ödül ve bütçe yalnızca bu saatlerde dağıtılır; kapanıştan sonra son masanın oyununu
          bitirmesi için yarım saat açık kalır.
        </p>
        <div className="max-w-md">
          <SaatFormu acilis={butce.pencere.baslangic} kapanis={butce.pencere.bitis} />
        </div>
      </section>

      {/* ── Bugünün özeti (Ü99) ──────────────────────────
          Kafe sahibinin ekranı açtığında sorduğu beş soru, beş kart:
          kaç kişi oynadı · kaç kupon kullanıldı · ne kadar indirim
          verdim · kaç yeni müşteri kazandım · bugün kaç kişi bekleniyor.
          Altındaki eski dört kart bunların günlük değişimini taşıyor. */}
      <section className="mb-4">
        <h2 className="etiket-caps mb-3 text-yazi-sonuk">
          {buGun ? "Bugünün özeti" : `${gunYaz(gun)} özeti`}
        </h2>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          <SayiKarti
            etiket={buGun ? "Bugün oynayan" : "Oynayan"}
            deger={String(bugunku.tekilOyuncu)}
            alt="benzersiz kişi"
            ikon={IKON.kisi}
            alan="kisi"
          />
          {/* Ü289: ürün sahibi "dağıtılan ve kullanılan kupon tutarları
              yazmalı — dağıtılan yazmıyor" dedi. Önce "Kullanılan kupon"
              (adet) ve "Verilen indirim" (kasada ödenen TL) vardı; dağıtılan
              hiç yoktu ve "verilen" kelimesi dağıtılan gibi okunuyordu.
              Kullanılan kart düne göre değişimi de taşıyor (`panel.ozet`
              onu günlük ölçüyor); dağıtılanın günlük serisi yok. */}
          <SayiKarti
            etiket="Dağıtılan kupon"
            deger={`${tlYaz(bugunku.kazanilanIndirimKurus)} TL`}
            alt={`${bugunku.kuponVerilen} kupon · bütçeden bağlanan`}
            ikon={IKON.kupon}
            alan="odul"
            yol="/kafe/panel/butce"
          />
          <SayiKarti
            etiket="Kullanılan kupon"
            deger={`${tlYaz(bugunku.kullanilanIndirimKurus)} TL`}
            alt={`${bugunku.kuponKullanilan} kupon · kasada ödenen`}
            degisim={gosterge.kullanilanKurus.degisim}
            seri={gosterge.kullanilanKurus.seri}
            ikon={IKON.para}
            alan="para"
            vurgulu
            yol="/kafe/panel/rapor"
          />
          {/* ⚠️ Ü30: küçük sayılarda kişi işaret edilebiliyor; rapor o
              durumda null dönüyor ve panel de saklıyor. */}
          <SayiKarti
            etiket="Yeni müşteri"
            deger={bugunku.yeniOyuncu === null ? "—" : String(bugunku.yeniOyuncu)}
            alt={
              bugunku.yeniOyuncu === null
                ? "sayı gizlendi — çok az kişi"
                : "bu kafede ilk kez"
            }
            ikon={IKON.kisi}
            alan="kisi"
          />
          {/* ⚠️ Beklenen müşteri bir TAHMİN ve yalnızca bugün için
              anlamlı. Geçmiş günde tahmin göstermek, olmuş bir şeyi
              tahmin ediyormuş gibi yapmak olurdu; orada gerçekleşen
              sayı duruyor. */}
          {buGun ? (
            <BeklenenKarti beklenen={beklenen} />
          ) : (
            <SayiKarti
              etiket="O gün gelen"
              deger={String(bugunku.kuponKullanilan)}
              alt="kupon kullanan"
              ikon={IKON.kupon}
              alan="odul"
            />
          )}
        </div>
      </section>

      {/* Ü101: durum ve öneri kartları — özetin hemen altında, çünkü
          sayılara bakan gözün bir sonraki sorusu "peki ne yapmalıyım". */}
      <section className="mb-9">
        <DurumKartlari durum={durum} />
      </section>

      {/* ── Upsell hunisi (Ü100) ─────────────────────────
          Ürün sahibinin sorusu üzerine tanımı netleşti: müşteri masada
          otururken ikinci ürünü sattırmak. Huni bunun kaç adımda
          kaybettiğini gösteriyor. */}
      {huni.length > 0 && (
        <section className="mb-9">
          <h2 className="etiket-caps mb-3 text-yazi-sonuk">Upsell · son 7 gün</h2>
          <div className="grid gap-3">
            {huni.map((h) => (
              <UpsellHunisi key={h.kampanyaId} satir={h} />
            ))}
          </div>
        </section>
      )}

      {/* ── Dönem tabloları (Ü99) ────────────────────────
          Grafik haftanın şeklini veriyor; tablo sayıyı veriyor. İkisi
          farklı soruya cevap: "nasıl gidiyor" ve "tam olarak kaç". */}
      <section className="mb-9 grid gap-3 lg:grid-cols-2">
        <DonemTablosu baslik="Son 7 gün" ozet={son7} />
        <DonemTablosu baslik="Bu ay" ozet={buAy} />
      </section>

      <section className="mb-9">
        <YediGunGrafigi gunler={gosterge.sonYedi} />
      </section>

      <section className="mb-9 grid gap-3 sm:grid-cols-2">
        <ButceKarti butce={butce} />
        {/* Ü127: "Masa" sayacı kalktı — masa kavramı yok, kafenin tek
            karekodu var ve bir sayıya indirgenecek bir şey kalmadı.
            Kurulum eksikse ana ekrandaki uyarı zaten çıkıyor. */}
        <div className="grid grid-cols-2 gap-3">
          <KucukKart
            etiket="Personel"
            deger={veri.personel}
            yol="/kafe/panel/personel"
          />
          <KucukKart
            etiket="Kasiyer"
            deger={veri.kasiyer}
            yol="/kafe/panel/personel"
          />
        </div>
      </section>

      <Bolum baslik="Kurulum ve yönetim">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Kart
            baslik="Kafe konumu"
            aciklama="Oyuncunun ve kasanın kafede olduğunu doğrulamanın tek yolu"
            yol="/kafe/panel/konum"
            eksik={!veri.konumVar}
            ikon="konum"
            alan="masa"
          />
          <Kart
            baslik="Günlük bütçe"
            aciklama="En az 1.500 TL — kullanılmayan kuponun maliyeti yok"
            yol="/kafe/panel/butce"
            eksik={!butce.donem}
            ikon="butce"
            alan="para"
          />
          {/*
            İki ayrı kart, tek kart değil. Bir süre "Ödüller ve kampanyalar"
            diye birleşiklerdi ve kafe sahibi hangisinin ne olduğunu
            karıştırıyordu — ayrı tablolar, ayrı mekanizmalar (Ü26).
            Açıklamalar mekanizmayı söylüyor: biri puan istiyor, öbürü
            istemiyor. Farkın uzun hâli iki sayfanın da başında
            (`fark-notu.tsx`).
          */}
          <Kart
            baslik="Ödüller"
            aciklama="Oyun sonunda ve şans çarkında oyuncunun kazandığı şey"
            yol="/kafe/panel/oduller"
            ikon="odul"
            alan="odul"
          />
          <Kart
            baslik="Kampanyalar"
            aciklama="Öne çıkarmak istediğin ürüne bağlı yüzde indirimi — puan istemez"
            yol="/kafe/panel/kampanyalar"
            ikon="kampanya"
            alan="kampanya"
          />
          <Kart
            baslik="Ürünler"
            aciklama="Menün — ödüllerin ve kampanyaların dayanağı"
            yol="/kafe/panel/urunler"
            ikon="urun"
            alan="urun"
          />
          <Kart
            baslik="Karekod"
            aciklama="Kafenin tek karekodu — bastır, görünür bir yere as"
            yol="/kafe/panel/karekod"
            ikon="karekod"
            alan="masa"
          />
          {/*
            🔴 Oyunlar ve Şubeler buraya SONRADAN eklendi.

            İkisi de kenar çubuğunda vardı, alt şeritte yoktu ve bu listede
            de yoktu — yani **telefondan hiçbir yoldan açılamıyorlardı.**
            Gezinmenin kendi yorumu "telefondan ana ekrandaki kurulum
            listesinden gidiliyor" diyordu; bu iki durak için doğru değildi.
            Ü125'in şube açma yolu tam bu yüzden kurulmuştu ve telefondan
            kimse ona ulaşamıyordu.
          */}
          {turu === "kafe" && (
            <Kart
              baslik="Oyunlar"
              aciklama="Hangi oyunlar müşterine açık — kapattığın katalogdan kalkar"
              yol="/kafe/panel/oyunlar"
              ikon="oyun"
              alan="masa"
            />
          )}
          <Kart
            baslik="Personel ve PIN"
            aciklama="Kasiyer hesabı aç, PIN ver — kasa yalnızca kafenin içinde açılır"
            yol="/kafe/panel/personel"
            ikon="personel"
            alan="kisi"
          />
          <Kart
            baslik="Şubeler"
            aciklama="İkinci şube aç — başvurun onaylanınca şube seçici çıkıyor"
            yol="/kafe/panel/subeler"
            ikon="sube"
            alan="genel"
          />
          <Kart
            baslik="Happy Hour"
            aciklama="Boş saatine görünür bir TL havuzu ayır"
            yol="/kafe/panel/happy-hour"
            ikon="saat"
            alan="kampanya"
          />
          <Kart
            baslik="Rapor"
            aciklama="Gelen müşteri, tekrar gelen, kullanılan indirim, dolu saatler"
            yol="/kafe/panel/rapor"
            ikon="rapor"
            alan="genel"
          />
        </div>
      </Bolum>

      {/* Bilgisayarda çıkış kenar çubuğunun altında duruyor; burada
          tekrar etmesi gereksiz. Telefonda kenar çubuğu yok, o yüzden
          bu satır orada kalıyor. */}
      <nav className="mt-10 flex items-center gap-5 border-t border-cizgi pt-6 text-[14px] lg:hidden">
        <form action={cikisYap}>
          <button type="submit" className="text-yazi-sonuk underline">
            Çıkış yap
          </button>
        </form>
      </nav>
    </IsletmeSayfa>
  );
}


/**
 * Son yedi günün ziyaret grafiği.
 *
 * ── Neden çubuk, neden yedi ─────────────────────────────────
 *
 * Kafe sahibinin panelde sorduğu ikinci soru: *"bu hafta nasıl gidiyor?"*
 * Tek sayı bunu söylemiyor, tam rapor ise fazla. Yedi çubuk, haftanın
 * şeklini bir bakışta veriyor ve bugünü ayrı renkle işaretliyor.
 *
 * Boş günler de çiziliyor: eksik sütun, o günü hiç olmamış gibi gösterip
 * grafiği yanıltırdı.
 */
function YediGunGrafigi({
  gunler,
}: {
  gunler: { gun: string; ziyaret: number }[];
}) {
  const enYuksek = Math.max(1, ...gunler.map((g) => g.ziyaret));
  const toplam = gunler.reduce((t, g) => t + g.ziyaret, 0);

  return (
    <div className="rounded-2xl border border-cizgi bg-yuzey px-5 py-5">
      <div className="flex items-baseline justify-between">
        <span className="etiket-caps text-yazi-sonuk">Son 7 gün</span>
        <span className="font-data text-[13px] tabular">
          <strong className="text-[15px]">{toplam}</strong>{" "}
          <span className="text-yazi-sonuk">ziyaret</span>
        </span>
      </div>

      {/*
        Çubuğun yüzde yüksekliği, yüksekliği ÇÖZÜLMÜŞ bir kapsayıcı ister.
        Bir tur çubuklar hiç görünmedi: sütun `flex-col` idi ve yüksekliği
        içeriğinden geliyordu, yani `height: 60%` sıfıra çözülüyordu.
        Aradaki `flex-1` kutu bu yüzden var — ölçüyü o veriyor.
      */}
      <div className="mt-4 flex h-28 gap-1.5">
        {gunler.map((g, i) => {
          const bugunMu = i === gunler.length - 1;
          return (
            <div
              key={g.gun}
              className="flex flex-1 flex-col items-center gap-1.5"
            >
              <span className="font-data text-[10px] text-yazi-sonuk tabular">
                {g.ziyaret > 0 ? g.ziyaret : ""}
              </span>
              <span className="flex w-full flex-1 items-end">
                <span
                  className={`w-full rounded-t-sm ${bugunMu ? "bg-vurgu" : "bg-cukur"}`}
                  style={{
                    height: `${Math.max(4, (g.ziyaret / enYuksek) * 100)}%`,
                  }}
                />
              </span>
              <span className="etiket-caps text-[9px] text-yazi-sonuk">
                {gunAdi(g.gun)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Grafik ekseni için kısa gün adı — "Pzt", "Sal"… */
function gunAdi(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("tr-TR", {
    weekday: "short",
    timeZone: "UTC",
  });
}

function tlYaz(kurus: number): string {
  return (kurus / 100).toLocaleString("tr-TR", { maximumFractionDigits: 0 });
}

/**
 * Bütçe kartı — panelin en çok bakılan sayısı.
 *
 * Çubuk üç değeri tek bakışta veriyor: kasada harcanan, açık kuponlarda
 * bağlı olan, kalan. Sayıları okumadan da "bugün ne kadar yerim var"
 * sorusu cevaplanıyor.
 */
function ButceKarti({
  butce,
}: {
  butce: Awaited<ReturnType<typeof butceDurumu>>;
}) {
  if (!butce.donem) {
    return (
      <Link
        href="/kafe/panel/butce"
        className="flex flex-col justify-between rounded-2xl border-2 border-tehlike/70 bg-yuzey p-5 transition-colors hover:bg-cukur"
      >
        <div className="etiket-caps text-tehlike">Bugünün bütçesi yok</div>
        <div className="mt-3 text-[14px] leading-relaxed text-yazi-sonuk">
          Bütçe belirlenmeden hiçbir ödül dağıtılamaz.
        </div>
        <div className="mt-3 etiket-caps text-vurgu">Bütçeyi belirle →</div>
      </Link>
    );
  }

  const taahhut = butce.donem.taahhutKurus;
  const oran = (k: number) =>
    taahhut > 0 ? Math.min(100, Math.round((k / taahhut) * 100)) : 0;

  return (
    <Link
      href="/kafe/panel/butce"
      className="rounded-2xl border border-cizgi bg-yuzey p-5 transition-colors hover:bg-cukur"
    >
      <div className="flex items-baseline justify-between">
        <span className="etiket-caps text-yazi-sonuk">Bugün dağıtılabilir</span>
        <span className="font-data text-[11px] text-yazi-sonuk tabular">
          {tlYaz(taahhut)} TL taahhüt
        </span>
      </div>

      <div className="mt-2 font-data text-4xl leading-none font-bold tabular">
        {tlYaz(butce.dagitilabilirKurus)}
        <span className="ml-1 text-[14px] font-normal text-yazi-sonuk">TL</span>
      </div>

      <div className="mt-4 flex h-2 overflow-hidden rounded-full bg-cukur">
        <span
          className="bg-vurgu"
          style={{ width: `${oran(butce.harcananKurus)}%` }}
        />
        <span
          className="bg-odul"
          style={{ width: `${oran(butce.rezerveKurus)}%` }}
        />
      </div>

      <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1 font-data text-[11px] text-yazi-sonuk tabular">
        <span>
          <span className="mr-1 inline-block size-2 rounded-full bg-vurgu align-middle" />
          {tlYaz(butce.harcananKurus)} TL kasada
        </span>
        <span>
          <span className="mr-1 inline-block size-2 rounded-full bg-odul align-middle" />
          {tlYaz(butce.rezerveKurus)} TL açık kuponlarda
        </span>
      </div>
    </Link>
  );
}

function KucukKart({
  etiket,
  deger,
  yol,
  eksik,
}: {
  etiket: string;
  deger: number;
  yol: string;
  eksik?: boolean;
}) {
  return (
    <Link
      href={yol}
      className={`flex flex-col justify-between rounded-2xl border bg-yuzey p-4 transition-colors hover:bg-cukur ${
        eksik ? "border-tehlike/60" : "border-cizgi"
      }`}
    >
      <span className="etiket-caps text-[10px] text-yazi-sonuk">{etiket}</span>
      <span
        className={`mt-3 font-data text-2xl leading-none font-bold tabular ${
          eksik ? "text-tehlike" : ""
        }`}
      >
        {deger}
      </span>
    </Link>
  );
}

/**
 * Kurulum kartı.
 *
 * Eksik olan kırmızı kenarla kendini gösteriyor; tamam olan sessiz kalıyor.
 * Önceki hâli her satıra yeşil "açık" rozeti koyuyordu ve iki kırmızı, yedi
 * yeşilin arasında kayboluyordu.
 */
/**
 * Kurulum kartı — Ü63.
 *
 * ── Renk neden alandan geliyor ──────────────────────────────
 *
 * Sekiz kartın sekizi de gri ikon kutusuyla duruyordu ve ürün sahibi
 * "çok basit" dedi. Doğru teşhis: kutular birbirinden ayrılmıyordu, göz
 * sekiz kez aynı şeyi okuyup başlığa inmek zorunda kalıyordu.
 *
 * Artık her kart kendi alanının renginde (Ü63): bütçe yeşil, masa sarı,
 * ürün turuncu, personel turkuaz, ödül altın, kampanya mor. Renk süs
 * değil — kafe sahibi ikinci gelişinde başlığı okumadan gideceği kartı
 * buluyor.
 *
 * ── Üstüne gelince ──────────────────────────────────────────
 *
 * Çerçeve alanın rengine dönüyor ve ikon kutusu koyulaşıyor. Gri
 * çerçeve "tıklanabilir" diyordu ama "neye tıklıyorsun" demiyordu.
 *
 * ── Eksik olan rengini kaybediyor ───────────────────────────
 *
 * Eksik kart kırmızıya dönüyor ve alan rengini bırakıyor: o an
 * söylenmesi gereken tek şey eksikliğin kendisi.
 */
function Kart({
  baslik,
  aciklama,
  yol,
  eksik,
  ikon,
  alan,
}: {
  baslik: string;
  aciklama: string;
  yol: string;
  eksik?: boolean;
  ikon: keyof typeof IKONLAR;
  alan: Alan;
}) {
  const renk = KART_RENGI[alan];

  return (
    <Link
      href={yol}
      className={`group flex flex-col rounded-2xl border bg-yuzey p-4 transition-all hover:-translate-y-0.5 hover:shadow-md ${
        eksik ? "border-tehlike/60" : `border-cizgi ${renk.kenar}`
      }`}
    >
      <span className="flex items-start justify-between gap-2">
        <span
          className={`flex size-9 shrink-0 items-center justify-center rounded-xl transition-colors ${
            eksik ? "bg-tehlike/10 text-tehlike" : renk.kutu
          }`}
        >
          {IKONLAR[ikon]}
        </span>
        {eksik ? (
          <Rozet tur="red">eksik</Rozet>
        ) : (
          <span
            aria-hidden
            className={`text-[15px] text-yazi-sonuk/35 transition-colors ${renk.ok}`}
          >
            →
          </span>
        )}
      </span>

      <span className="mt-3 block text-[15px] leading-tight font-semibold">
        {baslik}
      </span>
      <span className="mt-1.5 block text-[13px] leading-relaxed text-yazi-sonuk">
        {aciklama}
      </span>
    </Link>
  );
}

/**
 * Kurulum kartının alan renkleri.
 *
 * Tailwind sınıfları **tam yazılmak zorunda**: `hover:border-${x}` gibi
 * bir birleştirme derleme sırasında taranamıyor ve sınıf üretilmiyor.
 * Bu yüzden harita, kısaltma değil.
 */
const KART_RENGI: Record<Alan, { kutu: string; kenar: string; ok: string }> = {
  genel: {
    kutu: "bg-vurgu-zemin text-vurgu",
    kenar: "hover:border-vurgu",
    ok: "group-hover:text-vurgu",
  },
  para: {
    kutu: "bg-para-zemin text-para",
    kenar: "hover:border-para",
    ok: "group-hover:text-para",
  },
  masa: {
    kutu: "bg-masa-zemin text-masa",
    kenar: "hover:border-masa",
    ok: "group-hover:text-masa",
  },
  urun: {
    kutu: "bg-urun-zemin text-urun",
    kenar: "hover:border-urun",
    ok: "group-hover:text-urun",
  },
  kisi: {
    kutu: "bg-kisi-zemin text-kisi",
    kenar: "hover:border-kisi",
    ok: "group-hover:text-kisi",
  },
  odul: {
    kutu: "bg-odul-zemin text-odul-koyu",
    kenar: "hover:border-odul",
    ok: "group-hover:text-odul-koyu",
  },
  kampanya: {
    kutu: "bg-kampanya-zemin text-kampanya",
    kenar: "hover:border-kampanya",
    ok: "group-hover:text-kampanya",
  },
};

/* Satır içi SVG — işletme tarafında emoji yok (Ü31) ve dış kaynak da yok. */
const cizgi = {
  width: 19,
  height: 19,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

const IKONLAR = {
  konum: (
    <svg {...cizgi} aria-hidden>
      <path d="M12 21s7-5.5 7-11a7 7 0 1 0-14 0c0 5.5 7 11 7 11Z" />
      <circle cx="12" cy="10" r="2.6" />
    </svg>
  ),
  butce: (
    <svg {...cizgi} aria-hidden>
      <rect x="2.5" y="6" width="19" height="13" rx="2" />
      <path d="M2.5 10.5h19" />
    </svg>
  ),
  odul: (
    <svg {...cizgi} aria-hidden>
      <path d="M4 9h16v11a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V9Z" />
      <path d="M3 5.5h18V9H3zM12 5.5V21" />
    </svg>
  ),
  /** Kampanya — yüzde işareti; ödülün hediye kutusundan bakışta ayrılsın. */
  kampanya: (
    <svg {...cizgi} aria-hidden>
      <path d="M18.5 5.5 5.5 18.5" />
      <circle cx="8" cy="8" r="2.3" />
      <circle cx="16" cy="16" r="2.3" />
    </svg>
  ),
  urun: (
    <svg {...cizgi} aria-hidden>
      <path d="M6 8h10v6a5 5 0 0 1-10 0V8Z" />
      <path d="M16 9h1.5a2.5 2.5 0 0 1 0 5H16" />
      <path d="M4 21h14" />
    </svg>
  ),
  karekod: (
    <svg {...cizgi} aria-hidden>
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <path d="M14 14h3v3h-3zM20 14v3M14 20h6" />
    </svg>
  ),
  personel: (
    <svg {...cizgi} aria-hidden>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3 20a6 6 0 0 1 12 0" />
      <path d="M16 11a3 3 0 1 0 0-6M18 20a6 6 0 0 0-3-5.2" />
    </svg>
  ),
  saat: (
    <svg {...cizgi} aria-hidden>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </svg>
  ),
  rapor: (
    <svg {...cizgi} aria-hidden>
      <path d="M3 21h18" />
      <rect x="5" y="12" width="4" height="7" rx="1" />
      <rect x="10" y="7" width="4" height="12" rx="1" />
      <rect x="15" y="14" width="4" height="5" rx="1" />
    </svg>
  ),
  /** Oyun — kumanda kolu; kenar çubuğundaki ikonun aynısı (Ü109). */
  oyun: (
    <svg {...cizgi} aria-hidden>
      <rect x="2" y="7" width="20" height="11" rx="4" />
      <path d="M7 11v3M5.5 12.5h3M15.5 11.5h.01M18 13.5h.01" />
    </svg>
  ),
  /** Şube — iki bina yan yana; kenar çubuğundakiyle aynı (Ü125). */
  sube: (
    <svg {...cizgi} aria-hidden>
      <path d="M3 21V8.5L8.5 5 14 8.5V21" />
      <path d="M14 12.5 19.5 9.5 21 10.5V21" />
      <path d="M2 21h20M7 13h3.5M7 17h3.5" />
    </svg>
  ),
} as const;

async function cikisYap() {
  "use server";
  await oturum.kapat("kullanici_cikisi");
  redirect("/kafe/giris");
}

/**
 * Beklenen müşteri kartı (Ü99).
 *
 * ⚠️ **Kesin sayı yazmıyor, aralık yazıyor.** Kesin sayı yazan bir panel,
 * ilk yanlış tahminde işletmecinin panele güvenmeyi bırakmasına yol açar.
 * Tahmin gerçekte bir bant ve o bandı gizlemiyoruz.
 *
 * ⚠️ Veri yetmiyorsa **tahmin üretilmiyor**. "Henüz söyleyemiyoruz" demek,
 * uydurulmuş bir sayı göstermekten dürüst — panelin bütün değeri
 * güvenilirliğinde.
 */
function BeklenenKarti({ beklenen }: { beklenen: Awaited<ReturnType<typeof bugunBeklenen>> }) {
  if (!beklenen.yeterliVeri) {
    return (
      <SayiKarti
        etiket="Bugün beklenen"
        deger="—"
        alt={`${beklenen.eksikGun} gün daha veri gerekiyor`}
        ikon={IKON.kupon}
        alan="odul"
      />
    );
  }

  return (
    <SayiKarti
      etiket="Bugün beklenen"
      deger={beklenen.alt === beklenen.ust ? String(beklenen.ust) : `${beklenen.alt}–${beklenen.ust}`}
      alt={`${beklenen.gerceklesen} geldi · ${beklenen.acikKupon} açık kupon`}
      ikon={IKON.kupon}
      alan="odul"
    />
  );
}

/**
 * Dönem tablosu (Ü99).
 *
 * ⚠️ Grafik "nasıl gidiyor" sorusuna, tablo "tam olarak kaç" sorusuna
 * cevap veriyor. İkisi de duruyor çünkü ikisi farklı an: vardiya arasında
 * grafiğe bakılıyor, ay sonu hesabında tabloya.
 *
 * ⚠️ **Ek satış satırı YOK.** Görselde "840 TL ek satış geliri" yazıyor ama
 * POS'umuz olmadığı için bir müşterinin ne satın aldığını bilemiyoruz;
 * yazsaydık uydurmuş olurduk. Ölçebildiğimiz kupon kullanımı ve onun
 * tuttuğu tutar — ikisi de burada.
 */
function DonemTablosu({ baslik, ozet }: { baslik: string; ozet: rapor.RaporOzeti }) {
  const satirlar: { etiket: string; deger: string }[] = [
    { etiket: "Oynayan kişi", deger: ozet.tekilOyuncu.toLocaleString("tr-TR") },
    /**
     * ⚠️ Ü29: adı "oyuncu" olan ama **ziyaret** sayan ölçü — fatura bundan
     * kesiliyor. Panelin üst kartlarından çıkarıldı çünkü "bugün gelen 0"
     * ile "bugün oynayan 5" yan yana durunca ekran kendisiyle çelişiyor
     * görünüyordu; tanımı yazılabilecek tek yer burası.
     */
    { etiket: "Sayılan ziyaret", deger: ozet.nitelikliOyuncu.toLocaleString("tr-TR") },
    { etiket: "Oynanan oyun", deger: ozet.toplamOyun.toLocaleString("tr-TR") },
    { etiket: "Verilen kupon", deger: ozet.kuponVerilen.toLocaleString("tr-TR") },
    { etiket: "Kullanılan kupon", deger: ozet.kuponKullanilan.toLocaleString("tr-TR") },
    { etiket: "Verilen indirim", deger: `${tlYaz(ozet.kullanilanIndirimKurus)} TL` },
    {
      etiket: "Yeni müşteri",
      deger: ozet.yeniOyuncu === null ? "—" : ozet.yeniOyuncu.toLocaleString("tr-TR"),
    },
    {
      etiket: "Tekrar gelen",
      deger: ozet.tekrarGelenOyuncu === null ? "—" : ozet.tekrarGelenOyuncu.toLocaleString("tr-TR"),
    },
  ];

  return (
    <div className="rounded-2xl border border-cizgi bg-yuzey px-5 py-5">
      <div className="flex items-baseline justify-between gap-3">
        <span className="etiket-caps text-yazi-sonuk">{baslik}</span>
        <Link href="/kafe/panel/rapor" className="font-data text-[11px] text-yazi-sonuk underline">
          Detaylı rapor
        </Link>
      </div>
      <table className="mt-3 w-full text-[13px]">
        <tbody>
          {satirlar.map((r) => (
            <tr key={r.etiket} className="border-t border-cizgi">
              <td className="py-2 pr-2 leading-tight text-yazi-sonuk">{r.etiket}</td>
              <td className="py-2 text-right font-data font-bold tabular">{r.deger}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {/* Ü30: küçük sayılarda kişi işaret edilebiliyor. */}
      {ozet.yeniOyuncu === null && (
        <p className="mt-2.5 text-[12px] leading-relaxed text-yazi-sonuk">
          Müşteri sayıları çok az olduğunda gizleniyor — tek bir kişiyi işaret
          etmesin diye.
        </p>
      )}
    </div>
  );
}

/**
 * Upsell hunisi (Ü100).
 *
 * ⚠️ **Son basamak "kullanıldı", "satıldı" değil.** Panel görselinde
 * huninin altında *"840 TL ek satış geliri"* yazıyor; POS'umuz olmadığı
 * için bunu yazamayız. Kupon kasada onaylandığında bildiğimiz şey
 * "cheesecake kuponu kullanıldı" — "cheesecake satıldı ve şu kadar gelir
 * oldu" değil. İkisi kulağa aynı geliyor ama biri ölçüm, öbürü tahmin;
 * tahmini kesin gibi yazan panel ilk tutmayan sayıda güvenini kaybeder.
 *
 * Gösterilen tutar bu yüzden **verilen indirim**: kafenin cebinden çıkan,
 * gerçekten ölçtüğümüz sayı.
 */
function UpsellHunisi({ satir }: { satir: upsell.HuniSatiri }) {
  const basamaklar = [
    { etiket: "Teklif gösterildi", sayi: satir.gosterildi },
    { etiket: "Kuponu aldı", sayi: satir.alindi },
    { etiket: "Kasada kullandı", sayi: satir.kullanildi },
  ];
  const donusum = satir.gosterildi > 0 ? (satir.kullanildi / satir.gosterildi) * 100 : 0;

  return (
    <div className="rounded-2xl border border-cizgi bg-yuzey px-5 py-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="font-display text-[16px] leading-tight font-bold">
          %{satir.yuzde} · {satir.urunAdi}
        </span>
        <span className="font-data text-[13px] font-bold tabular text-kampanya">
          %{donusum.toFixed(1)} dönüşüm
        </span>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        {basamaklar.map((b, i) => (
          <div key={b.etiket} className="rounded-xl bg-cukur px-3 py-3">
            <div className="font-data text-xl leading-none font-bold tabular">{b.sayi}</div>
            <div className="mt-1 text-[11px] leading-tight text-yazi-sonuk">{b.etiket}</div>
            {i > 0 && basamaklar[i - 1].sayi > 0 && (
              <div className="mt-1 font-data text-[11px] text-yazi-sonuk">
                önceki adımın %{Math.round((b.sayi / basamaklar[i - 1].sayi) * 100)}&apos;i
              </div>
            )}
          </div>
        ))}
      </div>

      <p className="mt-3 border-t border-cizgi pt-3 text-[12px] leading-relaxed text-yazi-sonuk">
        Bu tekliflerden <strong className="text-yazi">{tlYaz(satir.indirimKurus)} TL</strong>{" "}
        indirim verildi. ⚠️ Kaç ürün satıldığını sistem bilmiyor — kasa
        bağlantımız yok; ölçtüğümüz şey kuponun kasada onaylanması.
      </p>
    </div>
  );
}
