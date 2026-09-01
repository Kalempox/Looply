import Link from "next/link";
import { redirect } from "next/navigation";
import * as oturum from "@/domain/session";
import * as masaOturumu from "@/domain/masa";
import { ozet } from "@/domain/puan";
import { buradakiler } from "@/domain/firsat";
import { Sayfa, Baslik, MasaKunyesi } from "@/components/ui";
import { OyuncuNav, NavBosluk } from "@/components/oyuncu-nav";

export const dynamic = "force-dynamic";

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
 */
export default async function FirsatlarSayfasi() {
  const o = await oturum.oku();
  if (!o || o.rol !== "oyuncu") redirect("/giris");

  const masa = await masaOturumu.aktif(o.ozneId);

  if (!masa) {
    return (
      <Sayfa>
        <Baslik ust="Fırsatlar">Buradaki fırsatlar</Baslik>
        <div className="rounded-2xl border border-cizgi bg-yuzey px-6 py-8">
          <div className="text-3xl leading-none" aria-hidden>
            📍
          </div>
          <p className="mt-4 text-[15px] leading-relaxed text-yazi-sonuk">
            Şu an bir kafede değilsin. Fırsatlar kafeye özel — masadaki karekodu okuttuğunda o
            kafenin ödülleri ve indirimleri burada görünür.
          </p>
          <Link
            href="/oyna"
            className="mt-5 inline-block text-[14px] text-vurgu underline"
          >
            Ana ekrana dön
          </Link>
        </div>
        <NavBosluk />
        <OyuncuNav aktif="/oyna" />
      </Sayfa>
    );
  }

  const [firsatlar, sayilar] = await Promise.all([
    buradakiler(masa.cafeId),
    ozet(o.ozneId, masa.cafeId),
  ]);

  const bosMu = !firsatlar.oduller.length && !firsatlar.kampanyalar.length;

  return (
    <Sayfa>
      <Baslik ust="Fırsatlar">Buradaki fırsatlar</Baslik>
      <MasaKunyesi kafe={masa.cafeAdi} masa={masa.masaAdi} />

      {/* Ü52: puan artık harcanmıyor. Ekranın başında puan bakiyesi
          durursa "bunlarla ödül alacağım" diye okunuyor; oysa ödül
          oyundan ve çarktan düşüyor. Puan sıralamada ve seviyede. */}
      <div className="mb-8 rounded-2xl border border-cizgi bg-yuzey px-4 py-3.5">
        <div className="etiket-caps text-yazi-sonuk">Bu kafedeki puanın</div>
        <div className="mt-1.5 font-data text-2xl leading-none font-bold text-vurgu tabular">
          {(sayilar.kafePuani ?? 0).toLocaleString("tr-TR")}
        </div>
        <p className="mt-1.5 text-[12px] leading-relaxed text-yazi-sonuk">
          Puan sıralamanı ve seviyeni belirler — ödülle takas edilmez.
        </p>
      </div>

      {bosMu && (
        <div className="rounded-2xl border border-cizgi bg-yuzey px-6 py-8">
          <p className="text-[15px] leading-relaxed text-yazi-sonuk">
            {masa.cafeAdi} henüz ödüllerini hazırlamadı. Oynamaya devam et — ödüller açıldığında
            burada görünecek.
          </p>
        </div>
      )}

      {firsatlar.kampanyalar.length > 0 && (
        <section className="mb-10">
          <h2 className="mb-3 etiket-caps text-odul-koyu">
            Ürün indirimleri
          </h2>
          <ul className="flex flex-col gap-2.5">
            {firsatlar.kampanyalar.map((k) => (
              <li key={k.id} className="rounded-2xl border border-odul bg-yuzey px-5 py-4">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="font-display text-xl leading-tight font-bold">{k.urunAdi}</span>
                  <span className="font-data text-2xl leading-none font-bold text-odul-koyu tabular">
                    %{k.yuzde}
                  </span>
                </div>
                <div className="mt-2 font-data text-[10px] text-yazi-sonuk">
                  {k.bitis.toLocaleDateString("tr-TR", { day: "numeric", month: "long" })}{" "}
                  tarihine kadar
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {firsatlar.oduller.length > 0 && (
        <section>
          <h2 className="mb-3 etiket-caps text-yazi-sonuk">Çıkabilecek ödüller</h2>
          <ul className="flex flex-col gap-2.5">
            {firsatlar.oduller.map((odul) => (
              <li key={odul.id} className="rounded-2xl border border-cizgi bg-yuzey px-5 py-4">
                <div className="font-display text-lg leading-tight font-bold">{odul.baslik}</div>
                {odul.aciklama && (
                  <p className="mt-1 text-[13px] leading-relaxed text-yazi-sonuk">
                    {odul.aciklama}
                  </p>
                )}
                {/* E9: ödülün TL değeri oyuncuya GÖSTERİLMİYOR. Kasiyer
                    ekranında ortaya çıkıyor; burada yalnızca adı var. */}
                <div className="mt-3 etiket-caps text-vurgu">
                  {odul.kanitSeviyesi >= 3 ? "Masada 5 dakika sonra" : "Konum doğrulanınca"}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Ekran bilgi verir, işlem yapmaz: ödül kazanma oyunun sonunda ya da
          çarkta olur, kupon kullanma kasada. Satırlara dokunulmaz. */}
      <p className="mt-10 border-l-2 border-cizgi pl-4 text-[13px] leading-relaxed text-yazi-sonuk">
        Bu ödüller kafeye özel ve <strong className="text-yazi">satın alınmaz</strong>: oyun
        sonunda ya da şans çarkında düşerler. Kazandığın kupon &quot;Ödüllerim&quot; ekranında
        görünür ve kasada kullanılır.
      </p>

      <NavBosluk />
      <OyuncuNav aktif="/oyna" />
    </Sayfa>
  );
}
