import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { biletCoz, MASA_COOKIE } from "@/domain/qr";
import * as oturum from "@/domain/session";
import * as misafir from "@/domain/misafir";
import { kodEkrandaGosterilir } from "@/sms";
import { OYUNLAR } from "@/oyunlar";
import { withBypass } from "@/db/context";
import { Sayfa, Baslik, MasaKunyesi } from "@/components/ui";
import { MisafirKabugu } from "./misafir-kabuk";

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
  if (acikOturum?.rol === "oyuncu") redirect("/oyna");

  const c = await cookies();
  const bilet = c.get(MASA_COOKIE)?.value;
  const masaBilet = bilet ? biletCoz(bilet) : null;

  // Masa bileti yoksa misafir akışı yok: hangi kafede olduğunu bilmeden
  // oynatılan oyun hiçbir talebe bağlanamaz.
  if (!masaBilet) redirect("/giris");

  const masa = await withBypass("misafir — masa bilgisi", (db) =>
    db.one<{ cafe_adi: string; masa_adi: string }>(
      `SELECT c.name AS cafe_adi, t.label AS masa_adi
         FROM cafe_tables t JOIN cafes c ON c.id = t.cafe_id
        WHERE t.id = $1 AND c.id = $2 AND c.status = 'approved'`,
      [masaBilet.tableId, masaBilet.cafeId],
    ),
  );
  if (!masa) redirect("/giris?hata=masa");

  // Konum çerezden okunuyor: sayfa yenilense de ölçüm kaybolmasın.
  const konum = misafir.konumOku(c.get(misafir.KONUM_COOKIE)?.value, masaBilet.cafeId);

  return (
    <Sayfa>
      <MasaKunyesi kafe={masa.cafe_adi} masa={masa.masa_adi} />

      <Baslik ust="Hoş geldin">Önce oyna</Baslik>

      <p className="mb-7 text-[15px] leading-relaxed text-yazi-sonuk">
        Hesap açmadan oynayabilirsin. Kazandığın ödül sonucunla birlikte saklanır; hesabına
        girdiğinde işlenir.
      </p>

      <MisafirKabugu
        oyunlar={OYUNLAR.map((o) => ({
          id: o.id,
          ad: o.ad,
          ozet: o.ozet,
          emoji: o.emoji,
          bolumSayisi: o.bolumSayisi,
        }))}
        kafeAdi={masa.cafe_adi}
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
