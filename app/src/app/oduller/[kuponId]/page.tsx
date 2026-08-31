import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import * as oturum from "@/domain/session";
import { kuponDetayi } from "@/domain/odul";
import { Sayfa, Baslik } from "@/components/ui";
import { Karekod } from "@/components/karekod";

export const dynamic = "force-dynamic";

/**
 * "Kuponumu kullan" ekranı.
 *
 * ── E9 — bu ekranın tasarım kuralı ──────────────────────────
 *
 * Ekranda **geçerlilik damgası yok, TL değeri yok**. Ödülün adı var, çünkü
 * oyuncu ne kazandığını bilmeli. Ama "bu kupon geçerlidir" diyen hiçbir
 * işaret yok — süresi dolmuş bir kupon burada geçerli olanla neredeyse aynı
 * görünüyor.
 *
 * Bu bir eksiklik değil, **projenin en büyük sessiz ölüm riskine karşı
 * alınmış önlem**: kasiyer telefona bakıp ürün verirse sistem hiçbir şey
 * görmez, kafenin bütçesi dolu görünür ve bütün raporlar yalan söyler.
 * Geçerlilik yalnızca kasiyerin ekranında, okutulduktan sonra ortaya çıkıyor.
 *
 * ── İki yol (Ü19) ───────────────────────────────────────────
 *
 * QR birincil — kasiyer okutur, üç saniyede biter. Altında 6 haneli kod:
 * kamera izni reddedilmişse, ışık kötüyse veya ekran kırıksa devrede.
 */
export default async function KuponSayfasi({
  params,
}: {
  params: Promise<{ kuponId: string }>;
}) {
  const { kuponId } = await params;

  const o = await oturum.oku();
  if (!o || o.rol !== "oyuncu") redirect("/giris");

  const kupon = await kuponDetayi(o.ozneId, kuponId);
  if (!kupon) notFound();

  const kullanilabilir = kupon.durum === "kullanilabilir";

  return (
    <Sayfa>
      <Baslik ust={kupon.cafeAdi}>{kupon.baslik}</Baslik>

      {kullanilabilir ? (
        <>
          <div className="rounded-2xl border border-odul bg-yuzey px-6 py-7 text-center">
            {/* Karekodun kendi beyaz sessiz alanı — sayfa zemini açık olsa
                bile şart, yoksa okuyucu kodun nerede bittiğini anlamıyor. */}
            <div className="mx-auto w-fit rounded-lg bg-white p-3">
              <Karekod deger={kupon.jeton} boyut={220} etiket="Kupon karekodu" />
            </div>

            <p className="mt-5 text-[15px] leading-relaxed text-yazi">
              Kasada bu kodu okut.
            </p>

            <div className="mt-6 border-t border-cizgi pt-5">
              <div className="etiket-caps text-yazi-sonuk">
                Kamera çalışmazsa
              </div>
              <div className="mt-2 font-data text-3xl font-bold tracking-[0.3em] text-odul-koyu tabular">
                {kupon.kod}
              </div>
            </div>
          </div>

          {/* E9: ekranın söylediği tek şey bu. "Geçerlidir" demiyor. */}
          <p className="mt-5 border-l-2 border-odul pl-4 text-[13px] leading-relaxed text-yazi-sonuk">
            Kasada okutulmadan geçerli değildir. Kuponun kullanılıp
            kullanılmadığını yalnızca kasiyerin ekranı gösterir.
          </p>
        </>
      ) : (
        <div className="rounded-2xl border border-cizgi bg-yuzey px-6 py-8">
          <div className="font-display text-xl font-bold">{durumBasligi(kupon.durum)}</div>
          <p className="mt-3 text-[14px] leading-relaxed text-yazi-sonuk">
            {durumAciklamasi(kupon)}
          </p>
        </div>
      )}

      <div className="mt-6 font-data text-[11px] text-yazi-sonuk tabular">
        Son kullanım{" "}
        {kupon.sonKullanim.toLocaleDateString("tr-TR", { day: "numeric", month: "long" })}
      </div>

      <Link href="/oduller" className="mt-8 inline-block text-[14px] text-vurgu underline">
        Ödüllerime dön
      </Link>
    </Sayfa>
  );
}

function durumBasligi(durum: string): string {
  if (durum === "beklemede") return "Henüz açılmadı";
  if (durum === "kullanildi") return "Kullanıldı";
  if (durum === "geri_alindi") return "Geri alındı";
  return "Süresi doldu";
}

function durumAciklamasi(kupon: { durum: string; aktiflesme: Date }): string {
  if (kupon.durum === "beklemede") {
    return `Büyük ödüller kazanıldığı anda değil, 12 saat sonra açılır. ${kupon.aktiflesme.toLocaleString(
      "tr-TR",
      { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" },
    )} sonrasında kasada kullanabilirsin.`;
  }
  if (kupon.durum === "kullanildi") return "Bu kupon kasada kullanıldı.";
  if (kupon.durum === "geri_alindi") return "Kasiyer bu onayı geri aldı. Bir yanlışlık olduysa işletmeyle görüş.";
  return "Kullanım süresi geçti. Yeni ödüller kazanmaya devam edebilirsin.";
}
