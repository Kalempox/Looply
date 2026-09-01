import Link from "next/link";
import { redirect } from "next/navigation";
import * as oturum from "@/domain/session";
import * as masaOturumu from "@/domain/masa";
import * as liderlik from "@/domain/liderlik";
import { gununOyunu } from "@/oyunlar";
import { isGunu } from "@/lib/tarih";
import { Sayfa, Baslik } from "@/components/ui";
import { SayfaBasi, Sayac, OyuncuBolum, SiraJetonu, MADALYA } from "@/components/oyuncu";
import { RENK, oyunRengi, type OyuncuRengi } from "@/components/oyuncu-renk";
import { KupaIkonu, TacIkonu, OyunIkonu } from "@/components/oyuncu-ikon";
import { OyuncuNav, NavBosluk } from "@/components/oyuncu-nav";

export const dynamic = "force-dynamic";
export const metadata = { title: "Liderlik · CafePlay" };

/**
 * Tüm zamanlar liderlik tablosu.
 *
 * ── Neden ayrı sayfa ────────────────────────────────────────
 *
 * `/oyna` kartı bugünün ilk üçünü gösteriyor. Oraya on satır sığdırmak
 * ana ekranın asıl işini (oyna, kupon kullan) bastırırdı; buraya
 * tıklayan kişi ise zaten sıralamaya bakmaya gelmiş.
 *
 * ── İki liste, iki soru ─────────────────────────────────────
 *
 * **Bugün** en yüksek skoru soruyor, **tüm zamanlar** en çok puanı. Aynı
 * listenin uzunu ve kısası olsalardı ikinci sayfaya gelmenin anlamı
 * olmazdı — burada gerçekten başka bir şey görünüyor: bir günün şampiyonu
 * değil, kafenin en düzenli müşterisi.
 *
 * ── Kafe dışında ────────────────────────────────────────────
 *
 * Sıralama kafeye ait. Masası olmayan oyuncuya gösterilecek bir liste yok
 * — hangi kafenin sıralaması olduğu belirsiz kalırdı.
 *
 * ── Kürsü (Ü64, Ü65) ────────────────────────────────────────
 *
 * On satırlık düz bir liste yarışma hissini tamamen öldürüyordu.
 * Bugünün ilk üçü kürsüde duruyor; geri kalanı sakin listede.
 *
 * Kürsü **koyu değil, günün oyununun renginde**. Ü64'te koyu mordu ve
 * ürün sahibi haklı olarak her ekranda aynı morun tekrarlanmasına
 * itiraz etti. Günün oyununun rengini almasının ayrıca bir faydası
 * var: liste hangi oyunun sıralaması olduğunu başlıkta bir kez
 * söylüyor, renk onu kürsü boyunca tekrarlıyor.
 *
 * Kürsü yalnızca **bugün** için var: tüm zamanlar listesi bir anlık
 * yarış değil, aylara yayılan bir birikim.
 */
export default async function LiderlikSayfasi() {
  const o = await oturum.oku();
  if (!o || o.rol !== "oyuncu") redirect("/giris");

  const masa = await masaOturumu.aktif(o.ozneId);
  if (!masa) {
    return (
      <Sayfa>
        <Baslik ust="Liderlik">Sıralama</Baslik>
        <p className="text-[15px] leading-relaxed text-yazi-sonuk">
          Sıralama kafeye ait. Masadaki karekodu okuttuğunda bu kafenin listesini görürsün.
        </p>
        <Link href="/oyna" className="mt-6 inline-block text-[15px] font-semibold underline">
          Ana ekrana dön
        </Link>
        <NavBosluk />
        <OyuncuNav aktif="/oyna" />
      </Sayfa>
    );
  }

  const oyun = gununOyunu(isGunu());
  const renk = oyunRengi(oyun.id);
  const [bugun, tum] = await Promise.all([
    liderlik.bugun({ cafeId: masa.cafeId, oyunId: oyun.id, bakanId: o.ozneId }),
    liderlik.tumZamanlar({ cafeId: masa.cafeId, bakanId: o.ozneId }),
  ]);

  // Kürsüde duran üç kişi listede tekrar edilmiyor.
  const kursu = bugun.satirlar.slice(0, 3);
  const kalan = bugun.satirlar.slice(3);
  const benim = benimSiram(bugun);

  return (
    <Sayfa>
      <SayfaBasi ust={masa.cafeAdi} baslik="Sıralama" renk={renk} ikon={<KupaIkonu boy={130} />}>
        <div className="grid grid-cols-2 gap-2.5">
          <Sayac
            etiket={`Bugün · ${oyun.ad}`}
            deger={String(bugun.satirlar.length)}
            renk={renk}
            alt={bugun.satirlar.length === 0 ? "ilk sen ol" : "oyuncu"}
          />
          <Sayac
            etiket="Senin sıran"
            deger={benim ? `${benim}.` : "—"}
            renk={benim != null && benim <= 3 ? "amber" : undefined}
            alt={benim ? undefined : "bugün oynamadın"}
          />
        </div>
      </SayfaBasi>

      {kursu.length >= 3 && (
        <section className="mb-9">
          <Kursu satirlar={kursu} renk={renk} oyunId={oyun.id} oyunAdi={oyun.ad} />
        </section>
      )}

      <OyuncuBolum
        baslik={kursu.length >= 3 ? "Bugün · devamı" : "Bugün"}
        renk={renk}
        not="en yüksek skor"
      >
        <Liste
          liste={bugun}
          satirlar={kursu.length >= 3 ? kalan : bugun.satirlar}
          birim="puan"
          bosMetin={
            kursu.length >= 3
              ? "Bugün ilk üçün dışında oynayan olmadı."
              : "Bugün bu kafede henüz kimse oynamadı."
          }
        />
      </OyuncuBolum>

      <OyuncuBolum baslik="Tüm zamanlar" not="bu kafede toplanan puan">
        <Liste
          liste={tum}
          satirlar={tum.satirlar}
          birim="puan"
          bosMetin="Bu kafede henüz puan toplanmamış."
        />
      </OyuncuBolum>

      <p className="border-l-2 border-cizgi pl-4 text-[13px] leading-relaxed text-yazi-sonuk">
        Adlar kısaltılmış gösterilir — soyadın yalnızca baş harfi görünür. Kendi adını{" "}
        <Link href="/verilerim" className="underline">
          verilerim
        </Link>{" "}
        sayfasından tamamen gizleyebilirsin.
      </p>

      <NavBosluk />
      <OyuncuNav aktif="/oyna" />
    </Sayfa>
  );
}

/** Oyuncunun sırası — listede görünüyorsa oradan, değilse kuyruk satırından. */
function benimSiram(l: liderlik.Liste): number | null {
  const listede = l.satirlar.find((s) => s.benMiyim);
  return listede?.sira ?? l.benimSiram?.sira ?? null;
}

/* ── Kürsü ─────────────────────────────────────────────── */

/**
 * Bugünün ilk üçü.
 *
 * Sıra 2-1-3: birinci ortada ve en yüksekte. Soldan sağa 1-2-3 dizmek
 * teknik olarak daha kolaydı ama kürsü olmazdı; ilk bakışta birinciyi
 * bulmak için okumak gerekirdi.
 *
 * Basamak yükseklikleri sabit (`h-*`), veriye bağlı değil: skor farkı
 * 5 ile 5000 arasında olabiliyor ve orantılı bir kürsüde ikinci ile
 * üçüncü çoğu gün aynı yükseklikte çıkardı.
 */
function Kursu({
  satirlar,
  renk,
  oyunId,
  oyunAdi,
}: {
  satirlar: liderlik.LiderSatiri[];
  renk: OyuncuRengi;
  oyunId: string;
  oyunAdi: string;
}) {
  const r = RENK[renk];
  const [birinci, ikinci, ucuncu] = satirlar;

  return (
    <div
      className="relative overflow-hidden rounded-3xl px-4 pt-5 pb-0"
      style={{
        background: `linear-gradient(160deg, ${r.canli} 0%, ${r.ana} 55%, ${r.koyu} 100%)`,
      }}
    >
      <div className="flex items-center justify-center gap-2">
        <OyunIkonu oyunId={oyunId} boy={18} />
        <span className="etiket-caps text-white/75">Bugünün kürsüsü · {oyunAdi}</span>
      </div>

      <div className="mt-5 grid grid-cols-3 items-end gap-2">
        <Basamak satir={ikinci} yukseklik="h-16" />
        <Basamak satir={birinci} yukseklik="h-24" sampiyon />
        <Basamak satir={ucuncu} yukseklik="h-11" />
      </div>
    </div>
  );
}

function Basamak({
  satir,
  yukseklik,
  sampiyon,
}: {
  satir: liderlik.LiderSatiri;
  yukseklik: string;
  sampiyon?: boolean;
}) {
  const madalya = MADALYA[satir.sira - 1] ?? MADALYA[2];

  return (
    <div className="flex flex-col items-center">
      {sampiyon && (
        <span className="mb-1">
          <TacIkonu boy={26} />
        </span>
      )}

      <span
        className="flex size-9 items-center justify-center rounded-full font-data text-[13px] font-bold tabular shadow-sm"
        style={{ background: madalya, color: "#1b0e38" }}
      >
        {satir.sira}
      </span>

      {/* Ad kırpılmıyor, iki satıra sarıyor: kürsüde duran üç kişinin
          adı kolonun üçte birine sığmıyor ve `truncate` çoğu adı
          "Abdulkadi…" hâline getiriyordu. */}
      <span
        className={`mt-1.5 w-full text-center font-display text-[12px] leading-tight font-bold break-words ${
          satir.benMiyim ? "text-[#ffcf3f]" : "text-white"
        }`}
      >
        {satir.benMiyim ? "Sen" : satir.gorunenAd}
      </span>

      <span className="font-data text-[11px] text-white/70 tabular">
        {satir.deger.toLocaleString("tr-TR")}
      </span>

      {/* Basamağın kendisi. Alt köşeleri yuvarlanmıyor ve kartın
          dibine oturuyor — havada duran bir kürsü basamağı değil. */}
      <div
        className={`mt-1.5 w-full rounded-t-lg ${yukseklik} ${
          satir.benMiyim ? "border-t-[3px] border-[#ffcf3f]" : ""
        }`}
        style={{
          background: "linear-gradient(180deg, rgba(255,255,255,0.38), rgba(255,255,255,0.10))",
        }}
      />
    </div>
  );
}

/* ── Liste ─────────────────────────────────────────────── */

function Liste({
  liste,
  satirlar,
  birim,
  bosMetin,
}: {
  /** Kuyruk satırı ("sen 14. sıradasın") her zaman tam listeden geliyor. */
  liste: liderlik.Liste;
  /** Ekranda gösterilecek satırlar — kürsüye çıkanlar çıkarılmış olabilir. */
  satirlar: liderlik.LiderSatiri[];
  birim: string;
  bosMetin: string;
}) {
  if (satirlar.length === 0) {
    return (
      <p className="rounded-2xl border border-cizgi bg-yuzey px-5 py-5 text-[14px] text-yazi-sonuk">
        {bosMetin}
      </p>
    );
  }

  return (
    <div className="rounded-2xl border border-cizgi bg-yuzey px-5 py-2">
      <ol className="divide-y divide-cizgi">
        {satirlar.map((s) => (
          <Satir key={s.sira} satir={s} birim={birim} />
        ))}
      </ol>

      {/* Listeye giremeyen kişiye "yoksun" demek yerine kaçıncı
          olduğunu söylüyoruz — sıralama ancak insan kendini
          görebildiğinde bir hedef oluyor. */}
      {liste.benimSiram ? (
        <div className="border-t-2 border-cizgi">
          <ol>
            <Satir satir={liste.benimSiram} birim={birim} />
          </ol>
        </div>
      ) : (
        // Listede hiç yoksa sessiz kalmak, "buraya giremem" gibi
        // okunuyor. Nedenini söylemek hedefi görünür kılıyor.
        !liste.satirlar.some((s) => s.benMiyim) && (
          <p className="border-t-2 border-cizgi py-3 text-[13px] text-yazi-sonuk">
            Henüz bu listede değilsin — oynadığında burada görünürsün.
          </p>
        )
      )}
    </div>
  );
}

function Satir({ satir, birim }: { satir: liderlik.LiderSatiri; birim: string }) {
  return (
    <li className="flex items-center gap-3 py-2.5">
      <SiraJetonu sira={satir.sira} />

      <span
        className={`min-w-0 flex-1 truncate font-display text-[15px] font-bold ${
          satir.benMiyim ? "text-odul-koyu" : ""
        }`}
      >
        {satir.benMiyim ? "Sen" : satir.gorunenAd}
      </span>

      <span
        className={`font-data text-[15px] leading-none font-bold tabular ${
          satir.benMiyim ? "text-odul-koyu" : "text-vurgu"
        }`}
      >
        {satir.deger.toLocaleString("tr-TR")}
        <span className="ml-1 text-[10px] font-normal text-yazi-sonuk">{birim}</span>
      </span>
    </li>
  );
}
