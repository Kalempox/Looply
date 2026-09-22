import Link from "next/link";
import { redirect } from "next/navigation";
import * as oturum from "@/domain/session";
import * as masaOturumu from "@/domain/masa";
import { ozet } from "@/domain/puan";
import { buradakiler } from "@/domain/firsat";
import { OyuncuSayfa, SayfaBasi, Sayac, OyuncuBolum } from "@/components/oyuncu";
import { Bilet } from "@/components/bilet";
import { gorselSec, GORSEL_RENGI } from "@/components/oyuncu-gorsel";

export const dynamic = "force-dynamic";
export const metadata = { title: "Fırsatlar · Looply" };

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
 * ── Görsel dil (Ü66 → Ü256) ─────────────────────────────────
 *
 * Ekran oyuncu tarafının geri kalanından kopuktu: `Baslik`, `MasaKunyesi`
 * ve düz beyaz satırlar. Ü66'da ortak kabuğa oturdu.
 *
 * 🔴 Ü256'da ikinci kez geride kaldığı görüldü. Ü71'de bütün kartlar
 * pastel yapılmıştı; Ü171–Ü191 arasında ana ekran, katalog, profil ve
 * Ödüllerim **koyu bilete** taşındı ve bu ekran listede hiç yoktu.
 * Ürün sahibi: *"bunlar da normal tanımlı kuponların tasarımıyla aynı
 * olsun."*
 *
 * Kartlar artık `Bilet`in kendisi — taklidi değil. Yani kupon tasarımı
 * değiştiği gün burası da kendiliğinden değişiyor (Ü71'in dersi: yüzey
 * tek yerden gelmezse her turda bir ekran geride kalıyor).
 *
 * ⚠️ `bilgi` kipinde: tam renkli ama **tıklanmıyor**. Sebebi aşağıda
 * `FirsatKarti`da yazılı ve değişmedi.
 */
export default async function FirsatlarSayfasi() {
  const o = await oturum.oku();
  if (!o || o.rol !== "oyuncu") redirect("/giris");

  const masa = await masaOturumu.aktif(o.ozneId);

  if (!masa) {
    return (
      <OyuncuSayfa aktif="/oyna" geri={{ href: "/oyna", etiket: "Ana ekran" }}>
        <SayfaBasi ust="Fırsatlar" baslik="Buradaki fırsatlar" renk="yesil" gorsel="etiket" />
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
      <SayfaBasi ust={masa.cafeAdi} baslik="Buradaki fırsatlar" renk="yesil" gorsel="etiket">
        <div className="grid grid-cols-2 gap-2.5">
          {/* Ü52: puan artık harcanmıyor. Ekranın başında tek başına
              durursa "bunlarla ödül alacağım" diye okunuyor; bu yüzden
              yanında fırsat sayısıyla birlikte ve altında ne işe
              yaradığı yazılı. */}
          <Sayac
            etiket="Bu kafedeki puanın"
            deger={(sayilar.kafePuani ?? 0).toLocaleString("tr-TR")}
            renk="yesil"
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
                  kafe={masa.cafeAdi}
                  baslik={`${k.urunAdi} · %${k.yuzde}`}
                  /* Kampanyanın bitişi VAR — biletin tarih satırına o
                     giriyor. Ödülde yok; orası boş kalıyor. */
                  son={k.bitis.toLocaleDateString("tr-TR", {
                    day: "numeric",
                    month: "short",
                  })}
                  tarihOneki="son"
                  bilgi="Kasada geçerli"
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
                  kafe={masa.cafeAdi}
                  baslik={odul.baslik}
                  /* E9: ödülün TL değeri oyuncuya GÖSTERİLMİYOR. Kasiyer
                     ekranında ortaya çıkıyor; burada yalnızca adı var. */
                  bilgi={
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
 * Tek fırsat — kuponun kendi bileti (Ü256).
 *
 * ⚠️ Kart tıklanabilir **değil** ve bu kural Ü66'dan beri aynı: bu
 * ekranda yapılacak bir işlem yok, ödül oyunun sonunda ya da çarkta
 * düşüyor. Tıklanır görünen bir kart, dokunup hiçbir şey olmadığında
 * ekranı bozuk gösterir.
 *
 * `Bilet`in `bilgi` kipi tam bunun için eklendi: tam renkli bilet,
 * tıklanmıyor, kesikli çizginin altında "Kasada göster →" yerine
 * fırsatın kendi cümlesi duruyor.
 *
 * Renk de çizim de fırsatın kendisinden geliyor (Ü67): "Tiramisu"
 * pasta, "50 TL" para. Bölüm başlığının rengiyle eşleşmesi gerekmiyor
 * — kart neyi anlatıyorsa o.
 */
function FirsatKarti({
  kafe,
  baslik,
  son,
  tarihOneki,
  bilgi,
}: {
  kafe: string;
  baslik: string;
  /** Kampanyanın bitişi. Ödülde yok — henüz kazanılmadı. */
  son?: string;
  tarihOneki?: string;
  /** Kesikli çizginin altındaki cümle. */
  bilgi: string;
}) {
  const gorsel = gorselSec(baslik);

  return (
    <Bilet
      veri={{
        // Tıklanmayan kart; adres yalnızca tipin istediği alan.
        href: "#",
        kafe,
        baslik,
        gorsel,
        renk: GORSEL_RENGI[gorsel],
        son,
        tarihOneki,
      }}
      bilgi={bilgi}
    />
  );
}
