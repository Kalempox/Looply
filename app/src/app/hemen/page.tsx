import { redirect } from "next/navigation";
import { masayaOturt } from "@/domain/masaya-oturt";
import { cookies } from "next/headers";
import { biletCoz, MASA_COOKIE } from "@/domain/qr";
import * as oturum from "@/domain/session";
import * as misafir from "@/domain/misafir";
import * as cark from "@/domain/cark";
import { kodEkrandaGosterilir } from "@/sms";
import { OYUNLAR } from "@/oyunlar";
import { withBypass } from "@/db/context";
import { Sayfa, Baslik, MasaKunyesi } from "@/components/ui";
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
export default async function HemenSayfasi() {
  const acikOturum = await oturum.oku();
  if (acikOturum?.rol === "oyuncu") {
    // ⚠️ Ü95: yollamadan ÖNCE masaya oturt. Eskiden burada yalnızca
    // yönlendirme vardı ve zaten girişli oyuncu karekodu okuttuğunda masa
    // oturumu HİÇ açılmıyordu; ana ekranda "Kafe dışındasın" görüyor,
    // karekodu tekrar okutuyor, yine aynı ekrana düşüyordu. İlk ziyarette
    // çalışması hatayı gizliyordu — kayıt akışı oturumu kendisi açıyor.
    await masayaOturt(acikOturum.ozneId);
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

  return (
    <Sayfa>
      <MasaKunyesi kafe={masa.cafe_adi} masa={masa.masa_adi} />

      <Baslik ust="Hoş geldin">Önce çevir</Baslik>

      <p className="mb-7 text-[15px] leading-relaxed text-yazi-sonuk">
        Hesap açmadan çevirebilir, oynayabilirsin. Kazandığın ödül sonucunla birlikte saklanır;
        hesabına girdiğinde işlenir.
      </p>

      {/* Ü59: çark artık tam ekran sahnede açılıyor; buradaki kart
          davetin kendisi ve kendi çerçevesini taşıyor. Dış sarmalayıcı
          çift çerçeve yapıyordu. */}
      {carkDurumu.length > 0 && (
        <section className="mb-10">
          <MisafirCarki dilimler={carkDurumu} kazanilan={carkTalebi ? carkTalebi.baslik : null} />
        </section>
      )}

      <MisafirKabugu
        oyunlar={OYUNLAR.map((o) => ({
          id: o.id,
          ad: o.ad,
          ozet: o.ozet,
          emoji: o.emoji,

        }))}
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
