import { redirect } from "next/navigation";
import { masayaOturt } from "@/domain/masaya-oturt";
import * as masaOturumu from "@/domain/masa";
import { cookies } from "next/headers";
import { biletCoz, MASA_COOKIE } from "@/domain/qr";
import * as oturum from "@/domain/session";
import * as misafir from "@/domain/misafir";
import * as cark from "@/domain/cark";
import { kodEkrandaGosterilir } from "@/sms";
import * as oyunSecimi from "@/domain/oyun-secimi";
import { withBypass } from "@/db/context";
import { Sayfa } from "@/components/ui";
import { KoyuKart } from "@/components/oyuncu";
import { LooplyLogo } from "@/components/logo";
import { LoopySozu } from "@/components/loopy-sozu";
import { katalogSirasi } from "@/oyunlar/katalog";
import { MisafirKabugu } from "./misafir-kabuk";
import { MisafirCarki } from "./cark-kabuk";

export const dynamic = "force-dynamic";

/**
 * Misafir oyun ekranı — karekodu okutan kişinin ilk gördüğü yer (Ü35).
 *
 * Kayıt burada İSTENMİYOR. Oyuncu oynuyor, sonucu imzalı bir talebe yazılıyor
 * ve hesabına geçtiğinde o talep normal yoldan bozduruluyor. Ürün kuralları
 * gevşemiyor: kayıt öncesi hiçbir deftere yazılmıyor, ödül de K2 olmadan
 * açılmıyor — ekran ikisini de dürüstçe söylüyor.
 *
 * Girişli oyuncunun burada işi yok: onun için `/oyna` zaten var ve orada
 * oynadığı oyun doğrudan hesabına yazılıyor.
 */
export default async function HemenSayfasi({
  searchParams,
}: {
  searchParams: Promise<{ cark?: string }>;
}) {
  const sp = await searchParams;
  const acikOturum = await oturum.oku();
  if (acikOturum?.rol === "oyuncu") {
    // ⚠️ Ü95: yollamadan ÖNCE masaya oturt. Eskiden burada yalnızca
    // yönlendirme vardı ve zaten girişli oyuncu karekodu okuttuğunda masa
    // oturumu HİÇ açılmıyordu; ana ekranda "Kafe dışındasın" görüyor,
    // karekodu tekrar okutuyor, yine aynı ekrana düşüyordu. İlk ziyarette
    // çalışması hatayı gizliyordu — kayıt akışı oturumu kendisi açıyor.
    await masayaOturt(acikOturum.ozneId);

    /**
     * ⚠️ Ü96: karekodu okutan girişli oyuncu **çarka** gidiyor, ana ekrana
     * değil. Ürün sahibi: *"karekodu okutunca otomatik direkt çarka
     * çevirmeyle başlamalı."* Misafir zaten burada çarkı görüyordu;
     * girişli oyuncu `/oyna`'ya düşüp çarkı bir kart olarak görüyor ve
     * çoğu zaman hiç çevirmiyordu — aynı karekod, iki farklı ilk deneyim.
     *
     * Çark kapalıysa (bugün çevrilmiş) ana ekrana gidiyor: tam ekran bir
     * sahnenin tek işi "yarın gel" demek olmamalı.
     */
    const masaBilgisi = await masaOturumu.aktif(acikOturum.ozneId);
    if (masaBilgisi) {
      const c = await cark.durum({ playerId: acikOturum.ozneId, cafeId: masaBilgisi.cafeId });
      if (c.acik) redirect("/cark?cark=1");
    }
    redirect("/oyna");
  }

  const c = await cookies();
  const bilet = c.get(MASA_COOKIE)?.value;
  const masaBilet = bilet ? biletCoz(bilet) : null;

  // Masa bileti yoksa misafir akışı yok: hangi kafede olduğunu bilmeden
  // oynatılan oyun hiçbir talebe bağlanamaz.
  if (!masaBilet) redirect("/giris");

  const masa = await withBypass("misafir — masa bilgisi", (db) =>
    db.one<{ cafe_adi: string; masa_adi: string; kafe_konumu_var: boolean }>(
      // Ü95: kafenin konumu yoksa doğrulama hiçbir zaman başarılı olamaz;
      // ekran bunu bilmezse çalışmayan bir "Doğrula" düğmesi gösteriyor.
      `SELECT c.name AS cafe_adi, t.label AS masa_adi,
              (c.lat IS NOT NULL AND c.lng IS NOT NULL) AS kafe_konumu_var
         FROM cafe_tables t JOIN cafes c ON c.id = t.cafe_id
        WHERE t.id = $1 AND c.id = $2 AND c.status = 'approved'`,
      [masaBilet.tableId, masaBilet.cafeId],
    ),
  );
  if (!masa) redirect("/giris?hata=masa");

  // Konum çerezden okunuyor: sayfa yenilense de ölçüm kaybolmasın.
  const konum = misafir.konumOku(c.get(misafir.KONUM_COOKIE)?.value, masaBilet.cafeId);

  // Ü49: ilk karekodda çark. Zaten çevirdiyse sonucu duruyor; dilimler
  // sunucudan geliyor ki istemci listeyi düzenleyip ödül uyduramasın.
  const carkTalebi = cark.talepCoz(c.get(cark.TALEP_COOKIE)?.value);
  const carkDurumu = await cark.misafirDurumu(masaBilet.cafeId);

  // ⚠️ Ü109: misafir akışı da kafenin açık listesinden geçiyor. Yalnızca
  // girişli ekranları süzseydik karekodu okutan misafir kapalı bir oyunu
  // seçer, `basla` onu reddeder ve ilk deneyimi bir hata ekranı olurdu.
  const acikOyunlar = await oyunSecimi.acikOyunlar(masaBilet.cafeId);
  // Ü195: bugünün oyunu misafirde de işaretleniyor — kart onu gösteriyor
  // ve girişli oyuncuyla aynı kart olmasının şartı bu alanın dolu olması.
  const gununOyunu = await oyunSecimi.gununOyunuKafede(masaBilet.cafeId);

  return (
    <Sayfa>
      {/*
        🔴 Başlık KOYU KART — Ü194.

        Burası **karekodu okutan müşterinin ürünle ilk karşılaştığı
        ekran** ve Ü171–Ü192 arasında oyuncu tarafının her yüzeyi koyu
        bilete geçerken bu ekrana hiç dokunulmadı. Ürün sahibi
        *"buranın arayüzünü de düzeltmemişsin"* dedi.

        Eskiden üç ayrı parça vardı: `MasaKunyesi` (mavi çerçeveli beyaz
        kutu), `Baslik` ve bir paragraf. Üçü de `components/ui`den, yani
        **işletme panelinin** takımından geliyordu — oyuncu tarafının
        kendi kabuğu (`KoyuKart`, `SayfaBasi`) burada hiç
        kullanılmamıştı. Ekran o yüzden ürünün geri kalanına değil,
        yönetim ekranlarına benziyordu.

        ⚠️ Masa künyesi SİLİNMEDİ, kartın içine girdi. Misafirin ilk
        sorusu "neredeyim" ve cevabın ayrı bir kutuda durması için bir
        sebep yok; kartın söylediği şeyin parçası.

        ⚠️ Loopy ilk kez BURADA görünüyor. Karekodu okutan kişi
        maskotla bu ekranda tanışıyor — `/oyna`daki karşılama kartının
        misafir karşılığı, birebir aynı ölçülerle.
      */}
      <div className="mb-7">
        <KoyuKart className="pt-5 pb-9">
          <div className="flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <LooplyLogo boyut={30} beyaz />
              <p className="etiket-caps mt-5 text-white/60">Hoş geldin</p>
              <h1 className="mt-1.5 font-display text-3xl leading-none font-extrabold tracking-tight text-white">
                Önce çevir
              </h1>
              {/* ⚠️ Kafe ve masa aynı satırda: karekodun hangi masadan
                  okutulduğu, ödülün hangi kafeye yazılacağını belirleyen
                  şey (Ü35). Küçük ama gizlenecek bir bilgi değil. */}
              <p className="mt-2.5 text-[13px] leading-relaxed text-white/70">
                {masa.cafe_adi} · {masa.masa_adi}
              </p>
            </div>

            {/* ⚠️ Kolon SABİT genişlikte, `-mr-3 -mb-9` ile kartın kendi
                iç dolgusuna taşıyor — `/oyna` ve `/profil`deki
                kardeşleriyle birebir aynı ölçü (Ü178, Ü189). */}
            <div className="-mr-3 -mb-9 w-[9rem] shrink-0 self-end">
              {/* ⚠️ Balon "Hoş geldin!" DEMİYOR: üstteki etiket zaten
                  onu söylüyordu ve ekranda aynı cümle iki kez
                  duruyordu. Balonun işi bilgi taşımak — sıradaki adımı
                  gösteriyor. */}
              <LoopySozu soz="Önce çarkı çevir!" ifade="neseli" boy={150} yon="ust" />
            </div>
          </div>
        </KoyuKart>
      </div>

      <p className="mb-7 text-[15px] leading-relaxed text-yazi-sonuk">
        Hesap açmadan çevirebilir, oynayabilirsin. Kazandığın ödül sonucunla birlikte saklanır;
        hesabına girdiğinde işlenir.
      </p>

      {/* Ü59: çark artık tam ekran sahnede açılıyor; buradaki kart
          davetin kendisi ve kendi çerçevesini taşıyor. Dış sarmalayıcı
          çift çerçeve yapıyordu. */}
      {carkDurumu.length > 0 && (
        <section className="mb-10">
          <MisafirCarki
            dilimler={carkDurumu}
            kazanilan={carkTalebi ? carkTalebi.baslik : null}
            otomatikAc={sp.cark === "1"}
          />
        </section>
      )}

      {/*
        ⚠️ Liste `katalogSirasi()`den — Ü195. Misafir ekranı burada kendi
        listesini kuruyordu: kategori yoktu, bugünün oyunu yoktu, sıra
        `acikOyunlar`ın kendi sırasıydı. Karta *"birebir aynı"* demek,
        kartın beslendiği veriyi de aynı yerden almak demek.
      */}
      <MisafirKabugu
        oyunlar={katalogSirasi(acikOyunlar, gununOyunu.id)}
        kafeAdi={masa.cafe_adi}
        kafeKonumuVar={masa.kafe_konumu_var}
        konumBaslangic={konum ? { dogrulandi: konum.k2, mesafeM: konum.mesafeM } : null}
        demoKapisi={kodEkrandaGosterilir()}
      />

      <p className="mt-8 font-data text-[10px] leading-relaxed tracking-wide text-yazi-sonuk">
        Hesap açana kadar hiçbir bilgin kaydedilmiyor. Konumunu doğrularsan yalnızca kafeye olan
        uzaklığın hesaplanır; nerede olduğun saklanmaz.
      </p>
    </Sayfa>
  );
}
