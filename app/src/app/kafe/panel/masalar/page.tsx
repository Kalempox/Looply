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
import { MasaEkleme, DurumDugmesi, YazdirDugmesi } from "./kontroller";

export const dynamic = "force-dynamic";
export const metadata = { title: "Masa karekodları · CafePlay" };

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
        alt="Masalara yapıştırılacak kodlar. Kod basılıdır ve değişmez."
      >
        Masa karekodları
      </IsletmeBaslik>

      {aktifSayisi === 0 && (
        <div className="mb-8">
          <IsletmeUyari>
            Açık masan yok. Müşteri okutacak bir karekod bulamaz — önce en az
            bir masa ekle.
          </IsletmeUyari>
        </div>
      )}

      <section className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <SayiKarti
          etiket="Açık masa"
          deger={String(aktifSayisi)}
          alt={`${masalar.length} tanımlı`}
          ikon={IKON.masa}
        />
        <SayiKarti
          etiket="Çalışan masa"
          deger={String(calisan)}
          alt="son 7 günde okutuldu"
          ikon={IKON.onay}
          vurgulu
        />
        <SayiKarti
          etiket="Oynanan oyun"
          deger={String(toplamOyun)}
          alt="son 7 gün"
          ikon={IKON.kisi}
        />
        <SayiKarti
          etiket="En yoğun masa"
          deger={enYogun ? enYogun.masaAdi : "—"}
          alt={enYogun ? `${enYogun.oyun} oyun` : "henüz veri yok"}
          ikon={IKON.saat}
        />
      </section>

      <IkiKolon
        sol={
          <>
            <Bolum baslik="Yeni masa">
              <MasaEkleme />
            </Bolum>

            <Bolum
              baslik="Son 7 günde masa kullanımı"
              alt="Hiç okutulmayan masa, kodu taşımak için sebeptir."
            >
              <CubukListe
                satirlar={kullanim.map((k) => ({
                  etiket: k.masaAdi,
                  deger: k.oyun,
                  not:
                    k.oyun === 0
                      ? "hiç okutulmadı"
                      : `${k.oyun} oyun · ${k.gun} gün`,
                }))}
                bosMetin="Açık masa yok."
              />
            </Bolum>

            <Bolum
              baslik="Yazdırılabilir sayfa"
              alt="Her masa için bir kart. Kes, masaya yapıştır. Yalnızca açık masalar basılır."
            >
              <YazdirDugmesi />
            </Bolum>
          </>
        }
        sag={
          <Bolum baslik={`Masalar · ${aktifSayisi} açık`}>
            {masalar.length === 0 ? (
              <p className="text-[14px] text-yazi-sonuk">
                Henüz masa eklenmedi.
              </p>
            ) : (
              <ul className="divide-y divide-cizgi border-y border-cizgi">
                {masalar.map((m) => (
                  <li
                    key={m.id}
                    className={`flex items-center gap-4 py-3.5 ${m.aktif ? "" : "opacity-55"}`}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block text-[15px] font-semibold">
                        {m.ad}
                      </span>
                      <span className="mt-0.5 block font-data text-[11px] text-yazi-sonuk">
                        /m/{m.kod}
                        {!m.aktif && " · kapalı"}
                      </span>
                    </span>
                    <DurumDugmesi tableId={m.id} aktif={m.aktif} />
                  </li>
                ))}
              </ul>
            )}
          </Bolum>
        }
      />

      {/* Basılı kodun fotoğrafını paylaşmayı bu ekran durdurmuyor — durduran
          konum doğrulaması. Kafe sahibinin bunu bilmesi, "kodum çalındı"
          endişesiyle sistemi terk etmesini önlüyor. */}
      <p className="mt-2 mb-10 border-l-2 border-cizgi pl-4 text-[13px] leading-relaxed text-yazi-sonuk">
        Karekod masaya özeldir ve tahmin edilemez. Fotoğrafı paylaşılsa bile
        oyuncunun konumu kafede değilse kazanım açılmaz.
      </p>
    </IsletmeSayfa>
  );
}
