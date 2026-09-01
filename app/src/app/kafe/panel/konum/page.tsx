import { kafeYoneticisiGerekli } from "@/domain/yetki";
import { konumVarMi } from "@/domain/cafe";
import { GEOFENCE_METRE } from "@/domain/masa";
import {
  IsletmeSayfa,
  IsletmeBaslik,
  Bolum,
  IsletmeUyari,
} from "@/components/isletme";
import { SayiKarti, IKON } from "@/components/gosterge";
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
            doğrulayamıyor; puan, ödül ve kupon{" "}
            <strong>hiç kazanılmıyor</strong>.
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
          {/* Ü62: panelin gösterge diliyle aynı kart. Bu sayfa dar
              kalıyor — form sayfası ve genişledikçe doldurulması
              zorlaşır — ama kartların dili ortak. */}
          <div className="grid grid-cols-2 gap-3">
            <SayiKarti
              etiket="Enlem"
              deger={konum.lat!.toFixed(5)}
              ikon={IKON.masa}
              alan="masa"
            />
            <SayiKarti
              etiket="Yarıçap"
              deger={`${GEOFENCE_METRE} m`}
              alt="bu mesafede doğrulanır"
              ikon={IKON.onay}
              alan="genel"
              vurgulu
            />
          </div>
          <p className="mt-3 font-data text-[11px] text-yazi-sonuk tabular">
            Boylam {konum.lng!.toFixed(5)}
          </p>
          <p className="mt-2 text-[13px] leading-relaxed text-yazi-sonuk">
            Oyuncu bu noktanın{" "}
            <strong className="text-yazi">{GEOFENCE_METRE} metre</strong>{" "}
            yakınındaysa konumu doğrulanmış sayılır. Kafe taşındıysa buradan
            güncelle.
          </p>
        </Bolum>
      )}

      <Bolum baslik="Ne saklanıyor">
        <p className="text-[14px] leading-relaxed text-yazi-sonuk">
          Kafenin konumu işletme verisidir ve açıkta durur. Oyuncunun konumu{" "}
          <strong className="text-yazi">hiç saklanmaz</strong> — yalnızca kafeye
          olan mesafesi hesaplanır ve o kaydedilir.
        </p>
      </Bolum>
    </IsletmeSayfa>
  );
}
