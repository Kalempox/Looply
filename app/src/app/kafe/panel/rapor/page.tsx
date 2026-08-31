import Link from "next/link";
import { kafeYoneticisiGerekli } from "@/domain/yetki";
import * as rapor from "@/domain/rapor";
import { bakim } from "@/domain/bakim";
import { IsletmeSayfa, IsletmeBaslik, Bolum, Rozet } from "@/components/isletme";
import { DisaAktarma } from "./kontroller";

export const dynamic = "force-dynamic";
export const metadata = { title: "Rapor · CafePlay" };

/**
 * Kafe raporu — Faz 8.
 *
 * ── Baş sayı: nitelikli oyuncu (Ü29) ────────────────────────
 *
 * Rapor, satılan şeyin kanıtı. Satılan birim nitelikli oyuncu olduğu için
 * ekranın en üstünde o duruyor; geri kalan her sayı onu açıklıyor.
 *
 * ── İkinci sayı: fiilen kullanılan indirim ──────────────────
 *
 * "Kazanılan" ile "kullanılan" bilerek ayrı gösteriliyor ve **asıl sayı
 * ikincisi**. Kafenin ödediği tek şey kasada onaylanan tutar; verilip
 * kullanılmayan kuponun maliyeti yok (Ü7). Bu ayrım satış konuşmasının
 * merkezinde: *"alt sınırı siz koyuyorsunuz, kullanılmayanın maliyeti yok."*
 *
 * ── G1 · Kişisel veri yok ───────────────────────────────────
 *
 * Ekranın hiçbir yerinde ad, soyad, telefon yok. Oyuncular kafeye özel anonim
 * kodla görünüyor ve o kod her kafede farklı — iki kafe verisini birleştirip
 * aynı kişiyi izleyemiyor.
 */
export default async function RaporSayfasi({
  searchParams,
}: {
  searchParams: Promise<{ hafta?: string }>;
}) {
  const o = await kafeYoneticisiGerekli();
  await bakim();
  const sp = await searchParams;
  const gecen = sp.hafta === "gecen";
  const aralik = gecen ? rapor.gecenHafta() : rapor.buHafta();

  const [ozet, ziyaretler, masalar, saatler, kampanyalar] = await Promise.all([
    rapor.ozet(o.cafeId, aralik),
    rapor.ziyaretler(o.cafeId, aralik),
    rapor.masaHareketi(o.cafeId, aralik),
    rapor.saatlikDagilim(o.cafeId, aralik),
    rapor.kampanyaSonuclari(o.cafeId, aralik),
  ]);

  // Faz 8 güvenlik kapısı: her rapor görüntüleme denetim izine düşer.
  await rapor.goruntulemeyiKaydet({ cafeId: o.cafeId, aktorId: o.ozneId, aralik });

  const enYogun = Math.max(1, ...saatler.map((s) => s.oyuncu ?? 0));

  /**
   * Ü30: eşiğin altındaki saat `null` dönüyor.
   *
   * Bu ayrım önemli — `null` "veri yok" demek değil, "var ama gizlendi"
   * demek. İkisi karıştırılırsa rapor, üç oyunun oynandığı bir haftada
   * "bu dönemde henüz oyun oynanmadı" der ve satılan şeyin kanıtı olmaktan
   * çıkıp yanlış beyan hâline gelir.
   */
  const gizliSaatVar = saatler.some((s) => s.oyuncu === null);

  return (
    <IsletmeSayfa genis>
      <IsletmeBaslik ust="İşletme paneli" alt={`${gun(aralik.baslangic)} – ${gun(aralik.bitis, -1)}`}>
        Rapor
      </IsletmeBaslik>

      <nav className="mb-7 flex gap-1 border-b border-cizgi">
        <Sekme yol="/kafe/panel/rapor" secili={!gecen}>
          Bu hafta
        </Sekme>
        <Sekme yol="/kafe/panel/rapor?hafta=gecen" secili={gecen}>
          Geçen hafta
        </Sekme>
      </nav>

      {/* ── Baş sayı ───────────────────────────────────── */}
      <Bolum baslik="Kafene gelen oyuncu" alt="CafePlay üzerinden gelip oyunu tamamlayan, konumu doğrulanmış müşteriler.">
        <div className="rounded-2xl border border-cizgi bg-yuzey px-5 py-6">
          <div className="etiket-caps text-yazi-sonuk">Nitelikli oyuncu</div>
          <div className="mt-1.5 font-data text-5xl leading-none font-bold tabular">
            {ozet.nitelikliOyuncu}
          </div>
          <p className="mt-3 text-[13px] leading-relaxed text-yazi-sonuk">
            Günde bir kez, cihaz başına sayılır. Aynı müşterinin ikinci oyunu tekrar sayılmaz —
            bu sayı ziyaret sayısı değil, <strong className="text-yazi">gelen kişi</strong>.
          </p>
        </div>

        <div className="mt-2.5 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-cizgi bg-cizgi sm:grid-cols-3">
          <Sayi etiket="Tekil oyuncu" deger={String(ozet.tekilOyuncu)} />
          <Sayi etiket="Tamamlanan oyun" deger={String(ozet.toplamOyun)} />
          <Sayi etiket="Verilen kupon" deger={String(ozet.kuponVerilen)} />
        </div>
      </Bolum>

      {/* ── İndirim ────────────────────────────────────── */}
      <Bolum baslik="İndirim" alt="Kazanılan ile kullanılan ayrı sayılır — ödediğin yalnızca ikincisi.">
        <div className="grid gap-px overflow-hidden rounded-2xl border border-cizgi bg-cizgi sm:grid-cols-2">
          <div className="bg-yuzey px-5 py-5">
            <div className="etiket-caps text-yazi-sonuk">Kazanılan</div>
            <div className="mt-2 font-data text-2xl leading-none font-bold text-yazi-sonuk tabular">
              {tl(ozet.kazanilanIndirimKurus)} <span className="text-[11px]">TL</span>
            </div>
            <p className="mt-2 text-[12px] text-yazi-sonuk">
              Dağıtılan {ozet.kuponVerilen} kuponun toplam değeri
            </p>
          </div>

          <div className="bg-yuzey px-5 py-5">
            <div className="etiket-caps text-yazi-sonuk">Kasada kullanılan</div>
            <div className="mt-2 font-data text-2xl leading-none font-bold tabular">
              {tl(ozet.kullanilanIndirimKurus)} <span className="text-[11px]">TL</span>
            </div>
            <p className="mt-2 text-[12px] text-yazi-sonuk">
              {ozet.kuponKullanilan} kupon · <strong className="text-yazi">ödediğin tutar</strong>
            </p>
          </div>
        </div>
      </Bolum>

      {/* ── Saatlik ────────────────────────────────────── */}
      <Bolum baslik="Hangi saat doluyor" alt="Boş saatini doldurma iddiasının kanıtı burada.">
        {rapor.donemBos(saatler) ? (
          <p className="text-[14px] text-yazi-sonuk">Bu dönemde henüz oyun oynanmadı.</p>
        ) : (
          <>
            <ul className="flex flex-col gap-1">
              {saatler
                .filter((s) => s.oyuncu !== 0)
                .map((s) => (
                  <li key={s.saat} className="flex items-center gap-3">
                    <span className="w-12 font-data text-[11px] text-yazi-sonuk tabular">
                      {String(s.saat).padStart(2, "0")}:00
                    </span>
                    <span className="h-3 flex-1 overflow-hidden rounded-sm bg-cukur">
                      <span
                        className="block h-full rounded-sm bg-yazi"
                        style={{ width: `${((s.oyuncu ?? 0) / enYogun) * 100}%` }}
                      />
                    </span>
                    <span className="w-10 text-right font-data text-[11px] tabular">
                      {say(s.oyuncu)}
                    </span>
                  </li>
                ))}
            </ul>
            {gizliSaatVar && (
              <p className="mt-3 text-[12px] leading-relaxed text-yazi-sonuk">
                {`<${rapor.GIZLEME_ESIGI}`} yazan saatlerde oyuncu var ama sayısı mahremiyet
                eşiğinin altında. Çubuk yalnızca gösterilen sayıları karşılaştırır.
              </p>
            )}
          </>
        )}
      </Bolum>

      {/* ── Masa ───────────────────────────────────────── */}
      <Bolum baslik="Masa hareketi">
        {masalar.length === 0 ? (
          <p className="text-[14px] text-yazi-sonuk">Henüz masa hareketi yok.</p>
        ) : (
          <ul className="divide-y divide-cizgi border-y border-cizgi">
            {masalar.map((m) => (
              <li key={m.masa} className="flex items-center gap-4 py-3">
                <span className="flex-1 text-[15px] font-semibold">{m.masa}</span>
                <span className="font-data text-[12px] text-yazi-sonuk tabular">
                  {say(m.oyuncu)} oyuncu · {m.oyun} oyun
                </span>
              </li>
            ))}
          </ul>
        )}
      </Bolum>

      {/* ── Kampanya ───────────────────────────────────── */}
      {kampanyalar.length > 0 && (
        <Bolum baslik="Kampanya sonuçları">
          <ul className="divide-y divide-cizgi border-y border-cizgi">
            {kampanyalar.map((k, i) => (
              <li key={`${k.urunAdi}-${i}`} className="py-3.5">
                <div className="flex items-center gap-3">
                  <span className="flex-1 text-[15px] font-semibold">
                    {k.urunAdi} · %{k.yuzde}
                  </span>
                  {k.durum === "active" ? (
                    <Rozet tur="onayli">yayında</Rozet>
                  ) : (
                    <Rozet tur="pasif">{k.durum === "ended" ? "bitti" : k.durum}</Rozet>
                  )}
                </div>
                <div className="mt-1 font-data text-[12px] text-yazi-sonuk tabular">
                  {k.verilen} verildi · {k.kullanilan} kullanıldı · {tl(k.kullanilanKurus)} TL
                </div>
              </li>
            ))}
          </ul>
        </Bolum>
      )}

      {/* ── Doğrulama defteri ──────────────────────────── */}
      <Bolum
        baslik="Doğrulama defteri"
        alt="Sayımızı satır satır denetleyebilirsin. Denetlenemeyen bir sayı, iddiadan ibarettir."
      >
        {ziyaretler.length === 0 ? (
          <p className="text-[14px] text-yazi-sonuk">Bu dönemde kayıt yok.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="etiket-caps border-b border-cizgi text-left text-[10px] text-yazi-sonuk">
                  <th className="py-2 pr-4">Müşteri</th>
                  <th className="py-2 pr-4">Zaman</th>
                  <th className="py-2 pr-4">Masa</th>
                  <th className="py-2 pr-4">Kanıt</th>
                  <th className="py-2">Oyun</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cizgi">
                {ziyaretler.map((z, i) => (
                  <tr key={`${z.kod}-${i}`}>
                    <td className="py-2 pr-4 font-data">{z.kod}</td>
                    <td className="py-2 pr-4 text-yazi-sonuk tabular">
                      {z.zaman.toLocaleString("tr-TR", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="py-2 pr-4 text-yazi-sonuk">{z.masa ?? "—"}</td>
                    <td className="py-2 pr-4">
                      {z.nitelikli ? (
                        <Rozet tur="onayli">nitelikli</Rozet>
                      ) : (
                        <span className="font-data text-[11px] text-yazi-sonuk">
                          K{z.kanitSeviyesi}
                        </span>
                      )}
                    </td>
                    <td className="py-2 font-data tabular">{z.oyunSayisi}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <p className="mt-4 text-[12px] leading-relaxed text-yazi-sonuk">
          Müşteriler işletmene özel anonim kodla görünür. Ad, soyad ve telefon CafePlay&apos;de
          kalır, hiçbir ekranda gösterilmez.
        </p>
      </Bolum>

      <Bolum baslik="Dışa aktar">
        <DisaAktarma hafta={gecen ? "gecen" : "bu"} />
      </Bolum>

      <Link href="/kafe/panel" className="text-[14px] text-yazi-sonuk underline">
        Panele dön
      </Link>
    </IsletmeSayfa>
  );
}

/* ── Parçalar ──────────────────────────────────────────── */

function tl(kurus: number): string {
  return (kurus / 100).toLocaleString("tr-TR", { maximumFractionDigits: 0 });
}

/** Ü30: gizlenen sayı `<5` olarak gösterilir. */
function say(n: number | null): string {
  return n === null ? `<${rapor.GIZLEME_ESIGI}` : String(n);
}

function gun(iso: string, ekle = 0): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + ekle);
  return d.toLocaleDateString("tr-TR", { day: "numeric", month: "long", timeZone: "UTC" });
}

function Sayi({ etiket, deger }: { etiket: string; deger: string }) {
  return (
    <div className="bg-yuzey px-4 py-4">
      <div className="etiket-caps text-[10px] text-yazi-sonuk">{etiket}</div>
      <div className="mt-1.5 font-data text-xl leading-none font-bold tabular">{deger}</div>
    </div>
  );
}

function Sekme({
  yol,
  secili,
  children,
}: {
  yol: string;
  secili: boolean;
  children: React.ReactNode;
}) {
  return (
    <a
      href={yol}
      className={`border-b-2 px-3 py-2.5 text-[14px] ${
        secili
          ? "border-yazi font-semibold text-yazi"
          : "border-transparent text-yazi-sonuk"
      }`}
    >
      {children}
    </a>
  );
}
