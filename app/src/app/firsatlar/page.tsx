import Link from "next/link";
import { redirect } from "next/navigation";
import * as oturum from "@/domain/session";
import * as masaOturumu from "@/domain/masa";
import { ozet } from "@/domain/puan";
import { buradakiler } from "@/domain/firsat";
import { OyuncuSayfa, SayfaBasi, Sayac, OyuncuBolum } from "@/components/oyuncu";
import { RENK } from "@/components/oyuncu-renk";
import { Gorsel, gorselSec } from "@/components/oyuncu-gorsel";

export const dynamic = "force-dynamic";
export const metadata = { title: "Fırsatlar · CafePlay" };

/**
 * "Buradaki fırsatlar" — bulunulan kafenin aktif ödülleri ve kampanyaları.
 *
 * Ekran yalnızca **masa oturumu varken** anlamlı: "burada" diye bir yer
 * yoksa gösterilecek fırsat da yok (Ü3). Kafe dışında açıldığında liste
 * boş bırakılmıyor, nedeni yazılıyor.
 *
 * `cafeId` masa oturumundan geliyor — URL'den veya form alanından değil
 * (değişmez kural #3). Oyuncu başka bir kafenin kataloğunu adres çubuğunu
 * değiştirerek açamıyor.
 *
 * Kafenin maliyet verisi (`cost_kurus`) ve yüzde kampanyasının TL tavanı
 * bu ekrana hiç gelmiyor — biri kafenin ticari verisi, diğeri E9.
 *
 * ── Görsel dil (Ü66) ────────────────────────────────────────
 *
 * Ekran oyuncu tarafının geri kalanından kopuktu: `Baslik`, `MasaKunyesi`
 * ve düz beyaz satırlar. Şimdi diğer ekranlarla aynı kabuğa oturuyor ve
 * her fırsatın arkasında **neyle ilgili olduğu** duruyor — kahve
 * indiriminde fincan, tatlıda pasta.
 */
export default async function FirsatlarSayfasi() {
  const o = await oturum.oku();
  if (!o || o.rol !== "oyuncu") redirect("/giris");

  const masa = await masaOturumu.aktif(o.ozneId);

  if (!masa) {
    return (
      <OyuncuSayfa aktif="/oyna" geri={{ href: "/oyna", etiket: "Ana ekran" }}>
        <SayfaBasi ust="Fırsatlar" baslik="Buradaki fırsatlar" renk="nane" gorsel="kahve" />
        <div className="rounded-3xl border border-cizgi bg-yuzey px-6 py-8">
          <p className="text-[15px] leading-relaxed text-yazi-sonuk">
            Şu an bir kafede değilsin. Fırsatlar kafeye özel — masadaki karekodu okuttuğunda o
            kafenin ödülleri ve indirimleri burada görünür.
          </p>
          <Link
            href="/oyna"
            className="mt-5 inline-block rounded-xl bg-vurgu px-6 py-3 font-display text-[15px] font-bold text-white"
          >
            Ana ekrana dön
          </Link>
        </div>
      </OyuncuSayfa>
    );
  }

  const [firsatlar, sayilar] = await Promise.all([
    buradakiler(masa.cafeId),
    ozet(o.ozneId, masa.cafeId),
  ]);

  const bosMu = !firsatlar.oduller.length && !firsatlar.kampanyalar.length;

  return (
    <OyuncuSayfa aktif="/oyna" geri={{ href: "/oyna", etiket: "Ana ekran" }}>
      <SayfaBasi ust={masa.cafeAdi} baslik="Buradaki fırsatlar" renk="nane" gorsel="kahve">
        <div className="grid grid-cols-2 gap-2.5">
          {/* Ü52: puan artık harcanmıyor. Ekranın başında tek başına
              durursa "bunlarla ödül alacağım" diye okunuyor; bu yüzden
              yanında fırsat sayısıyla birlikte ve altında ne işe
              yaradığı yazılı. */}
          <Sayac
            etiket="Bu kafedeki puanın"
            deger={(sayilar.kafePuani ?? 0).toLocaleString("tr-TR")}
            renk="nane"
            alt="sıralama ve seviye"
          />
          <Sayac
            etiket="Buradaki fırsat"
            deger={String(firsatlar.oduller.length + firsatlar.kampanyalar.length)}
            alt={bosMu ? "henüz hazırlanmadı" : "kazanılabilir"}
          />
        </div>
      </SayfaBasi>

      {bosMu && (
        <div className="rounded-3xl border border-cizgi bg-yuzey px-6 py-8">
          <p className="text-[15px] leading-relaxed text-yazi-sonuk">
            {masa.cafeAdi} henüz ödüllerini hazırlamadı. Oynamaya devam et — ödüller açıldığında
            burada görünecek.
          </p>
        </div>
      )}

      {firsatlar.kampanyalar.length > 0 && (
        <OyuncuBolum baslik="Ürün indirimleri" renk="menekse" not="kasada geçerli">
          <ul className="flex flex-col gap-2.5">
            {firsatlar.kampanyalar.map((k) => (
              <li key={k.id}>
                <FirsatKarti
                  renk="menekse"
                  baslik={k.urunAdi}
                  sag={`%${k.yuzde}`}
                  alt={`${k.bitis.toLocaleDateString("tr-TR", {
                    day: "numeric",
                    month: "long",
                  })} tarihine kadar`}
                />
              </li>
            ))}
          </ul>
        </OyuncuBolum>
      )}

      {firsatlar.oduller.length > 0 && (
        <OyuncuBolum baslik="Çıkabilecek ödüller" renk="amber" not="oyundan ve çarktan">
          <ul className="flex flex-col gap-2.5">
            {firsatlar.oduller.map((odul) => (
              <li key={odul.id}>
                <FirsatKarti
                  renk="amber"
                  baslik={odul.baslik}
                  aciklama={odul.aciklama ?? undefined}
                  /* E9: ödülün TL değeri oyuncuya GÖSTERİLMİYOR. Kasiyer
                     ekranında ortaya çıkıyor; burada yalnızca adı var. */
                  alt={
                    odul.kanitSeviyesi >= 3 ? "Masada 5 dakika sonra" : "Konum doğrulanınca"
                  }
                />
              </li>
            ))}
          </ul>
        </OyuncuBolum>
      )}

      {/* Ekran bilgi verir, işlem yapmaz: ödül kazanma oyunun sonunda ya da
          çarkta olur, kupon kullanma kasada. Satırlara dokunulmaz. */}
      <p className="border-l-2 border-cizgi pl-4 text-[13px] leading-relaxed text-yazi-sonuk">
        Bu ödüller kafeye özel ve <strong className="text-yazi">satın alınmaz</strong>: oyun
        sonunda ya da şans çarkında düşerler. Kazandığın kupon &quot;Ödüllerim&quot; ekranında
        görünür ve kasada kullanılır.
      </p>
    </OyuncuSayfa>
  );
}

/**
 * Tek fırsat.
 *
 * Kart tıklanabilir **değil**: bu ekranda yapılacak bir işlem yok, ödül
 * oyunun sonunda ya da çarkta düşüyor. Tıklanır görünen bir kart,
 * dokunup hiçbir şey olmadığında ekranı bozuk gösterir.
 */
function FirsatKarti({
  renk,
  baslik,
  aciklama,
  sag,
  alt,
}: {
  renk: "menekse" | "amber";
  baslik: string;
  aciklama?: string;
  /** Sağ üstte duran büyük değer — yalnızca yüzde kampanyalarında. */
  sag?: string;
  alt: string;
}) {
  const r = RENK[renk];

  return (
    <div
      className="relative overflow-hidden rounded-2xl px-5 py-4"
      style={{
        background: `linear-gradient(130deg, ${r.zemin} 0%, #ffffff 90%)`,
        border: `1px solid ${r.canli}`,
      }}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute -right-4 -bottom-6"
        style={{ color: r.ana, opacity: 0.15 }}
      >
        <Gorsel ad={gorselSec(baslik)} boy={110} />
      </span>

      <div className="relative">
        <div className="flex items-baseline justify-between gap-3">
          <span className="font-display text-lg leading-tight font-bold">{baslik}</span>
          {sag && (
            <span
              className="shrink-0 font-data text-2xl leading-none font-bold tabular"
              style={{ color: r.ana }}
            >
              {sag}
            </span>
          )}
        </div>

        {aciklama && (
          <p className="mt-1 text-[13px] leading-relaxed text-yazi-sonuk">{aciklama}</p>
        )}

        <div className="mt-2.5 etiket-caps" style={{ color: r.koyu }}>
          {alt}
        </div>
      </div>
    </div>
  );
}
