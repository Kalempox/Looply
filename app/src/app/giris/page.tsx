import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { biletCoz, MASA_COOKIE } from "@/domain/qr";
import { withBypass } from "@/db/context";
import * as oturum from "@/domain/session";
import * as masaOturumu from "@/domain/masa";
import { takmaAd } from "@/domain/player";
import { Sayfa, Baslik, MasaKunyesi, Uyari } from "@/components/ui";
import { GirisFormu } from "./form";

export const dynamic = "force-dynamic";

type Masa = { cafeAdi: string; masaAdi: string };

async function masaBilgisi(cafeId: string, tableId: string): Promise<Masa | null> {
  const r = await withBypass("masa bilgisi", (db) =>
    db.one<{ cafe_adi: string; masa_adi: string }>(
      `SELECT c.name AS cafe_adi, t.label AS masa_adi
         FROM cafe_tables t JOIN cafes c ON c.id = t.cafe_id
        WHERE t.id = $1 AND c.id = $2`,
      [tableId, cafeId],
    ),
  );
  return r ? { cafeAdi: r.cafe_adi, masaAdi: r.masa_adi } : null;
}

/**
 * Giriş ve kayıt.
 *
 * Bu sayfa **yan etkisiz**: masa bileti çerezden okunuyor, burada üretilmiyor.
 * Önceki sürümde adres çubuğundaki tek kullanımlık jeton burada tüketiliyordu
 * ve sayfa iki kez yüklendiğinde (Next.js ön yüklemesi) bağlantı düşüyordu.
 */
export default async function GirisSayfasi({
  searchParams,
}: {
  searchParams: Promise<{ hata?: string; silindi?: string }>;
}) {
  const sp = await searchParams;
  const acikOturum = await oturum.oku();
  const bilet = (await cookies()).get(MASA_COOKIE)?.value;
  const masaBilet = bilet ? biletCoz(bilet) : null;

  // Zaten girişli oyuncu karekod okuttuysa: masaya oturt, içeri al
  if (acikOturum?.rol === "oyuncu") {
    if (masaBilet) {
      await masaOturumu.ac({
        cafeId: masaBilet.cafeId,
        tableId: masaBilet.tableId,
        playerId: acikOturum.ozneId,
      });
      await takmaAd(masaBilet.cafeId, acikOturum.ozneId);
    }
    redirect("/oyna");
  }
  if (acikOturum) redirect("/");

  const masa = masaBilet ? await masaBilgisi(masaBilet.cafeId, masaBilet.tableId) : null;

  return (
    <Sayfa>
      {masa && <MasaKunyesi kafe={masa.cafeAdi} masa={masa.masaAdi} />}

      <Baslik ust={masa ? "Oyuna başla" : "Giriş"}>
        {masa ? "Önce seni tanıyalım" : "Looply'e gir"}
      </Baslik>

      <p className="mb-7 text-[15px] leading-relaxed text-yazi-sonuk">
        {masa
          ? "Numaranı doğruladıktan sonra oyunlar açılır. Kazandığın indirimler hesabına işlenir."
          : "Hesabın varsa parolanla gir, yoksa buradan aç. Parolanı unuttuysan e-postana kod göndeririz."}
      </p>

      {sp.hata === "masa" && (
        <div className="mb-6">
          <Uyari tur="bekle">Karekod tanınmadı. Masadaki kodu tekrar okutmayı dene.</Uyari>
        </div>
      )}

      {sp.silindi === "1" && (
        <div className="mb-6">
          <Uyari tur="bilgi">
            Hesap silme talebin alındı. 30 gün içinde tekrar giriş yaparsan vazgeçebilirsin.
          </Uyari>
        </div>
      )}

      <GirisFormu masadaMi={!!masa} />

      <p className="mt-8 font-data text-[10px] leading-relaxed tracking-wide text-yazi-sonuk">
        Telefon numaran şifreli saklanır ve üye işletmelerle paylaşılmaz. Kafeler seni yalnızca
        sana özel anonim bir kodla görür.
      </p>
    </Sayfa>
  );
}
