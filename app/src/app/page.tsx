import { existsSync } from "node:fs";
import path from "node:path";
import Link from "next/link";
import * as oturum from "@/domain/session";
import { Beliren, Egik } from "./vitrin-hareket";
import { VitrinUstSerit } from "./vitrin-ust";
import { KahramanBaslik } from "./vitrin-kahraman";
import Image from "next/image";
import { Karekod } from "@/components/karekod";
import { YaklasanSahne, TelefonCercevesi } from "./vitrin-yaklasma";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Looply · Oyna, Kazan, Geri Gel",
  description:
    "Müşterin kafende oyun oynarken indirim kazansın, kullanmak için yarın geri gelsin. Kafeler ve butik işletmeler için.",
};

/**
 * Vitrin — madde 38 (Ü117 · Ü119 · Ü120).
 *
 * ── Buranın işi ─────────────────────────────────────────────
 *
 * `looply.com`'a giren biri **işletme sahibi**. İki iş: ne yaptığımızı
 * anlatmak ve iki kapıyı göstermek — **Giriş yap**, **Kayıt ol**.
 * Uygulamanın içindeki hiçbir ekrana dokunulmuyor.
 *
 * ── 🔴 Dördüncü tur: düz zemin ──────────────────────────────
 *
 * Bir önceki sürüm mor gradyan ve dönen ışınlarla kaplıydı; ürün sahibi
 * *"görsel olarak çok zayıf ve eksiğiz, arka planda buna gerek yok"*
 * dedi ve üç örnek verdi:
 *
 *   · **Ink Games** — düz siyah, dev yazı, uçuşan renkli nesneler
 *   · **Autonomous** — düz açık gri, kocaman ürün görseli, başka hiçbir şey
 *   · **Tinker** — düz beyaz, dev siyah başlık, gerçek ortamda ürün
 *
 * Üçünün ortak yanı: **zemin düz.** Gradyan yok, ışın yok, doku yok.
 * Renk ve hareket zeminden değil **ürünün kendisinden** geliyor.
 *
 * Bizde zemin gürültü yapınca gösterilecek asıl şey zayıf kalıyordu.
 * Artık zemin beyaz/siyah/krem; renk telefonun içinde ve adım
 * kutularında.
 *
 * ── Tipografi ölçeği ────────────────────────────────────────
 *
 * Üç örnekte de başlık ekranın genişliğini dolduruyor. `clamp` ile
 * 44px–120px arası: telefonda okunabilir, masaüstünde afiş gibi.
 *
 * ── Ürün görselleri: hepsi gerçek ─────────────────────────────
 *
 * `public/vitrin/` altındaki altı görüntünün tamamı **çalışan
 * uygulamadan** Playwright ile çekildi (geliştirme şeridi gizlenerek):
 * işletme raporu, şans çarkı, Yılan oyunu, oyuncu paneli, ödüller,
 * kazanma anı. Çizim yok, sahte ekran yok — ürün sahibi *"gerçekten
 * oyuncu panelinden görseller, oyun ekranlarından görseller, kafe
 * panelinden görseller"* dedi.
 *
 * Ekranlardaki sayılar da uydurma değil: `npm run db:simule` on dört
 * günlük trafiği ürünün kendi akışından geçiriyor (bütçe rezervasyonu,
 * günlük tavan, kasada onay). Boş bir veritabanında çekilen ilk kare
 * baştan sona sıfır gösteriyordu ve vitrin ıssız görünüyordu.
 *
 * Kahramanda telefon yok: dev başlıktan hemen sonra kaydırmalı sahne
 * geliyor ve ürün orada, masadaki karekoddan başlayarak açılıyor.
 *
 * ── Kafe fotoğrafı: yeri hazır, dosyası beklenıyor ──────────
 *
 * Sahnenin ilk iki katı **fotoğraf** istiyor: geniş bir kafe karesi ve
 * masadaki karekodun yakın çekimi. Dosyalar `public/vitrin/kafe-genis.*`
 * ve `public/vitrin/kafe-karekod.*`; `vitrinKaresi()` varlıklarını
 * sorguluyor ve yoksa sahne çizime düşüyor. Yani sayfa fotoğrafsız da
 * ayakta, fotoğraf konduğu anda da başka hiçbir değişiklik istemiyor.
 *
 * ⚠️ **Çözünürlük önemli:** kare ekranı kaplıyor ve üstüne ~3 kat
 * yakınlaşılıyor. 1024 piksel genişliğinde bir kare yaklaşmanın sonunda
 * bulanıklaşır; en az 2400 piksel gerekiyor.
 *
 * ── Üç boyutlu ürün kartları ────────────────────────────────
 *
 * Ürün görselleri `Egik` içinde: `perspective` altında hafifçe
 * döndürülmüş ve kaydırdıkça doğruluyorlar (Ink Games'in tekniği).
 * Düz konduklarında ekran görüntüsü, eğik konduklarında nesne gibi
 * duruyorlar — ürün sahibinin istediği "3D gibi" his buradan geliyor.
 *
 * ── Sayı göstermiyoruz ──────────────────────────────────────
 *
 * "Kaç onaylı kafe var" yazmıyoruz: sıfırsa ürün ıssız görünüyor, tohum
 * verisiyle şişikse yalan oluyor.
 */
/**
 * Kafe fotoğrafını **dosya sisteminden** arar; yoksa `null` döner.
 *
 * ── Neden sabit bir yol yazılmadı ───────────────────────────
 *
 * Kafe fotoğrafı elimizde uzun süre yoktu ve sayfa onsuz da ayakta
 * durmak zorunda: `<Image src="/vitrin/kafe-genis.jpg">` dosya yokken
 * kırık görsel gösterirdi ve vitrin ilk açılışta bozuk görünürdü.
 *
 * Burada varlık kontrolü yapılınca iki şey birden oluyor: dosya yokken
 * sahne çizime düşüyor, dosya projeye **konduğu anda** başka hiçbir
 * değişiklik gerekmeden fotoğrafa geçiyor.
 *
 * Uzantı denenerek bulunuyor çünkü karenin JPEG mi PNG mi geleceği
 * önceden belli değil; dosya adı yanlış yazılırsa sessizce çizime
 * düşülür — bozuk görselden iyidir.
 */
function vitrinKaresi(ad: string): string | null {
  for (const uzanti of ["jpg", "jpeg", "png", "webp"]) {
    const yol = `/vitrin/${ad}.${uzanti}`;
    if (existsSync(path.join(process.cwd(), "public", yol))) return yol;
  }
  return null;
}

/**
 * Yan yana iki telefon — dar ekranda parmakla kaydırılan sıra.
 *
 * ── 🔴 Mobilde ürünün yarısı görünmüyordu (Dalga 8) ─────────
 *
 * Her satırda iki ekran görüntüsü var ve ikincisi `hidden sm:block` ile
 * kapalıydı: 640 pikselin altında, yani **telefonların çoğunda**, dört
 * üründen yalnızca ikisi görünüyordu. Sebebi anlaşılır — 210 piksellik
 * iki telefon yan yana dar ekrana sığmıyor ve sığdırılırsa ikisi de
 * okunmaz hâle geliyor.
 *
 * Çözüm küçültmek değil, **kaydırılabilir yapmak**: telefonlar tam
 * boyutta kalıyor, ikincisi kenardan görünüyor ve parmakla çekiliyor.
 * Ürün sahibinin "görsellerle desteklensin" isteği burada kendiliğinden
 * karşılanıyor: mobilde bir *etkileşim* doğuyor ve gösterilen ürün
 * ikiye katlanıyor.
 *
 * ⚠️ `-mx-5 px-5`: sıra sayfanın yan boşluğunun dışına taşıyor ama ilk
 * telefon metinle aynı hizada başlıyor. Kenara yapışan bir kaydırma
 * sırası "devamı var" der; kutunun içinde duran bir sıra demez.
 *
 * ⚠️ `sm:overflow-visible`: geniş ekranda kaydırma kutusu kapanmalı,
 * yoksa `Egik`in büyüyen ve eğilen kartı kutu kenarında kesilir.
 */
const TELEFON_SIRASI =
  "-mx-5 flex snap-x snap-mandatory gap-5 overflow-x-auto px-5 pb-3 " +
  "[scrollbar-width:none] [&::-webkit-scrollbar]:hidden " +
  "sm:mx-0 sm:justify-center sm:overflow-visible sm:px-0 sm:pb-0";

export default async function Vitrin() {
  const o = await oturum.oku();

  const kafeGenis = vitrinKaresi("kafe-genis");
  const oyunKaresi = vitrinKaresi("kafe-oyun");
  const kasaKaresi = vitrinKaresi("kafe-kasa");

  return (
    <main className="min-h-dvh bg-yuzey text-yazi">
      {/* ═══ Üst şerit — sade, düz beyaz ═════════════ */}
      <VitrinUstSerit />

      {o && <MevcutOturum rol={o.rol} />}

      {/* ═══ Kahraman ════════════════════════════════ */}
      <section className="mx-auto w-full max-w-6xl px-5 pt-14 pb-20 text-center sm:pt-20 sm:pb-24">
        <p className="etiket-caps text-yazi-sonuk">
          Kafeler ve butik işletmeler için
        </p>

        {/* Dev başlık — üç örnekte de ekranı dolduruyor. Ü142'den beri
            "Geri gel." daktilo gibi yazılıyor ve arkadaki ödül
            etiketleri sırayla yanıyor (bkz. `vitrin-kahraman.tsx`). */}
        <KahramanBaslik />

        <p className="mx-auto mt-8 max-w-xl text-[17px] leading-relaxed text-yazi-sonuk sm:text-[19px]">
          Müşterin kafende oyun oynarken indirim kazansın — ve o indirimi
          kullanmak için sana geri gelsin.
        </p>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/kafe/basvuru"
            /* Ü133: üç kez nabız atıp duruyor. Sürekli atan bir düğme
               reklam bandı gibi okunuyor ve tam da o yüzden tıklanmıyor. */
            className="nabiz-bir-kez rounded-full bg-vurgu px-8 py-4 text-[16px] font-semibold text-yuzey transition-opacity hover:opacity-90"
          >
            Hemen dene
          </Link>
          <Link
            href="/kafe/giris"
            className="rounded-full border border-cizgi px-8 py-4 text-[16px] font-semibold transition-colors hover:border-yazi-sonuk"
          >
            Giriş yap
          </Link>
        </div>

        <ul className="mx-auto mt-8 flex flex-wrap items-center justify-center gap-x-7 gap-y-3 text-[14px] text-yazi-sonuk">
          {/* 🔴 "Katılım ücretsiz" KALDIRILDI — doğru değil ve bir
              vitrinde söylenen her yanlış, sahada işletmenin güvenini
              bir kez kırıyor. Yerine doğru olan ve aslında daha güçlü
              olan cümle: dağıtılıp kullanılmayan kuponun maliyeti yok. */}
          <Onay>Müşteri uygulama indirmiyor</Onay>
          <Onay>Kurulum birkaç dakika</Onay>
          <Onay>Kullanılmayan kuponun maliyeti yok</Onay>
        </ul>

      </section>

      {/*
        🔴 Kaydırdıkça karekodun içine giren sahne — ürün sahibinin fikri:
        *"yavaş yavaş zoom, sonra QR'ın içine girer gibi, ardından oyuncu
        menüsüne girecek ve orada havadan ödüller yağacak."*
        Taşıyıcı teknik Tinker'ınkiyle aynı: uzun bir bölüm +
        `sticky top-0 h-screen` kat + kaydırma ilerlemesi.
      */}
      <YaklasanSahne
        karesi={kafeGenis}
        karekod={
          <Karekod
            deger="https://looplybusiness.com"
            boyut={84}
            etiket="Looply işletme başvurusu karekodu"
          />
        }
      />

      {/* ═══ Ne sağlıyoruz — gerçek ekranlar ══════ */}
      <section className="bg-vitrin-lacivert py-20 text-yuzey sm:py-28">
        <div className="mx-auto w-full max-w-6xl px-5">
          <Beliren yon="olcek">
            <p className="etiket-caps text-white/45">Neden Looply</p>
            <h2 className="mt-4 max-w-3xl font-display text-[clamp(30px,5vw,54px)] leading-[1.02] font-extrabold tracking-[-0.03em]">
              Müşterini elinde tutmak
              <br />
              indirim yapmaktan ucuz.
            </h2>
            <p className="mt-6 max-w-xl text-[16px] leading-relaxed text-white/60">
              Yeni müşteri bulmak pahalı. Gelen müşteriyi geri getirmek ise
              masaya koyduğun bir karekod kadar basit.
            </p>
          </Beliren>

          {/*
            Oyun anı — insan fotoğrafı.

            Bu bölümün altındaki üç satır ekran görüntüsü; hiçbirinde
            insan yok ve "görsel olarak zayıf" eleştirisinin kökü tam
            olarak buydu. Ürünün hayatta neye benzediğini gösteren tek
            kare burada duruyor ve bölümün başında duruyor: ziyaretçi
            arayüzleri görmeden önce **sahneyi** görmeli.

            Dosya yoksa bölüm bugünkü hâliyle açılıyor (bkz.
            `vitrinKaresi`) — eksik dosya sayfayı bozmuyor.
          */}
          {oyunKaresi && (
            <Beliren yon="yakin" className="mt-14">
              <Egik yon="sag">
                <figure className="overflow-hidden rounded-3xl border border-white/10 shadow-[0_45px_90px_-30px_rgba(0,0,0,0.8)]">
                  <Image
                    src={oyunKaresi}
                    alt="Kafede masada oturan bir müşteri telefonunda Looply oynuyor"
                    width={2560}
                    height={1440}
                    sizes="(max-width: 1024px) 100vw, 1150px"
                    className="h-auto w-full"
                  />
                </figure>
              </Egik>
            </Beliren>
          )}

          {/*
            Panel — işletmecinin göreceği ekran, gerçek görüntü.

            Bilerek **rapor** ekranı seçildi: bölümün iddiası "tutmak
            yapmaktan ucuz" ve bu ekran tam da onu sayıyla söylüyor
            (ziyaret × ortalama hesap − indirim gideri). Soldaki menü de
            panelin tamamını gösterdiği için maddeler karşılıksız kalmıyor.
            Sayılar `npm run db:simule` ile üretildi: ham INSERT değil,
            ürünün kendi akışından geçen on dört günlük trafik.
          */}
          <Beliren yon="sag" className="mt-16">
            <div className="grid items-center gap-10 lg:grid-cols-[1fr_1.25fr] lg:gap-14">
              <div>
                <h3 className="font-display text-2xl font-bold tracking-tight">
                  Her şeyi tek panelden yönetirsin
                </h3>
                <ul className="mt-5 space-y-3 text-[15px] text-white/65">
                  <Madde>Kaç ziyaret geldi, karşılığında ne kadar indirim verdin</Madde>
                  <Madde>Bugün kaç kişi oynadı, kaç kupon kasada kullanıldı</Madde>
                  <Madde>Hangi ödül çıksın, ne sıklıkla, günde kaç adet</Madde>
                  <Madde>Günlük indirim bütçen — ve karekodun</Madde>
                </ul>
              </div>
              {/* Eğik kart — düz konunca ekran görüntüsü, eğik konunca
                  nesne gibi duruyor; fareyle de oynuyor (bkz. `Egik`). */}
              <Egik yon="sol">
                <div className="overflow-hidden rounded-2xl border border-white/10 shadow-[0_45px_90px_-30px_rgba(0,0,0,0.75)]">
                  <Image
                    src="/vitrin/rapor.png"
                    alt="Looply işletme paneli: dönem raporu, ziyaret sayısı ve indirim gideri"
                    width={1320}
                    height={880}
                    className="h-auto w-full"
                  />
                </div>
              </Egik>
            </div>
          </Beliren>

          {/* Çark ve oyun — müşterinin göreceği ekranlar */}
          {/* ⚠️ Bu iki blok yatay YÖN ALMIYOR (`sol`/`sag` değil): içlerinde
              `-mx-5` ile sayfanın yan boşluğunu aşan telefon sırası var.
              Tam genişlikteki bir ögeyi 16 piksel yana kaydırmak sağ
              kenarı ekranın dışına taşırıyor ve mobilde yatay kaydırma
              çubuğu doğuyor — ölçülerek görüldü (390 → 406 piksel). */}
          <Beliren yon="yakin" className="mt-20">
            <div className="grid items-center gap-10 lg:grid-cols-[1.25fr_1fr] lg:gap-14">
              {/* ⚠️ Her telefon KENDİ `Egik` kutusunda: ikisi tek kutuda
                  olsaydı birinin üstüne gelince ikisi birden eğilirdi ve
                  "görselle oynama" hissi kaybolurdu. */}
              <div className={TELEFON_SIRASI + " order-2 lg:order-1"}>
                <Egik yon="sag" className="shrink-0 snap-center">
                  <TelefonCercevesi
                    kaynak="/vitrin/cark.png"
                    alt="Müşterinin telefonunda şans çarkı"
                    genislik={210}
                    koyuZemin
                  />
                </Egik>
                <Egik yon="sag" className="shrink-0 snap-center sm:pt-12">
                  <TelefonCercevesi
                    kaynak="/vitrin/oyun-yilan.png"
                    alt="Müşterinin telefonunda Yılan oyunu"
                    genislik={210}
                    koyuZemin
                  />
                </Egik>
              </div>
              <div className="order-1 lg:order-2">
                <h3 className="font-display text-2xl font-bold tracking-tight">
                  Müşterin sıkılmaz, oynar
                </h3>
                <ul className="mt-5 space-y-3 text-[15px] text-white/65">
                  <Madde>Dört oyun ve günde bir kez şans çarkı</Madde>
                  <Madde>Uygulama indirmek yok, hesap açmadan başlıyor</Madde>
                  <Madde>Kazandığı ödül senin kataloğundan çıkıyor</Madde>
                  <Madde>Sipariş beklerken geçen süre keyfe dönüşüyor</Madde>
                </ul>
              </div>
            </div>
          </Beliren>

          {/* Oyuncu tarafı — geri dönüşü sağlayan iki ekran */}
          <Beliren yon="olcek" className="mt-20">
            <div className="grid items-center gap-10 lg:grid-cols-[1fr_1.25fr] lg:gap-14">
              <div>
                <h3 className="font-display text-2xl font-bold tracking-tight">
                  Kazandığı cebinde durur
                </h3>
                <ul className="mt-5 space-y-3 text-[15px] text-white/65">
                  <Madde>Kupon telefonunda bekler, kasada gösterilir</Madde>
                  <Madde>Puan, seviye ve günlük seri onu geri çağırır</Madde>
                  <Madde>Her kafede ayrı puan — senin müşterin sende kalır</Madde>
                  <Madde>Süresi dolan kupon kendiliğinden kapanır</Madde>
                </ul>
              </div>
              <div className={TELEFON_SIRASI}>
                <Egik yon="sol" className="shrink-0 snap-center">
                  <TelefonCercevesi
                    kaynak="/vitrin/oyuncu-panel.png"
                    alt="Oyuncunun paneli: puanı, seviyesi ve günün görevi"
                    genislik={210}
                    koyuZemin
                  />
                </Egik>
                <Egik yon="sol" className="shrink-0 snap-center sm:pt-12">
                  <TelefonCercevesi
                    kaynak="/vitrin/oduller.png"
                    alt="Oyuncunun ödülleri: kasada gösterilecek kupon"
                    genislik={210}
                    koyuZemin
                  />
                </Egik>
              </div>
            </div>
          </Beliren>
        </div>
      </section>

      {/* ═══ Ne kazandırıyor — düz krem ═════════════ */}
      <section className="bg-vitrin-fildisi py-20 sm:py-28">
        <div className="mx-auto w-full max-w-6xl px-5">
          <Beliren yon="olcek">
            <h2 className="mx-auto max-w-3xl text-center font-display text-[clamp(30px,5vw,52px)] leading-[1.02] font-extrabold tracking-[-0.03em]">
              Bir kere gelen müşteri,
              <br />
              bir daha gelsin.
            </h2>
          </Beliren>

          {/*
            Kasa anı — döngünün kapandığı kare.

            Bu bölümün iddiası "müşteri geri gelir" ve altındaki üç kutu
            bunu **anlatıyor**; kasada kuponu gösteren müşteri onu
            **gösteriyor**. Sayfanın tamamında işletmenin para kazandığı
            anı gösteren tek görsel bu, o yüzden kutuların üstünde ve
            geniş duruyor.
          */}
          {kasaKaresi && (
            <Beliren yon="yakin" className="mt-12">
              <Egik yon="sol" guc={0.7}>
                <figure className="overflow-hidden rounded-3xl shadow-[0_45px_90px_-35px_rgba(16,32,77,0.55)]">
                  <Image
                    src={kasaKaresi}
                    alt="Müşteri kasada telefonundaki Looply kuponunu gösteriyor"
                    width={2560}
                    height={1440}
                    sizes="(max-width: 1024px) 100vw, 1150px"
                    className="h-auto w-full"
                  />
                </figure>
              </Egik>
            </Beliren>
          )}

          <div className="mt-14 grid gap-4 sm:grid-cols-3">
            <Beliren yon="sol" gecikme={0}>
              <Kart
                baslik="Müşterin geri gelir"
                metin="Kazandığı indirimi kullanmak için ikinci kez kapından girer. Sadakat, hatırlatmayla değil, elinde duran bir ödülle kurulur."
              />
            </Beliren>
            <Beliren yon="alt" gecikme={110}>
              <Kart
                baslik="Bekleme keyfe dönüşür"
                metin="Sipariş beklerken telefonuna bakan müşteri, senin kafende oyun oynar. O dakikalar artık şikâyet değil."
              />
            </Beliren>
            <Beliren yon="sag" gecikme={220}>
              <Kart
                baslik="Kontrol sende"
                metin="Hangi ödül, ne sıklıkla, ne kadar — hepsini kendi panelinden sen belirlersin."
              />
            </Beliren>
          </div>
        </div>
      </section>

      {/* ═══ Kimler için — düz beyaz ════════════════ */}
      <section className="py-20 sm:py-28">
        <div className="mx-auto w-full max-w-6xl px-5">
          <Beliren yon="olcek">
            <h2 className="text-center etiket-caps text-yazi-sonuk">
              Kimler için
            </h2>
            <div className="mt-10 grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-cizgi p-8">
                <h3 className="font-display text-2xl font-bold tracking-tight">
                  Kafeler
                </h3>
                <p className="mt-3 text-[15px] leading-relaxed text-yazi-sonuk">
                  Müşteri masada oturur, siparişini bekler ve o sırada oynar.
                  Zaten geçen dakika, geri dönüşe çevrilir.
                </p>
              </div>

              {/*
                ⚠️ "Yakında" bilerek duruyor: butik akışı (madde 39–40) henüz
                yazılmadı ve bugün başvuran bir butik kafe panelini görürdü.
              */}
              <div className="rounded-2xl border border-dashed border-cizgi p-8">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-display text-2xl font-bold tracking-tight">
                    Butik işletmeler
                  </h3>
                  <span className="shrink-0 rounded-full border border-cizgi px-2.5 py-1 etiket-caps text-[10px] text-yazi-sonuk">
                    yakında
                  </span>
                </div>
                <p className="mt-3 text-[15px] leading-relaxed text-yazi-sonuk">
                  Müşteri oturmaz, alışverişini yapar. Kazandığını bir sonraki
                  gelişinde kullanır.
                </p>
              </div>
            </div>
          </Beliren>
        </div>
      </section>

      {/*
        ═══ Ara çağrı — lead ═════════════════════════

        Ürün sahibi: *"lead toplamak için ara kısımlara hemen dene,
        kayıt ol vb şeyler eklenmeli."*

        ── Neden ortada bir çağrı ───────────────────

        Sayfada iki çağrı vardı: en üstte ve en altta. Aradaki bütün
        anlatıyı okuyup ikna olan kişi, tıklamak için ya yukarı ya
        aşağı gitmek zorundaydı — ikna anıyla düğme arasındaki her
        kaydırma, vazgeçme fırsatı.

        ⚠️ Tam sayfa bir bant DEĞİL, ince bir şerit: ortadaki çağrı
        anlatıyı bölmemeli. İkna olmayan kişi bunu bir cümlede geçip
        okumaya devam ediyor.
      */}
      <section className="mx-auto w-full max-w-6xl px-5 pb-4">
        <Beliren yon="yakin">
          <div className="flex flex-col items-center justify-between gap-5 rounded-3xl border border-cizgi bg-cukur px-6 py-7 text-center sm:flex-row sm:px-9 sm:text-left">
            <div>
              <p className="font-display text-[19px] leading-tight font-extrabold tracking-tight sm:text-[22px]">
                Kafenin karekodu beş dakikada hazır.
              </p>
              <p className="mt-1.5 text-[14px] leading-relaxed text-yazi-sonuk">
                Başvur, onaylanınca panelin açılsın — karekodunu oradan yazdır.
              </p>
            </div>
            <Link
              href="/kafe/basvuru"
              className="shrink-0 rounded-full bg-vurgu px-7 py-3.5 text-[15px] font-semibold text-yuzey transition-opacity hover:opacity-90"
            >
              Hemen dene
            </Link>
          </div>
        </Beliren>
      </section>

      {/*
        ═══ Simülasyon çağrısı ═══════════════════════

        🔴 Simülasyonun **kendisi** bu sayfada değil (Ü142).

        Ürün sahibi: *"ana sayfadan kaldırıp simülasyon yapması için
        müşteriyi itelim, çünkü inanılmaz fazla yer kaplıyor."* Sekiz
        girdi ve dört oranla simülasyon ana sayfanın en uzun bölümüydü;
        telefonda onu geçmek için yapılan kaydırma anlatının tam
        ortasını ikiye bölüyordu.

        Yerinde duran şey **sırayı koruyor** (Dalga 8'de ürün sahibinin
        verdiği sıra: avantajlardan sonra generatör) ama yeri yalnızca
        birkaç satır tutuyor. Hesap yapmak isteyen bir tıkla gidiyor;
        istemeyen bir cümlede geçiyor.

        ⚠️ Rakam ya da vaat yazılmıyor. "Ayda 40.000 TL kazan" demek,
        ziyaretçinin kendi rakamlarıyla göreceği tabloyu bizim
        sözümüzle ezmek olurdu — simülasyonun bütün değeri sayının
        bizden değil ondan çıkması.
      */}
      <section className="mx-auto w-full max-w-6xl px-5 py-16 sm:py-20">
        <Beliren yon="yakin">
          <div className="flex flex-col items-center justify-between gap-6 rounded-3xl border border-cizgi bg-odul-zemin/60 px-6 py-8 text-center sm:flex-row sm:px-10 sm:text-left">
            <div className="max-w-xl">
              <p className="etiket-caps text-[10px] text-yazi-sonuk">
                Çift yönlü müşteri değeri
              </p>
              <p className="mt-3 font-display text-[clamp(21px,3vw,30px)] leading-[1.12] font-extrabold tracking-[-0.02em]">
                Müşterin hem düzenli gelse hem arkadaşını getirse ne olur?
              </p>
              <p className="mt-3 text-[15px] leading-relaxed text-yazi-sonuk">
                Üç davranış oranını sen seç, kendi rakamlarını yaz —
                senaryoyu kafende gör.
              </p>
            </div>
            <Link
              href="/simulasyon"
              className="shrink-0 rounded-full bg-vurgu px-7 py-3.5 text-[15px] font-semibold text-yuzey transition-opacity hover:opacity-90"
            >
              Simülasyonu aç →
            </Link>
          </div>
        </Beliren>
      </section>

      <SosyalKanit />

      {/*
        ═══ Reklamla karşılaştırma ═══════════════════

        Ürün sahibi: *"instagrama binlerce para verip veri elde
        edememektense bizi kullanıp tüm detayları inceleyebilirsiniz
        gibi güzel bir slogan ekleyelim, ve bizi kullanmazsanız ne
        kaybedersiniz de olsun."*

        ── Neden karşılaştırma tablosu ──────────────

        İşletmeci Looply'yi boşlukta değerlendirmiyor; zaten bir şeye
        para veriyor. Cümle "biz iyiyiz" derse soyut kalır, "şu anda
        ne aldığını" gösterirse somutlaşır. İki sütun aynı soruları
        soruyor ve cevaplar yan yana duruyor.

        ⚠️ Rakip **kötülenmiyor**, ölçülebilirlik karşılaştırılıyor.
        "Instagram işe yaramaz" demek hem yanlış hem de reklamını zaten
        veren işletmeciyi savunmaya geçirir. Söylenen şey dar ve doğru:
        gösterimi sayıyor, kapıdan gireni saymıyor.
      */}
      <section className="mx-auto w-full max-w-6xl px-5 py-20 sm:py-28">
        <Beliren yon="olcek">
          <p className="etiket-caps text-yazi-sonuk">Nereye para veriyorsun</p>
          <h2 className="mt-4 max-w-3xl font-display text-[clamp(30px,5vw,54px)] leading-[1.02] font-extrabold tracking-[-0.03em]">
            Reklam gösterimi sayar.
            <br />
            Looply <span className="text-vurgu">kapıdan gireni</span> sayar.
          </h2>
          <p className="mt-6 max-w-xl text-[16px] leading-relaxed text-yazi-sonuk">
            Sosyal medyaya aylık binlerce lira veriyorsun ve elinde kalan tek
            şey görüntülenme sayısı. Kaç kişinin geldiğini, kaçının ikinci kez
            geldiğini, hangi saatin boş kaldığını kimse söylemiyor.
          </p>
        </Beliren>

        <div className="mt-12 grid gap-4 lg:grid-cols-2">
          <Beliren yon="sol" gecikme={80}>
            <div className="h-full rounded-3xl border border-cizgi bg-cukur px-7 py-8">
              <p className="etiket-caps text-yazi-sonuk">Reklama verdiğinde</p>
              <ul className="mt-5 space-y-3.5 text-[15px] leading-relaxed text-yazi-sonuk">
                <Eksi>Kaç kişi gördü — ama kaçı geldi, bilinmiyor</Eksi>
                <Eksi>Gelen müşteri bir daha gelmezse haberin olmuyor</Eksi>
                <Eksi>Para gösterimde harcanıyor, müşteride değil</Eksi>
                <Eksi>Durduğun gün etki de duruyor</Eksi>
              </ul>
            </div>
          </Beliren>

          <Beliren yon="sag" gecikme={160}>
            <div className="h-full rounded-3xl border-2 border-vurgu/40 bg-yuzey px-7 py-8 shadow-[0_24px_60px_-30px_rgba(16,32,77,0.45)]">
              <p className="etiket-caps text-vurgu">Looply kullandığında</p>
              <ul className="mt-5 space-y-3.5 text-[15px] leading-relaxed">
                <Arti>Kaç kişi geldi, kaçı ilk kez — sayıyla</Arti>
                <Arti>Kaçı ikinci kez geldi, ne kadar sürede</Arti>
                <Arti>Hangi saatler boş, hangi ürün çekiyor</Arti>
                <Arti>
                  Para yalnızca <strong className="font-semibold">kasada kullanılan</strong>{" "}
                  kupon için çıkıyor
                </Arti>
              </ul>
            </div>
          </Beliren>
        </div>

        {/* ⚠️ "Denemezsen ne kaybedersin?" kutusu buradan ÇIKTI — Dalga 8.
            Ürün sahibinin sırasında o soru sayfanın **en altında**; bu
            bölümün içindeyken sondan bir önceki bölümde kalıyordu. */}
      </section>

      {/*
        ═══ Kapanış — "kullanmazsan ne kaybedersin" ══

        Ürün sahibinin Dalga 8'de verdiği sıranın **son maddesi**:
        *"en altta kullanmazsan ne kaybedersin."*

        ── İki soru, bilerek yan yana ───────────────

        Ürün sahibinin ilk cümlesi *"bizi kullanmazsanız ne
        kaybedersiniz"* idi — yani **hareketsizliğin** bedeli. Sayfada
        ise yalnızca ikinci soru duruyordu: "denemezsen ne kaybedersin",
        yani **denemenin** bedeli. İkisi farklı sorular ve yalnızca
        ikincisi yazıldığı sürece birincisi hiç sorulmuyordu.

        Şimdi ikisi arka arkaya: önce kullanmamanın devam eden maliyeti,
        sonra denemenin sıfır maliyeti. Aradaki fark çağrının kendisi.

        ⚠️ Üç kayıp maddesi de **sayfanın kendi iddialarının özeti**;
        yeni bir vaat eklenmiyor. Fiyat cümlesi bilerek yok: ürünün
        fiyatlandırması hâlâ karara bağlanmadı (Ü41).

        ⚠️ Cümleler **soru** ve öyle kalmalı: cevabı okuyan veriyor.
        "Hiçbir şey kaybetmezsiniz" bir satış vaadi olurdu ve vaat,
        sorunun kendisinden zayıf.
      */}
      <section className="bg-vitrin-lacivert py-20 text-yuzey sm:py-28">
        <div className="mx-auto w-full max-w-6xl px-5 text-center">
          <Beliren yon="olcek">
            <h2 className="mx-auto max-w-2xl font-display text-[clamp(32px,5.5vw,60px)] leading-[1.02] font-extrabold tracking-[-0.035em]">
              Kullanmazsan
              <br />
              ne kaybedersin?
            </h2>
          </Beliren>

          {/* Üç kayıp — hareketsizliğin devam eden bedeli. */}
          <div className="mx-auto mt-12 grid max-w-3xl gap-3 text-left sm:grid-cols-3">
            <Beliren yon="sag" gecikme={0}>
              <Kayip
                baslik="Bugün gelen müşteriyi"
                metin="Hesabı ödeyip çıkan müşterinin elinde, yarın geri gelmek için bir sebep kalmıyor."
              />
            </Beliren>
            <Beliren yon="alt" gecikme={110}>
              <Kayip
                baslik="Kimin geldiğini"
                metin="Kaç kişi geldi, kaçı ikinci kez geldi, hangi saat boş kaldı — ölçmediğin şeyi düzeltemiyorsun."
              />
            </Beliren>
            <Beliren yon="sol" gecikme={220}>
              <Kayip
                baslik="Reklama verdiğin parayı"
                metin="Gösterim satın alıyorsun, ziyaret değil. Durduğun gün etkisi de duruyor."
              />
            </Beliren>
          </div>

          <Beliren yon="olcek" gecikme={120} className="mt-16">
            <p className="mx-auto max-w-2xl font-display text-[clamp(22px,3.4vw,34px)] leading-[1.15] font-extrabold tracking-[-0.02em]">
              Peki denersen ne kaybedersin?
            </p>
            <p className="mx-auto mt-5 max-w-lg text-[15px] leading-relaxed text-white/60">
              Dağıtılıp kullanılmayan kuponun maliyeti yok. Kasada onaylanmayan
              indirim bütçenden düşmüyor. Kaybedeceğin tek şey, masaya bir
              karekod koymak için geçen beş dakika.
            </p>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/kafe/basvuru"
                className="rounded-full bg-yuzey px-8 py-4 text-[16px] font-semibold text-yazi transition-opacity hover:opacity-85"
              >
                Hemen dene
              </Link>
              <Link
                href="/kafe/giris"
                className="rounded-full border border-white/25 px-8 py-4 text-[16px] font-semibold transition-colors hover:border-white/55"
              >
                Giriş yap
              </Link>
            </div>
            {/*
              ⚠️ Tek satırlık beklenti cümlesi — bilerek duruyor.
              Sistem anlatılmıyor ama şartın ilk kez başvuru formunda
              görünmesi de doğru olmazdı (bkz. 38b: sayfa "haftada"
              derken panelin "günde" demesi sınıfı).
            */}
            {/* ⚠️ "Vergi levhasıyla başvurulur" KALDIRILDI — Ü126'da belge
                başvurudan çıktı ve vitrin, üründe olmayan bir adımı
                anlatmaya devam ediyordu. */}
            <p className="mt-7 text-[13px] text-white/40">
              Başvuru dört alan · günlük indirim bütçeni sen belirlersin
            </p>
          </Beliren>
        </div>
      </section>

      {/* ═══ Alt şerit ══════════════════════════════ */}
      <footer className="mx-auto w-full max-w-6xl px-5 py-8">
        <nav className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[13px] text-yazi-sonuk">
          <Link href="/kafe/giris" className="underline hover:text-yazi">
            İşletme girişi
          </Link>
          <Link href="/giris" className="underline hover:text-yazi">
            Oyuncu girişi
          </Link>
          <Link href="/platform/giris" className="underline hover:text-yazi">
            Platform girişi
          </Link>
          <Link href="/aydinlatma" className="underline hover:text-yazi">
            Aydınlatma metni
          </Link>
        </nav>
      </footer>
    </main>
  );
}

/* ── Parçalar ──────────────────────────────────────── */

function Onay({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-center gap-2">
      <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden>
        <path
          d="M3.5 8.5l3 3 6-7"
          stroke="var(--color-vurgu)"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {children}
    </li>
  );
}

/**
 * Karşılaştırma maddeleri — Ü133.
 *
 * ⚠️ İkisi de `aria-hidden` bir işaret taşıyor ve anlamı **metinde**:
 * "Kaç kişi gördü — ama kaçı geldi, bilinmiyor" cümlesi işareti
 * görmeyen birine de olumsuz olduğunu söylüyor. İşaret rengi tek başına
 * anlam taşısaydı ekran okuyucuda iki sütun aynı görünürdü.
 */
function Eksi({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span
        aria-hidden
        className="mt-[3px] flex size-[18px] shrink-0 items-center justify-center rounded-full bg-yazi-sonuk/15 text-[13px] leading-none font-bold text-yazi-sonuk"
      >
        −
      </span>
      <span>{children}</span>
    </li>
  );
}

function Arti({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span
        aria-hidden
        className="mt-[3px] flex size-[18px] shrink-0 items-center justify-center rounded-full bg-vurgu text-[12px] leading-none font-bold text-yuzey"
      >
        ✓
      </span>
      <span>{children}</span>
    </li>
  );
}

function Madde({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="mt-[9px] size-1.5 shrink-0 rounded-full bg-odul" aria-hidden />
      <span className="leading-relaxed">{children}</span>
    </li>
  );
}

function Kart({ baslik, metin }: { baslik: string; metin: string }) {
  return (
    <div className="h-full rounded-2xl bg-yuzey p-7">
      <h3 className="text-[17px] font-bold">{baslik}</h3>
      <p className="mt-2.5 text-[14px] leading-relaxed text-yazi-sonuk">
        {metin}
      </p>
    </div>
  );
}

/**
 * Kapanıştaki kayıp maddesi — koyu zeminde.
 *
 * `Kart`tan ayrı duruyor çünkü zemini ters: `Kart` krem bölümde beyaz
 * kutu, bu lacivert bölümde saydam kutu. Tek bileşene sığdırmak için
 * renk parametresi eklenseydi çağrı yerlerinde renk adı dolaşırdı.
 */
function Kayip({ baslik, metin }: { baslik: string; metin: string }) {
  return (
    <div className="h-full rounded-2xl bg-white/[0.06] px-6 py-6 ring-1 ring-white/10">
      <h3 className="text-[16px] font-bold">{baslik}</h3>
      <p className="mt-2.5 text-[14px] leading-relaxed text-white/55">{metin}</p>
    </div>
  );
}

/**
 * Sosyal kanıt yuvası — Dalga 8.
 *
 * ── 🔴 Burada neden müşteri yorumu yok ──────────────────────
 *
 * Ürün sahibinin verdiği sırada dördüncü bölüm "sosyal kanıtlar".
 * Ama **gerçek müşteri yok**: ürün henüz canlıya çıkmadı. Uydurma bir
 * referans, sahte bir yıldız ya da "500+ kafe" gibi bir sayı yazmak
 * teknik olarak beş dakikalık iş ve sonucu şu: sahada ilk konuşmada
 * işletmeci "hangi kafeler?" diye soruyor ve güven bir kez kırılıyor.
 * Vitrindeki "katılım ücretsiz" cümlesi de (Ü133) aynı sebeple
 * kaldırılmıştı.
 *
 * Ürün sahibine üç seçenek sunuldu ve **dürüst erken dönem çerçevesi**
 * seçildi: yuva doluyor, referans uydurulmuyor.
 *
 * ── Yerine ne konuyor ───────────────────────────────────────
 *
 * Kanıt yerine **kanıtlanabilir olan** konuyor. Üç maddenin üçü de bu
 * sayfada ya da üründe zaten doğrulanabilir:
 *
 *   · ekran görüntüleri gerçekten çalışan uygulamadan (bkz. dosya başı)
 *   · yukarıdaki hesap ziyaretçinin kendi girdiği sayılarla çalışıyor
 *   · sayfada anlatılan adımların hepsi üründe var
 *
 * ⚠️ **Sayı yok ve olmayacak.** "Kaç kafe başvurdu" gibi canlı bir sayı
 * ürün sahibine ayrıca soruldu ve seçilmedi: bugün sıfıra yakın olduğu
 * için ürünü ıssız gösterir, tohum verisiyle şişirilirse yalan olur.
 *
 * ⚠️ Bu bölüm **sosyal kanıt değil** ve öyleymiş gibi de durmuyor;
 * başlık açıkça "burada müşteri yorumu görmeyeceksin" diyor. İlk gerçek
 * kafeler geldiğinde asıl sosyal kanıt buranın yerine geçecek.
 */
function SosyalKanit() {
  return (
    <section className="mx-auto w-full max-w-6xl px-5 pb-20 sm:pb-24">
      <div className="rounded-3xl border border-cizgi bg-cukur px-6 py-12 sm:px-10 sm:py-14">
        <Beliren yon="olcek">
          <p className="text-center etiket-caps text-yazi-sonuk">
            Dürüst olalım
          </p>
          <h2 className="mx-auto mt-4 max-w-2xl text-center font-display text-[clamp(26px,4.4vw,44px)] leading-[1.06] font-extrabold tracking-[-0.03em]">
            Burada müşteri yorumu
            <br />
            görmeyeceksin.
          </h2>
          <p className="mx-auto mt-6 max-w-xl text-center text-[16px] leading-relaxed text-yazi-sonuk">
            Daha yeni başlıyoruz ve olmayan bir referansı yazmak, sahada ilk
            soruda anlaşılır. Onun yerine, bu sayfada söylediğimiz her şeyin
            neden doğrulanabilir olduğunu yazıyoruz.
          </p>
        </Beliren>

        <div className="mt-12 grid gap-4 sm:grid-cols-3">
          <Beliren yon="sol" gecikme={0}>
            <Kanit
              baslik="Ekranların hepsi gerçek"
              metin="Yukarıdaki panel, çark ve oyun görüntüleri çalışan uygulamadan alındı. Çizim yok, sahte ekran yok."
            />
          </Beliren>
          <Beliren yon="alt" gecikme={110}>
            <Kanit
              baslik="Hesabı sen yapıyorsun"
              metin="Az önceki tablo senin girdiğin sayılarla çalışıyor. Bizim seçtiğimiz güzel bir örnekle değil."
            />
          </Beliren>
          <Beliren yon="sag" gecikme={220}>
            <Kanit
              baslik="Sözümüz dar"
              metin="Dört alanlık başvuru, panelden yazdırılan karekod, kasada onaylanan kupon. Anlattığımız her adım üründe var."
            />
          </Beliren>
        </div>

        <Beliren gecikme={300}>
          <p className="mt-10 text-center text-[15px] leading-relaxed text-yazi-sonuk">
            İlk kafelerden biri olursan, buradaki yorumu sen yazacaksın.{" "}
            <Link
              href="/kafe/basvuru"
              className="font-semibold text-vurgu underline underline-offset-4 hover:opacity-80"
            >
              Hemen dene
            </Link>
          </p>
        </Beliren>
      </div>
    </section>
  );
}

function Kanit({ baslik, metin }: { baslik: string; metin: string }) {
  return (
    <div className="h-full rounded-2xl border border-cizgi bg-yuzey px-6 py-6">
      <h3 className="text-[16px] font-bold">{baslik}</h3>
      <p className="mt-2.5 text-[14px] leading-relaxed text-yazi-sonuk">
        {metin}
      </p>
    </div>
  );
}

const ROL_ADLARI: Record<string, string> = {
  oyuncu: "Oyuncu",
  kasiyer: "Kasiyer",
  kafe_yoneticisi: "İşletme yöneticisi",
  platform_destek: "Platform desteği",
  platform_admin: "Platform yöneticisi",
};

/** Açık oturum varsa, vitrini gezmeye zorlamadan kaldığı yere döndürür. */
function MevcutOturum({ rol }: { rol: string }) {
  const hedef =
    rol === "oyuncu"
      ? "/oyna"
      : rol === "kafe_yoneticisi"
        ? "/kafe/panel"
        : rol === "kasiyer"
          ? "/kasa"
          : rol.startsWith("platform")
            ? "/platform/basvurular"
            : "/";

  return (
    <div className="mx-auto mt-4 flex w-full max-w-6xl items-center gap-4 rounded-2xl border border-cizgi bg-zemin px-4 py-3">
      <span className="min-w-0 flex-1">
        <span className="block etiket-caps text-yazi-sonuk">Açık oturum</span>
        <span className="mt-0.5 block text-[15px] font-semibold">
          {ROL_ADLARI[rol] ?? rol}
        </span>
      </span>
      <Link
        href={hedef}
        className="shrink-0 rounded border border-cizgi px-3 py-1.5 etiket-caps"
      >
        Devam et
      </Link>
      {/* ⚠️ `<Link>` DEĞİL — bkz. `app/cikis/route.ts`: Link hedefleri
          üretimde önceden getiriliyor ve bu adres oturumu kapatıyor. */}
      <a href="/cikis" className="shrink-0 etiket-caps text-yazi-sonuk underline">
        Çıkış
      </a>
    </div>
  );
}
