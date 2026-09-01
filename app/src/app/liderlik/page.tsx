import Link from "next/link";
import { redirect } from "next/navigation";
import * as oturum from "@/domain/session";
import * as masaOturumu from "@/domain/masa";
import * as liderlik from "@/domain/liderlik";
import { gununOyunu } from "@/oyunlar";
import { isGunu } from "@/lib/tarih";
import { Sayfa, Baslik } from "@/components/ui";
import { KoyuKart, CamKutu, OyuncuBolum, SiraJetonu, MADALYA } from "@/components/oyuncu";
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
 * ── Görsel dil (Ü64) ────────────────────────────────────────
 *
 * Sıralama oyuncu tarafının en "yarışma" hissi veren ekranı; on satırlık
 * düz bir liste bunu tamamen öldürüyordu. Bugünün ilk üçü artık koyu
 * kartın içinde **kürsüde** duruyor, geri kalanı sakin listede.
 *
 * Kürsü yalnızca **bugün** için var: tüm zamanlar listesi bir anlık
 * yarış değil, aylara yayılan bir birikim. Onu da kürsüye çıkarmak
 * "bugün kim önde" sorusunu görünmez kılardı.
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
  const [bugun, tum] = await Promise.all([
    liderlik.bugun({ cafeId: masa.cafeId, oyunId: oyun.id, bakanId: o.ozneId }),
    liderlik.tumZamanlar({ cafeId: masa.cafeId, bakanId: o.ozneId }),
  ]);

  // Kürsüde duran üç kişi listede tekrar edilmiyor.
  const kursu = bugun.satirlar.slice(0, 3);
  const kalan = bugun.satirlar.slice(3);
  const benimBugunSiram = benimSiram(bugun);

  return (
    <Sayfa>
      <section className="mb-9">
        <KoyuKart>
          <p className="etiket-caps text-white/60">{masa.cafeAdi}</p>
          <h1 className="mt-1 font-display text-3xl leading-none font-extrabold tracking-tight">
            Sıralama
          </h1>
          <p className="mt-2 font-data text-[11px] text-white/55">
            Bugün · {oyun.ad}
          </p>

          {kursu.length >= 3 ? (
            <Kursu satirlar={kursu} />
          ) : (
            <div className="mt-5 grid grid-cols-2 gap-2.5">
              <CamKutu
                etiket="Bugün oynayan"
                deger={String(bugun.satirlar.length)}
                alt={bugun.satirlar.length === 0 ? "ilk sen ol" : undefined}
              />
              <CamKutu
                etiket="Senin sıran"
                deger={benimBugunSiram ? `${benimBugunSiram}.` : "—"}
                altin={benimBugunSiram != null && benimBugunSiram <= 3}
                alt={benimBugunSiram ? undefined : "bugün oynamadın"}
              />
            </div>
          )}

          {/* Kürsüye çıkamayan için "—" bir cevap değil. Sıra varsa sayı,
              yoksa neden olmadığı yazıyor. */}
          {kursu.length >= 3 && (
            <div className="mt-5 border-t border-white/15 pt-3.5 text-center">
              {benimBugunSiram ? (
                <>
                  <span className="etiket-caps text-white/55">Senin sıran </span>
                  <span className="font-data text-[13px] font-bold text-odul tabular">
                    {benimBugunSiram}.
                  </span>
                </>
              ) : (
                <span className="etiket-caps text-white/55">
                  Bugün henüz oynamadın
                </span>
              )}
            </div>
          )}
        </KoyuKart>
      </section>

      <OyuncuBolum
        baslik={kursu.length >= 3 ? "Bugün · devamı" : "Bugün"}
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
function Kursu({ satirlar }: { satirlar: liderlik.LiderSatiri[] }) {
  const [birinci, ikinci, ucuncu] = satirlar;
  return (
    <div className="mt-6 grid grid-cols-3 items-end gap-2">
      <Basamak satir={ikinci} yukseklik="h-14" />
      <Basamak satir={birinci} yukseklik="h-20" sampiyon />
      <Basamak satir={ucuncu} yukseklik="h-10" />
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
  const renk = MADALYA[satir.sira - 1] ?? MADALYA[2];

  return (
    <div className="flex flex-col items-center">
      {sampiyon && (
        <span className="mb-1 text-lg leading-none" aria-hidden>
          👑
        </span>
      )}

      <span
        className="flex size-9 items-center justify-center rounded-full font-data text-[13px] font-bold tabular"
        style={{ background: renk, color: "#1b0e38" }}
      >
        {satir.sira}
      </span>

      {/* Ad kırpılmıyor, iki satıra sarıyor: kürsüde duran üç kişinin
          adı kolonun üçte birine sığmıyor ve `truncate` çoğu adı
          "Abdulkadi…" hâline getiriyordu. */}
      <span
        className={`mt-1.5 w-full text-center font-display text-[12px] leading-tight font-bold break-words hyphens-auto ${
          satir.benMiyim ? "text-odul" : "text-white"
        }`}
      >
        {satir.benMiyim ? "Sen" : satir.gorunenAd}
      </span>

      <span className="font-data text-[11px] text-white/60 tabular">
        {satir.deger.toLocaleString("tr-TR")}
      </span>

      {/* Basamağın kendisi: üstü aydınlık, altı kartın zeminine karışıyor. */}
      <div
        className={`mt-1.5 w-full rounded-t-lg ${yukseklik} ${
          satir.benMiyim ? "border-t-2 border-odul" : ""
        }`}
        style={{
          background: "linear-gradient(180deg, rgba(255,255,255,0.22), rgba(255,255,255,0.04))",
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
