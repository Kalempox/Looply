import { kafeYoneticisiGerekli } from "@/domain/yetki";
import * as oyunSecimi from "@/domain/oyun-secimi";
import { IsletmeSayfa, IsletmeBaslik, Bolum, IsletmeUyari } from "@/components/isletme";
import { SayiKarti, IKON } from "@/components/gosterge";
import { OyunAnahtari } from "./kontroller";

export const dynamic = "force-dynamic";
export const metadata = { title: "Oyunlar · Looply" };

/**
 * Ü109 · Kafe oyun yönetimi.
 *
 * ── Neden bir kafe oyunu kapatmak istesin ───────────────────
 *
 * Oyunlar farklı şeyler istiyor: Kelime okuma-yazma ve dikkat, Yılan
 * refleks. Çocuk ağırlıklı bir kafe Kelime'yi, sessiz çalışma kafesi
 * Yılan'ı kapatmak isteyebilir. Bu bir ekonomi kararı değil, mekânın
 * kendi kararı.
 *
 * ── ⚠️ Ekranda oynanma sayısı DA var ────────────────────────
 *
 * Kapatma düğmesini tek başına koymak, kafeyi kör bir karara zorlardı.
 * "Son 7 günde 43 kez oynandı" satırı, kapatmadan önce görülmesi gereken
 * tek şey — en çok oynanan oyunu kapatmak çoğu zaman istenmiyor.
 *
 * ── ⚠️ Bugünün oyunu kafeye göre ────────────────────────────
 *
 * Kafe o günün bonuslu oyununu kapattıysa rotasyon **kalan oyunlar
 * üzerinden** dönüyor. Ekran bunu yazıyor: kafe, kapattığı oyunun
 * bonusu da kaydırdığını görmeli.
 */
export default async function PanelOyunlarSayfasi() {
  const o = await kafeYoneticisiGerekli();
  const [liste, bugun] = await Promise.all([
    oyunSecimi.panelListesi(o.cafeId),
    oyunSecimi.gununOyunuKafede(o.cafeId),
  ]);

  const acikSayisi = liste.filter((g) => g.acik).length;
  const toplamOyun = liste.reduce((t, g) => t + g.oyun, 0);
  const enCok = [...liste].sort((a, b) => b.oyun - a.oyun)[0];

  return (
    <IsletmeSayfa genis>
      <IsletmeBaslik
        ust="İşletme paneli"
        alt="Hangi oyunlar müşterine açık olsun. Kapattığın oyun katalogdan kalkar."
      >
        Oyunlar
      </IsletmeBaslik>

      {acikSayisi === 1 && (
        <div className="mb-8">
          <IsletmeUyari tur="bilgi">
            Tek oyun açık. En az bir oyun her zaman açık kalmak zorunda —
            müşteri karekodu okutunca oynayacak bir şey bulamazsa ürün o
            masada işlemiyor demektir.
          </IsletmeUyari>
        </div>
      )}

      <section className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-3">
        <SayiKarti
          etiket="Açık oyun"
          deger={String(acikSayisi)}
          alt={`${liste.length} oyun var`}
          ikon={IKON.onay}
          alan="masa"
          vurgulu
        />
        <SayiKarti
          etiket="Bugünün oyunu"
          deger={bugun.ad}
          alt="×2 puan veriyor"
          ikon={IKON.saat}
          alan="masa"
        />
        <SayiKarti
          etiket="Son 7 günde"
          deger={String(toplamOyun)}
          alt={enCok && enCok.oyun > 0 ? `en çok ${enCok.ad}` : "henüz veri yok"}
          ikon={IKON.kisi}
          alan="kisi"
        />
      </section>

      <Bolum baslik="Oyunlar" alt="Kapatmadan önce son 7 günün oynanma sayısına bak.">
        <ul className="divide-y divide-cizgi border-y border-cizgi">
          {liste.map((g) => (
            <li
              key={g.id}
              className={`flex items-start gap-4 py-4 ${g.acik ? "" : "opacity-55"}`}
            >
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-baseline gap-2">
                  <span className="text-[15px] font-semibold">{g.ad}</span>
                  {g.id === bugun.id && (
                    <span className="etiket-caps text-odul-koyu">bugünün oyunu</span>
                  )}
                  {!g.acik && <span className="etiket-caps text-yazi-sonuk">kapalı</span>}
                </span>
                <span className="mt-0.5 block text-[13px] leading-relaxed text-yazi-sonuk">
                  {g.ozet}
                </span>
                <span className="mt-1 block font-data text-[11px] text-yazi-sonuk">
                  {g.oyun === 0
                    ? "son 7 günde hiç oynanmadı"
                    : `son 7 günde ${g.oyun} kez oynandı`}
                </span>
              </span>

              <OyunAnahtari oyunId={g.id} acik={g.acik} oyunAdi={g.ad} />
            </li>
          ))}
        </ul>
      </Bolum>

      {/* ⚠️ Kafe, kapatmanın bonusu da kaydırdığını bilmeli: "bugünün
          oyunu" platformun takvimi sanılırsa, kapattığı oyunun bonus
          gününde neden başka bir oyunun öne çıktığını anlamaz. */}
      <p className="mt-2 mb-4 border-l-2 border-cizgi pl-4 text-[13px] leading-relaxed text-yazi-sonuk">
        Bugünün oyunu her gün değişir ve <strong className="text-yazi">yalnızca açık
        oyunlar</strong> arasından seçilir. Bir oyunu kapatırsan sıra kalanlar üzerinden
        döner.
      </p>

      <p className="mb-10 border-l-2 border-cizgi pl-4 text-[13px] leading-relaxed text-yazi-sonuk">
        Kapattığın oyun katalogdan kalkar ve başlatılamaz. Süren bir oyun varsa
        bitirilir ve kazanımı yazılır — oynanmış bir tur geri alınmaz.
      </p>
    </IsletmeSayfa>
  );
}
