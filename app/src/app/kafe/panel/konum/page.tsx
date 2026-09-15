import { kafeYoneticisiGerekli } from "@/domain/yetki";
import { konumVarMi } from "@/domain/cafe";
import * as ayar from "@/domain/ayar";
import {
  IsletmeSayfa,
  IsletmeBaslik,
  Bolum,
  IsletmeUyari,
} from "@/components/isletme";
import { SayiKarti, IKON } from "@/components/gosterge";
import { KonumOkuyucu, YaricapAyari } from "./kontroller";

export const dynamic = "force-dynamic";
export const metadata = { title: "Kafe konumu · Looply" };

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
  const [konum, yaricap] = await Promise.all([
    konumVarMi(o.cafeId),
    // Ü131: yarıçap artık kafenin ayarı, `masa.ts`teki sabit değil.
    ayar.sayiOku(o.cafeId, ayar.ANAHTARLAR.konumYaricapi),
  ]);

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
              deger={`${yaricap} m`}
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
            <strong className="text-yazi">{yaricap} metre</strong>{" "}
            yakınındaysa konumu doğrulanmış sayılır. Kafe taşındıysa buradan
            güncelle.
          </p>
        </Bolum>
      )}

      {/*
        Ü131: yarıçap ayarı. `masa.ts`te `GEOFENCE_METRE = 150` diye sabit
        yazılıydı ve her kafeye aynı çemberi uyguluyordu — AVM katındaki
        kafeyle sokak arası kafenin ihtiyacı aynı değil. 150 metre, yan
        binadaki birinin de "kafedeyim" sayılması demekti.
      */}
      <Bolum
        baslik="Doğrulama yarıçapı"
        alt="Kafenin kaç metre yakınındaki oyuncu 'kafede' sayılsın."
      >
        <div className="rounded-2xl border border-cizgi bg-yuzey px-5 py-5">
          <YaricapAyari mevcut={yaricap} />
        </div>
      </Bolum>

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
