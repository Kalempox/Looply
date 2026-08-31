import Link from "next/link";
import { kafeYoneticisiGerekli } from "@/domain/yetki";
import { konumVarMi } from "@/domain/cafe";
import { GEOFENCE_METRE } from "@/domain/masa";
import { IsletmeSayfa, IsletmeBaslik, Bolum, IsletmeUyari } from "@/components/isletme";
import { KonumOkuyucu } from "./kontroller";

export const dynamic = "force-dynamic";
export const metadata = { title: "Kafe konumu · CafePlay" };

/**
 * Kafe konumu — kurulumun en kritik adımı.
 *
 * ── Neden bu ekran sonradan yazıldı ─────────────────────────
 *
 * Koordinatı yalnızca geliştirme tohumu yazıyordu; panelde alanı yoktu.
 * Gerçek başvuru akışından geçmiş onaylı bir kafede sonucu şuydu: kurulum
 * tamamlanıyor, karekodlar masalara yapıştırılıyor ve **hiçbir oyuncu hiçbir
 * şey kazanamıyordu** — çünkü K2 hiç doğrulanamıyordu. Üstelik oyuncuya
 * "Konum doğrulanamadı" deniyordu; suç onun telefonundaymış gibi.
 *
 * Ekran bu yüzden yalnızca bir alan değil, bir **uyarı** da taşıyor: konum
 * yoksa ürün o kafede çalışmıyor ve bunu kafe sahibinin bilmesi gerekiyor.
 */
export default async function KonumSayfasi() {
  const o = await kafeYoneticisiGerekli();
  const konum = await konumVarMi(o.cafeId);

  return (
    <IsletmeSayfa>
      <IsletmeBaslik
        ust="İşletme paneli"
        alt="Oyuncunun kafede olduğunu doğrulamak için kafenin konumu gerekiyor."
      >
        Kafe konumu
      </IsletmeBaslik>

      {!konum.var && (
        <div className="mb-8">
          <IsletmeUyari>
            Kafenin konumu belirlenmemiş. Bu hâliyle oyuncular konumlarını
            doğrulayamıyor; puan, ödül ve kupon <strong>hiç kazanılmıyor</strong>.
          </IsletmeUyari>
        </div>
      )}

      <Bolum
        baslik="Konumu işaretle"
        alt="Kafenin içindeyken bu düğmeye bas. Telefonun konumu kafenin konumu olarak kaydedilir."
      >
        <KonumOkuyucu kayitli={konum.var} />
      </Bolum>

      {konum.var && (
        <Bolum baslik="Kayıtlı konum">
          <div className="overflow-hidden rounded-2xl border border-cizgi">
            <div className="grid grid-cols-2 gap-px bg-cizgi">
              <Deger etiket="Enlem" deger={konum.lat!.toFixed(5)} />
              <Deger etiket="Boylam" deger={konum.lng!.toFixed(5)} />
            </div>
          </div>
          <p className="mt-3 text-[13px] leading-relaxed text-yazi-sonuk">
            Oyuncu bu noktanın <strong className="text-yazi">{GEOFENCE_METRE} metre</strong>{" "}
            yakınındaysa konumu doğrulanmış sayılır. Kafe taşındıysa buradan güncelle.
          </p>
        </Bolum>
      )}

      <Bolum baslik="Ne saklanıyor">
        <p className="text-[14px] leading-relaxed text-yazi-sonuk">
          Kafenin konumu işletme verisidir ve açıkta durur. Oyuncunun konumu{" "}
          <strong className="text-yazi">hiç saklanmaz</strong> — yalnızca kafeye olan
          mesafesi hesaplanır ve o kaydedilir.
        </p>
      </Bolum>

      <Link href="/kafe/panel" className="text-[14px] text-yazi-sonuk underline">
        Panele dön
      </Link>
    </IsletmeSayfa>
  );
}

function Deger({ etiket, deger }: { etiket: string; deger: string }) {
  return (
    <div className="bg-yuzey px-4 py-4">
      <div className="etiket-caps text-[10px] text-yazi-sonuk">{etiket}</div>
      <div className="mt-1.5 font-data text-lg leading-none font-bold tabular">{deger}</div>
    </div>
  );
}
