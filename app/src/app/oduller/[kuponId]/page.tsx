import { beklemeMetni } from "@/domain/bekleme-metni";
import { notFound, redirect } from "next/navigation";
import * as oturum from "@/domain/session";
import { kuponDetayi } from "@/domain/odul";
import { OyuncuSayfa, SayfaBasi } from "@/components/oyuncu";
import { gorselSec, GORSEL_RENGI } from "@/components/oyuncu-gorsel";
import { Karekod } from "@/components/karekod";
import { DurumYoklayicisi } from "./yoklayici";

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

  /*
    🔴 Ü141: kazınmamış kuponun detay sayfası **açılmıyor.**

    Kapalı kuponda ne ad ne jeton ne kod var (`kuponDetayi` hiçbirini
    döndürmüyor) — sayfa açılsaydı başlığı boş, karekodu bozuk bir ekran
    çıkardı. Ama asıl sebep kozmetik değil: bu adres tahmin edilebilir
    ve listede saklanan ad burada yazılsaydı kazımanın hiçbir anlamı
    kalmazdı. Oyuncu listeye dönüyor, kuponu orada kazıyor.
  */
  if (kupon.kapali) redirect("/oduller");

  const kullanilabilir = kupon.durum === "kullanilabilir";
  // `kapali` elendiği için ad artık kesin dolu; tip daraltması burada.
  const baslik = kupon.baslik ?? "";

  return (
    <OyuncuSayfa aktif="/oduller" geri={{ href: "/oduller", etiket: "Ödüllerim" }} yuva={false}>
      <SayfaBasi
        ust={kupon.cafeAdi}
        baslik={baslik}
        renk={GORSEL_RENGI[gorselSec(baslik, kupon.tur, kupon.kategoriTuru)]}
        gorsel={gorselSec(baslik, kupon.tur, kupon.kategoriTuru)}
      />

      {/*
        Ü136: durum yoklayıcısı. Kasiyer onayladığında müşterinin AÇIK
        duran ekranı değişmiyordu — `force-dynamic` "her istekte yeniden
        üret" demek, açık sayfayı güncellemek demek değil. Müşteri
        ekranına bakıp "oldu mu?" diye soruyordu.

        ⚠️ E9 bozulmuyor: ekran hâlâ geçerlilik iddia etmiyor, yalnızca
        kullanıldığını SONRADAN bildiriyor. Kasiyerin telefona bakıp ürün
        vermesi hâlâ imkânsız.
      */}
      <DurumYoklayicisi kuponId={kupon.id} baslangic={kupon.durum} />

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

      {/* ⚠️ Ü103: kullanım penceresi kasada gösterilecek karekodun HEMEN
          altında. E9 TL'yi, Ü97 açılma saatini saklıyor; bu saklanmıyor —
          ikisi de oyuncunun elindeki şeyi kullanabilmesini engellemiyor,
          bu engelliyor. Bilinmezse oyuncu kasaya gidiyor, reddediliyor ve
          suçu kafeye yüklüyor. */}
      {kupon.pencereMetni && (
        <div className="mt-4 rounded-xl border border-odul bg-odul-zemin px-4 py-3">
          <div className="etiket-caps text-odul-koyu">Ne zaman kullanılır</div>
          <div className="mt-1 text-[14px] leading-relaxed">{kupon.pencereMetni}</div>
        </div>
      )}

      {/* Geri dönüş üstteki şeritte (Ü66): "Ödüllerime dön" bağlantısı
          sayfanın en altındaydı ve karekodun altında kalıyordu — kasada
          telefonu uzatan oyuncunun kaydırması gereken son şey. */}
      <div className="mt-6 font-data text-[11px] text-yazi-sonuk tabular">
        Son kullanım{" "}
        {kupon.sonKullanim.toLocaleDateString("tr-TR", { day: "numeric", month: "long" })}
      </div>
    </OyuncuSayfa>
  );
}

function durumBasligi(durum: string): string {
  if (durum === "beklemede") return "Henüz açılmadı";
  if (durum === "kullanildi") return "Kullanıldı";
  if (durum === "geri_alindi") return "Geri alındı";
  return "Süresi doldu";
}

function durumAciklamasi(kupon: { id: string; durum: string; aktiflesme: Date }): string {
  if (kupon.durum === "beklemede") {
    /**
     * ⚠️ Ü97: saat **söylenmiyor**. Ürün sahibi: *"ödülü tabii ki bilecek,
     * zamanı bilmeyecek."* Eskiden burada "7 Eylül 14:20 sonrasında
     * kullanabilirsin" yazıyordu; kesin saat, beklemeyi bir geri sayıma
     * çeviriyor ve oyuncu o saatte gelmezse söz tutulmamış gibi oluyordu.
     * Kasiyer ekranı gerçek saati görmeye devam ediyor.
     */
    return beklemeMetni(kupon.id, kupon.aktiflesme);
  }
  if (kupon.durum === "kullanildi") return "Bu kupon kasada kullanıldı.";
  if (kupon.durum === "geri_alindi") return "Kasiyer bu onayı geri aldı. Bir yanlışlık olduysa işletmeyle görüş.";
  return "Kullanım süresi geçti. Yeni ödüller kazanmaya devam edebilirsin.";
}
