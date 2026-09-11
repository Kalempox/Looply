import { kafeYoneticisiGerekli } from "@/domain/yetki";
import * as masaYonetim from "@/domain/masa-yonetim";
import {
  IsletmeSayfa,
  IsletmeBaslik,
  Bolum,
  IsletmeUyari,
  IkiKolon,
} from "@/components/isletme";
import { SayiKarti, CubukListe, IKON } from "@/components/gosterge";
import { TURLER, TUR_ADI } from "@/domain/karekod-turu";
import { MasaEkleme, DurumDugmesi, YazdirDugmesi } from "./kontroller";

export const dynamic = "force-dynamic";
export const metadata = { title: "Karekodlar · Looply" };

/**
 * D11 · Masa karekodları.
 *
 * ── Neden bu ekran gerekiyordu ──────────────────────────────
 *
 * Masalar yalnızca geliştirme tohumuyla üretiliyordu. Gerçek bir başvuru
 * onaylanıp panel açıldığında kafenin **hiç masası olmuyor** — yani
 * yapıştıracak karekodu da yok ve ürünün giriş kapısı hiç açılmıyor.
 *
 * ── Kod basılıdır ve değişmez ───────────────────────────────
 *
 * Karekod `qr_secret`ten türüyor ve sır bir kez üretiliyor. Değişebilseydi
 * masadaki her etiket bir gün sessizce ölürdü. Bu yüzden masa silinmiyor,
 * **kapatılıyor**: kapalı masanın kodu çözülmüyor ama geçmiş raporlar
 * bozulmuyor.
 */
export default async function MasalarSayfasi() {
  const o = await kafeYoneticisiGerekli();
  const [masalar, kullanim] = await Promise.all([
    masaYonetim.listele(o.cafeId),
    masaYonetim.kullanim(o.cafeId),
  ]);
  const aktifSayisi = masalar.filter((m) => m.aktif).length;

  // Ü62: "hangi masa var" değil, **hangi masa çalışıyor**. Camdaki
  // masanın kodunun hiç okutulmadığını görmek, kodu taşımak için tek
  // sebep.
  const calisan = kullanim.filter((k) => k.oyun > 0).length;
  const toplamOyun = kullanim.reduce((t, k) => t + k.oyun, 0);
  const enYogun = kullanim[0]?.oyun ? kullanim[0] : null;

  return (
    <IsletmeSayfa genis>
      <IsletmeBaslik
        ust="İşletme paneli"
        alt="Masaya, kasaya, menüye ve fişe basılacak kodlar. Kod basılıdır ve değişmez."
      >
        Karekodlar
      </IsletmeBaslik>

      {aktifSayisi === 0 && (
        <div className="mb-8">
          <IsletmeUyari>
            Açık karekodun yok. Müşteri okutacak bir şey bulamaz — önce en az
            bir masa karekodu ekle.
          </IsletmeUyari>
        </div>
      )}

      <section className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <SayiKarti
          etiket="Açık karekod"
          deger={String(aktifSayisi)}
          alt={`${masalar.length} tanımlı`}
          ikon={IKON.masa}
          alan="masa"
        />
        <SayiKarti
          etiket="Çalışan karekod"
          deger={String(calisan)}
          alt="son 7 günde okutuldu"
          ikon={IKON.onay}
          alan="masa"
          vurgulu
        />
        <SayiKarti
          etiket="Oynanan oyun"
          deger={String(toplamOyun)}
          alt="son 7 gün"
          ikon={IKON.kisi}
          alan="kisi"
        />
        <SayiKarti
          etiket="En yoğun nokta"
          deger={enYogun ? enYogun.masaAdi : "—"}
          alt={enYogun ? `${enYogun.oyun} oyun` : "henüz veri yok"}
          ikon={IKON.saat}
          alan="masa"
        />
      </section>

      <IkiKolon
        sol={
          <>
            <Bolum baslik="Yeni karekod">
              <MasaEkleme />
            </Bolum>

            <Bolum
              baslik="Son 7 günde karekod kullanımı"
              alt="Hiç okutulmayan kod, yerini değiştirmek için sebeptir."
            >
              <CubukListe
                satirlar={kullanim.map((k) => ({
                  // Ü108: tür etikette görünüyor. "Kasa · hiç okutulmadı"
                  // ile "Masa 7 · hiç okutulmadı" farklı iki karar.
                  etiket:
                    k.tur === "masa" ? k.masaAdi : `${TUR_ADI[k.tur].tekil} · ${k.masaAdi}`,
                  deger: k.oyun,
                  not:
                    k.oyun === 0
                      ? "hiç okutulmadı"
                      : `${k.oyun} oyun · ${k.gun} gün`,
                }))}
                bosMetin="Açık karekod yok."
                alan="masa"
              />
            </Bolum>

            <Bolum
              baslik="Yazdırılabilir sayfa"
              alt="Her karekod için bir kart. Kes, yerine yapıştır. Yalnızca açık olanlar basılır."
            >
              <YazdirDugmesi />
            </Bolum>
          </>
        }
        sag={
          <>
            {TURLER.map((t) => {
              const grup = masalar.filter((m) => m.tur === t);
              if (grup.length === 0) return null;

              return (
                <Bolum
                  key={t}
                  baslik={`${TUR_ADI[t].cogul} · ${grup.filter((m) => m.aktif).length} açık`}
                  alt={TUR_ADI[t].nereye}
                >
                  <ul className="divide-y divide-cizgi border-y border-cizgi">
                    {grup.map((m) => (
                      <li
                        key={m.id}
                        className={`flex items-center gap-4 py-3.5 ${m.aktif ? "" : "opacity-55"}`}
                      >
                        <span className="min-w-0 flex-1">
                          <span className="block text-[15px] font-semibold">{m.ad}</span>
                          <span className="mt-0.5 block font-data text-[11px] text-yazi-sonuk">
                            /m/{m.kod}
                            {!m.aktif && " · kapalı"}
                          </span>
                        </span>
                        <DurumDugmesi tableId={m.id} aktif={m.aktif} />
                      </li>
                    ))}
                  </ul>
                </Bolum>
              );
            })}

            {masalar.length === 0 && (
              <Bolum baslik="Karekodlar">
                <p className="text-[14px] text-yazi-sonuk">Henüz karekod eklenmedi.</p>
              </Bolum>
            )}
          </>
        }
      />

      {/* Basılı kodun fotoğrafını paylaşmayı bu ekran durdurmuyor — durduran
          konum doğrulaması. Kafe sahibinin bunu bilmesi, "kodum çalındı"
          endişesiyle sistemi terk etmesini önlüyor. */}
      <p className="mt-2 mb-4 border-l-2 border-cizgi pl-4 text-[13px] leading-relaxed text-yazi-sonuk">
        Her karekod tek bir noktaya özeldir ve tahmin edilemez. Fotoğrafı
        paylaşılsa bile oyuncunun konumu kafede değilse kazanım açılmaz.
      </p>

      {/* ⚠️ Fiş karekodunun ne OLMADIĞINI söylemek zorundayız: kafe
          "fişe bastım, artık satın alma doğrulanıyor" sanırsa ödül
          ekonomisi hakkında yanlış bir şey öğrenmiş olur. */}
      <p className="mb-10 border-l-2 border-cizgi pl-4 text-[13px] leading-relaxed text-yazi-sonuk">
        Fiş karekodu bir <strong className="text-yazi">satın alma kanıtı değildir</strong> —
        fişe basılan sabit bir koddur, müşteriyi Looply&apos;ye yönlendirir. Dördü de
        aynı şekilde çalışır; fark yalnızca nereye astığındır.
      </p>
    </IsletmeSayfa>
  );
}
