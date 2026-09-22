import { existsSync } from "node:fs";
import path from "node:path";
import Link from "next/link";
import * as oturum from "@/domain/session";
import { Beliren, Cizilen, Egik, Sirali } from "./vitrin-hareket";
import { VitrinUstSerit } from "./vitrin-ust";
import { KahramanBaslik } from "./vitrin-kahraman";
import Image from "next/image";
import { Karekod } from "@/components/karekod";
import { YaklasanSahne, TelefonCercevesi } from "./vitrin-yaklasma";
import { YapiskanCagri } from "./vitrin-yapiskan";
import { VitrinDongusu } from "./vitrin-dongu";
import { VitrinGizliAcilis, VitrinEkSatis } from "./vitrin-katmanlar";
import { VitrinLoopy } from "./vitrin-loopy";
import { VitrinDamga } from "./vitrin-damga";
import { VitrinItirazlar } from "./vitrin-itirazlar";
import { VitrinOlcum } from "./vitrin-olcum";
import { VitrinSSS } from "./vitrin-sss";
import { Avatar } from "@/components/avatar";

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

/*
  ⚠️ `?sahne=` karşılaştırma anahtarı Ü154'te KALDIRILDI. İki
  görselleştirme (çizilen yol · mini animasyonlar) ayrı ayrı denendi ve
  ürün sahibi ikisini birden istedi: yılankavi iz, iki yanında kartlar,
  her kartın içinde kendi mini sahnesi. Seçilecek bir şey kalmadı.
*/
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
      <section className="mx-auto w-full max-w-6xl px-5 pt-10 pb-20 text-center sm:pt-14 sm:pb-24">
        {/*
          Loopy — sayfanın ilk yüzü (Ü219).

          🔴 Küçük ve ortada duruyor, bilerek. Kahramanın tamamı ortalı
          ve asıl olay dev başlıkla arkasında yanan ödül etiketleri;
          yana konan bir karakter o dengeyi bozar, büyütülen bir karakter
          başlığın önüne geçerdi. Burada yaptığı iş tek bir şey: ürünün
          bir **yüzü** olduğunu ilk ekranda söylemek. Anlatısı aşağıda,
          `VitrinLoopy` bölümünde.

          ⚠️ `oncelik` ELLE veriliyor: `Avatar`ın "büyükse üsttedir"
          tahmini burada ters yönden yanılıyor — 104 piksel küçük ama
          sayfanın ilk boyası. Verilmeseydi üç katman tembel yüklenir ve
          karakter başlık oturduktan sonra yerine düşerdi.

          🔴 Kare `kuponlu`, `sakin` DEĞİL — ürün sahibi: *"Loopy'mizin
          daha mutlu olması lazım, şu an hepsinde dümdüz duruyor."*
          Haklı ve kusurun adı zaten yazılıydı: `sakin`in ağzı **düz bir
          çizgi** (bkz. `loopy-sozu.tsx`). Elimizdeki beş kare arasında
          göz kırpan + ağzı açık gülen tek kare `kuponlu` ve elindeki
          yıldız başlığın *"Kazan"*ıyla aynı şeyi söylüyor.

          ⚠️ `mutlu` daha da neşeli ama buraya konamadı: kıvılcımları
          sabit piksel (±78) ve 104 pikselde karakterin iki katı kadar
          uzağa saçılıyor. Kare ayrıca ~22° eğik çizilmiş ve sabit
          dururken sevinç değil devrilme okunuyor (Ü176).

          ⚠️ Bölümün üst boşluğu 14 → 10 (sm: 20 → 14) indi: karakter
          yer kaplıyor ve dev başlığın telefonda ilk ekranda kalması
          ölçülerek korundu.
        */}
        <div className="flex justify-center">
          <Avatar ifade="kuponlu" boy={104} oncelik ad="Looply'nin maskotu Loopy" />
        </div>

        <p className="mt-3 etiket-caps text-yazi-sonuk">
          Kafeler ve butik işletmeler için
        </p>

        {/* Dev başlık — üç örnekte de ekranı dolduruyor. Ü142'den beri
            "Geri gel." daktilo gibi yazılıyor ve arkadaki ödül
            etiketleri sırayla yanıyor (bkz. `vitrin-kahraman.tsx`). */}
        <KahramanBaslik />

        {/*
          🔴 Ü220 · referansın H1'i buraya ikinci satır olarak girdi.

          Ürün sahibinin içerik listesinde kahraman başlığı *"Müşterin
          kafene geldi. Peki yarın neden tekrar gelsin?"* idi ve bizimki
          *"Oyna. Kazan. Geri gel."* İkisi arasında seçim sorulduğunda
          **ikisi birden** dendi.

          Sıralama tesadüf değil ve üçlü bir yapı kuruyor:

            slogan  → Oyna. Kazan. Geri gel.        (ne yapıyoruz)
            soru    → Peki yarın neden tekrar gelsin? (işletmecinin derdi)
            cevap   → Müşterin … indirim kazansın…    (nasıl çözüyoruz)

          Soru cevaptan ÖNCE geliyor: sloganın hemen ardından bir vaat
          okumak, henüz sorulmamış bir soruya cevap vermek olurdu.

          ⚠️ Soru daha büyük ve koyu, cevap küçük ve sönük: ikisi aynı
          ağırlıkta olsaydı kahramanda üç eşit paragraf dururdu ve göz
          hangisinin önemli olduğunu bilemezdi.
        */}
        <p className="mx-auto mt-7 max-w-2xl font-display text-[clamp(19px,3vw,27px)] leading-[1.18] font-extrabold tracking-[-0.02em]">
          Müşterin kafene geldi.{" "}
          <span className="text-vurgu">Peki yarın</span> neden tekrar gelsin?
        </p>

        <p className="mx-auto mt-4 max-w-xl text-[16px] leading-relaxed text-yazi-sonuk sm:text-[17px]">
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

      {/*
        🔴 Ü156 · SİMÜLASYON YUKARI TAŞINDI.

        Ürün sahibi: *"simülasyonu daha üste koyalım, müşterini elinde
        tutmak indirim yapmaktan ucuz kısmının üstüne koyalım."*

        Sebebi onun kendi cümlesinde: *"müşteri kazanmak için en önemli
        araçlarımızdan biri bu."* Aşağıdayken ziyaretçinin ona ulaşması
        için dört bölüm okuması gerekiyordu; ikna olmadan ayrılan hiç
        görmüyordu.

        ⚠️ **Dalga 8'in sırası bilerek değiştirildi.** O sırada generatör
        avantajlardan sonra geliyordu (ürün sahibinin o günkü tarifi).
        Yeni yer daha erken: kaydırmalı sahne biter bitmez, ürünün ne
        yaptığı anlatılmadan **önce** "kendi rakamlarınla dene" diyor.
        Aynı kişinin sonraki kararı, öncekini geçersiz kılıyor.
      */}
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
      {/*
        🔴 Ü156 · bölüm ÖNE ÇIKARILDI.

        Ürün sahibi: *"bu kısmı da daha çok öne çıkarmalıyız, müşteri
        kazanmak için en önemli araçlarımızdan biri bu."*

        ── Neden yalnızca büyütmek yetmezdi ────────────────────
        Kutu krem zeminde krem bir kutuydu ve çevresindeki bölümlerle
        aynı ritimde duruyordu; göz onu bir bölüm değil, bir dipnot
        sanıyordu. Asıl kusur ise daha derin: kutu **"buradan git"**
        diyordu ama gidilecek şeyin ne olduğunu **göstermiyordu.**

        ── İki şey değişti ─────────────────────────────────────
        **1 · Zemin lacivert.** Bu bölgedeki tek koyu blok; sayfanın
        krem-beyaz ritmini kırdığı için kaydırırken duruyorsunuz.
        **2 · Aracın kendisinden bir parça var.** Üç oran çubuğu
        kendiliğinden oynuyor ve altındaki sonuç çubuğu onlarla birlikte
        değişiyor: ziyaretçi tıklamadan önce "burada ayar çevirip sonuç
        görüyorum" fikrini anlıyor.

        ⚠️ **Rakam hâlâ YOK ve olmayacak.** Etiketler simülasyonun kendi
        etiketleri ama sonuç bir **çubuk**, para değil. "Ayda 40.000 TL"
        demek ziyaretçinin kendi rakamlarıyla göreceği tabloyu bizim
        sözümüzle ezmek olurdu — aracın bütün değeri sayının bizden
        değil ondan çıkması (Ü142'nin kararı, bozulmadı).

        ⚠️ Simülasyonun kendisi hâlâ burada değil (Ü142): sekiz girdi
        ve dört oran ana sayfanın en uzun bölümüydü. Bu bir **fragman**,
        kopyası değil.
      */}
      <section className="mx-auto w-full max-w-6xl px-5 py-16 sm:py-20">
        <Beliren yon="yakin">
          <div className="overflow-hidden rounded-3xl bg-vitrin-lacivert text-yuzey shadow-[0_30px_70px_-30px_rgba(16,32,77,0.6)]">
            <div className="grid gap-8 px-6 py-10 sm:px-10 sm:py-12 lg:grid-cols-[1.05fr_1fr] lg:items-center lg:gap-12">
              <div>
                <p className="etiket-caps text-[10px] text-odul">
                  Çift yönlü müşteri değeri
                </p>
                <p className="mt-3 font-display text-[clamp(25px,4.4vw,40px)] leading-[1.08] font-extrabold tracking-[-0.025em]">
                  Müşterin hem düzenli gelse hem{" "}
                  <span className="text-odul">arkadaşını getirse</span> ne olur?
                </p>
                <p className="mt-4 max-w-md text-[15px] leading-relaxed text-white/65 sm:text-[16px]">
                  Üç davranış oranını sen seç, kendi rakamlarını yaz — senaryoyu
                  kafende gör. Tahmin değil, senin girdiğin sayılarla hesap.
                </p>
                <Link
                  href="/simulasyon"
                  className="mt-7 inline-flex items-center gap-2 rounded-full bg-odul px-8 py-4 text-[16px] font-bold text-vitrin-lacivert transition-transform hover:scale-[1.03]"
                >
                  Simülasyonu aç
                  <span aria-hidden>→</span>
                </Link>
              </div>

              <SimulasyonFragmani />
            </div>

            {/*
              🔴 Kayıt çağrısı — Ü156, ürün sahibinin isteği:
              *"simülasyonun altında da koyalım hemen kayıt ol kısmını."*

              ── Neden panelin İÇİNDE, ayrı bir bölüm değil ────────
              Buradaki ziyaretçi az önce "kendi rakamlarınla dene"yi
              görmüş, yani ilgisinin en yüksek olduğu an. Araya boşluk
              ve yeni bir zemin girseydi o an soğur; çağrı simülasyonun
              **devamı** gibi durmalı, ayrı bir reklam gibi değil.

              ⚠️ Metin sayfadaki diğer lead şeridinden (*"Kafenin
              karekodu beş dakikada hazır"*) **farklı**: aynı cümleyi iki
              kez okumak çağrının ikisini birden zayıflatır. Bu, az önce
              görülen hesabın üstüne biniyor — "rakamlar tuttuysa".

              ⚠️ "Dört alan" uydurma değil: başvuru Ü126'da dört alana
              indirildi (ticari unvan, vergi no, adres ve vergi levhası
              kalktı). Sayfadaki her somut ifade gibi bu da doğrulanabilir.
            */}
            <div className="flex flex-col items-center justify-between gap-4 border-t border-white/10 bg-white/[0.04] px-6 py-6 text-center sm:flex-row sm:px-10 sm:text-left">
              <div>
                <p className="font-display text-[18px] leading-tight font-extrabold tracking-tight sm:text-[20px]">
                  Rakamlar tuttuysa, sıra kendi kafende.
                </p>
                <p className="mt-1.5 text-[14px] leading-relaxed text-white/60">
                  Başvuru dört alan. Onaylanınca panelin açılıyor ve karekodunu
                  oradan yazdırıyorsun.
                </p>
              </div>
              <Link
                href="/kafe/basvuru"
                className="shrink-0 rounded-full bg-yuzey px-7 py-3.5 text-[15px] font-bold text-vitrin-lacivert transition-transform hover:scale-[1.03]"
              >
                Hemen kayıt ol
              </Link>
            </div>
          </div>
        </Beliren>
      </section>

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
            Başlığın altında kapanan döngü — Dalga 10.

            Bu bölümün tek iddiası **geri dönüş**. Altındaki üç kutu onu
            anlatıyor; iz onu **çiziyor**: ok kafeden çıkıp dolanıyor ve
            başladığı yere dönüyor. Soluklaşan bir kutu "buradayım" der,
            çizilen bir iz "bu oluyor" der — eksik olan ikincisiydi.

            ⚠️ Logoyla aynı dil: `oo` sonsuzluk ilmeği (Ü118). Yeni bir
            işaret icat edilmiyor, var olan fikir tekrarlanıyor.
          */}
          <Cizilen gecikme={260} sure={1.5} className="mt-8 flex justify-center">
            <DonguIzi />
          </Cizilen>

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

          {/* Üç kutu teker teker giriyor. Elle yazılmış gecikmeler
              kalktı: ritim artık kabın işi ve dördüncü kutu eklenirse
              kendiliğinden sıraya giriyor. */}
          <Sirali adim={110} cocukSinifi="h-full" className="mt-14 grid gap-4 sm:grid-cols-3">
            <Kart
              baslik="Müşterin geri gelir"
              metin="Kazandığı indirimi kullanmak için ikinci kez kapından girer. Sadakat, hatırlatmayla değil, elinde duran bir ödülle kurulur."
            />
            <Kart
              baslik="Bekleme keyfe dönüşür"
              metin="Sipariş beklerken telefonuna bakan müşteri, senin kafende oyun oynar. O dakikalar artık şikâyet değil."
            />
            <Kart
              baslik="Kontrol sende"
              metin="Hangi ödül, ne sıklıkla, ne kadar — hepsini kendi panelinden sen belirlersin."
            />
          </Sirali>
        </div>
      </section>

      {/*
        🔴 Ü228 · *"Sorun"* bölümü KALDIRILDI (ürün sahibinin kararı).

        Ü200'de eklenmiş, Ü220'de referansın içerik listesiyle
        eşleşmişti, Ü227'de maskotla yer değiştirmişti. Dört itiraz
        sorusu soruyordu: reklam · yarın gelme sebebi · indirim ölçümü ·
        yeni ürünü duyurma.

        ⚠️ **Ü200'ün "soru–cevap çifti" kaygısı kendiliğinden çözüldü:**
        soru bölümü gidince `VitrinDongusu` havada kalan bir cevabı
        değil, kendi başına duran bir anlatıyı taşıyor.

        ⚠️ Argümanın tamamı kaybolmadı: *"reklamdan sonra ne oluyor"*
        sorusu aşağıdaki **reklam karşılaştırması** bölümünde, indirim
        ölçümü ise **Ölçüm** bölümünde duruyor.

        ⚠️ Üst menüden de çıkarıldı (`vitrin-ust.tsx`) — hedefi olmayan
        bir bağlantı bırakmak, tıklayanı sayfanın ortasına atardı.
      */}

      {/*
        ═══ Maskot ══════════════════════════════════

        Ü219'da yazıldı, Ü227'de buraya taşındı. Bölüm beyaz zeminli ama
        içi kocaman bir lacivert kart: altındaki `VitrinDongusu` de
        beyaz olmasına rağmen sınır görünüyor.
      */}
      <VitrinLoopy />

      {/*
        ═══ Nasıl çalışır ════════════════════════════

        Yeri tesadüf değil — "neden Looply" anlatıldıktan SONRA geliyor.
        Sayfanın başına konsaydı henüz ne sattığımızı bilmeyen kişiye
        dert anlatmış olurduk.
      */}
      <VitrinDongusu />

      {/* ═══ Gizli açılış — üründe var, sayfada yoktu (Ü200) ══ */}
      <VitrinGizliAcilis />

      {/*
        ═══ Damga kartı · itirazlar ══════════════════════

        🔴 Ü220 — ürün sahibinin içerik listesinde vardı, bizde yoktu.

        Sıra referanstakiyle aynı ve sebebi var: merak bölümü *"müşteri
        yarınını düşünüyor"* diyerek bitiyor, damga kartı bölümü de tam
        oradan başlıyor — *"benim de kartım bunu yapıyor"*. İtirazlar
        hemen ardından geliyor çünkü ilk itiraz cevaplanınca sıradaki
        akla geliyor.
      */}
      <VitrinDamga />
      <VitrinItirazlar />

      {/* ═══ Ek satış — üründe var, sayfada yoktu (Ü200) ═════ */}
      <VitrinEkSatis />

      {/*
        ═══ Ölçüm ════════════════════════════════════════

        🔴 Ü220. İçeriği tamamen yeni değil ama **yeri** yeni: en
        önemli cümlesi (*"satışını otomatik ölçmüyoruz"*) SSS'in kapalı
        bir akordeonunun içindeydi ve tıklanmadan görünmüyordu.
      */}
      <VitrinOlcum />

      {/* ═══ Kimler için — düz beyaz ════════════════ */}
      <section className="py-20 sm:py-28">
        <div className="mx-auto w-full max-w-6xl px-5">
          <Beliren yon="olcek">
            <h2 className="text-center etiket-caps text-yazi-sonuk">
              Kimler için
            </h2>
          </Beliren>

          {/* Dalga 10: iki kart tek blok hâlinde beliriyordu — başlıkla
              birlikte, tek jest. İki ayrı kitleden söz eden bir bölümün
              ikisini aynı anda göstermesi, farkı da aynı anda yutuyordu.
              Artık teker teker giriyorlar. */}
          <Sirali adim={140} cocukSinifi="h-full" className="mt-10 grid gap-4 sm:grid-cols-2">
              <div className="h-full rounded-2xl border border-cizgi p-8">
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
              <div className="h-full rounded-2xl border border-dashed border-cizgi p-8">
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
          </Sirali>
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
        🔴 *"Dürüst olalım / Burada müşteri yorumu görmeyeceksin"*
        bölümü KALDIRILDI — Ü231, ürün sahibi: *"bu çok saçma bir
        başlık."*

        Dalga 8'de sosyal kanıt yuvası olarak açılmış, Ü228'de
        kaldırılmış, Ü229'da görselleştirilerek geri gelmiş ve Ü231'de
        başlığı yüzünden tamamen çıkmıştı. Üç turda üç karar; kalıcı
        olan sonuncusu.

        ⚠️ Yuva boş: ilk gerçek kafeler geldiğinde **asıl** sosyal
        kanıt buraya gelecek. Uydurma referans / şişirilmiş sayı yasağı
        (Dalga 8) o gün de geçerli.

        ⚠️ Bölümün taşıdığı kural — *"söylediğimiz her şey üründe
        doğrulanabilir"* — `vitrin-olcum.tsx`te yazılı ve orada
        kalıyor.
      */}

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
              {/* Dört madde BİRDEN duruyor — sıralı değil. Gösterim
                  toptan satılıyor, tek tek kimse sayılmıyor; sağdaki
                  sütunun sayması bu durgunlukla karşılaştırılınca
                  anlam kazanıyor. */}
              <ul className="mt-5 space-y-3.5 text-[15px] leading-relaxed text-yazi-sonuk">
                <li>
                  <Eksi>Kaç kişi gördü — ama kaçı geldi, bilinmiyor</Eksi>
                </li>
                <li>
                  <Eksi>Gelen müşteri bir daha gelmezse haberin olmuyor</Eksi>
                </li>
                <li>
                  <Eksi>Para gösterimde harcanıyor, müşteride değil</Eksi>
                </li>
                <li>
                  <Eksi>Durduğun gün etki de duruyor</Eksi>
                </li>
              </ul>
            </div>
          </Beliren>

          <Beliren yon="sag" gecikme={160}>
            <div className="h-full rounded-3xl border-2 border-vurgu/40 bg-yuzey px-7 py-8 shadow-[0_24px_60px_-30px_rgba(16,32,77,0.45)]">
              <p className="etiket-caps text-vurgu">Looply kullandığında</p>
              {/*
                🔴 Dalga 10 — asimetri argümanın kendisi.

                Sol sütun (reklam) dört maddeyi **birden** gösteriyor:
                gösterim toptan satılır, tek tek kimse sayılmaz. Sağ
                sütun **teker teker** sayıyor — bölümün iddiası zaten bu:
                *"Reklam gösterimi sayar. Looply kapıdan gireni sayar."*

                İki sütun aynı ritimle girseydi cümle ekranda değil
                yalnızca metinde kalırdı.
              */}
              <Sirali
                etiket="ul"
                cocukEtiketi="li"
                adim={170}
                gecikme={240}
                className="mt-5 space-y-3.5 text-[15px] leading-relaxed"
              >
                <Arti>Kaç kişi geldi, kaçı ilk kez — sayıyla</Arti>
                <Arti>Kaçı ikinci kez geldi, ne kadar sürede</Arti>
                <Arti>Hangi saatler boş, hangi ürün çekiyor</Arti>
                <Arti>
                  Para yalnızca <strong className="font-semibold">kasada kullanılan</strong>{" "}
                  kupon için çıkıyor
                </Arti>
              </Sirali>
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
      {/* ═══ SSS — son çağrıdan hemen önce (Ü200) ════
          Satış engelleri burada kapanıyor; cevaplanmamış bir soruyla
          son düğmeye gelen kişi tıklamıyor. */}
      <VitrinSSS />

      <section id="son-cagri" className="relative overflow-hidden bg-vitrin-lacivert py-20 text-yuzey sm:py-28">
        {/*
          Yavaşça gezen ışık — Dalga 10.

          Sayfanın **son** ekranıydı ve tamamen hareketsizdi: okuyucunun
          ayrıldığı yer duran bir duvar oluyordu. Işık altın tonunda
          (vitrin paleti: beyaz · fildişi · mavi · altın; siyah yok) ve
          18 saniyelik — fark edilmesi değil, ekranın ölü durmaması
          amaçlanıyor.

          ⚠️ `overflow-hidden` bölümde: ışık kutunun dışına taşarsa
          mobilde yatay kaydırma doğar. Dalga 8'de tam bu yüzden 390
          piksellik ekranda belge 406 piksel olmuştu.
        */}
        <div
          aria-hidden
          className="lacivert-isik pointer-events-none absolute -top-1/4 left-1/2 -z-0 h-[120%] w-[140%] -translate-x-1/2 rounded-full opacity-60 blur-3xl"
          style={{
            background:
              "radial-gradient(closest-side, rgba(214,178,94,0.20), rgba(214,178,94,0) 70%)",
          }}
        />
        <div className="relative z-[1] mx-auto w-full max-w-6xl px-5 text-center">
          <Beliren yon="olcek">
            <h2 className="mx-auto max-w-2xl font-display text-[clamp(32px,5.5vw,60px)] leading-[1.02] font-extrabold tracking-[-0.035em]">
              Kullanmazsan
              <br />
              ne kaybedersin?
            </h2>
          </Beliren>

          {/* Üç kayıp — hareketsizliğin devam eden bedeli.
              Teker teker sayılıyorlar: kayıp bir liste değil, birikiyor. */}
          <Sirali
            adim={160}
            cocukSinifi="h-full"
            className="mx-auto mt-12 grid max-w-3xl gap-3 text-left sm:grid-cols-3"
          >
            <Kayip
              baslik="Bugün gelen müşteriyi"
              metin="Hesabı ödeyip çıkan müşterinin elinde, yarın geri gelmek için bir sebep kalmıyor."
            />
            <Kayip
              baslik="Kimin geldiğini"
              metin="Kaç kişi geldi, kaçı ikinci kez geldi, hangi saat boş kaldı — ölçmediğin şeyi düzeltemiyorsun."
            />
            <Kayip
              baslik="Reklama verdiğin parayı"
              metin="Gösterim satın alıyorsun, ziyaret değil. Durduğun gün etkisi de duruyor."
            />
          </Sirali>

          <Beliren yon="olcek" gecikme={120} className="mt-16">
            {/*
              Elinde kupon tutan Loopy — Ü219.

              🔴 Yeri **dönüş noktası**: üstünde üç kayıp sayılıyor,
              altında "denersen ne kaybedersin" soruluyor. Karakter tam
              o iki cümlenin arasında ve elinde müşterinin kazandığı
              şey var — bölümün tonu orada kayıptan kazanca dönüyor.

              ⚠️ Kayıpların ÜSTÜNE konmadı. Loopy hep pozitif (Ü176) ve
              "Bugün gelen müşteriyi kaybediyorsun" cümlesinin yanında
              gülen bir maskot, iki mesajı da bozardı.

              ⚠️ `kuponlu` karesi zaten havada bir poz; `Avatar` ona
              zıplama hareketi vermiyor (nefes yetiyor) — yoksa iki
              zıplama üst üste binerdi.

              ⚠️ Gölge (`loopy-golge`) tam olarak lacivert bölümün
              tonunda: koyu zeminde kaybolduğu için karakter havada
              duruyor, altına leke düşmüyor.
            */}
            <div className="flex justify-center">
              <Avatar ifade="kuponlu" boy={128} oncelik={false} />
            </div>

            <p className="mx-auto mt-4 max-w-2xl font-display text-[clamp(22px,3.4vw,34px)] leading-[1.15] font-extrabold tracking-[-0.02em]">
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

      {/*
        ═══ Yapışkan çağrı (Ü200) ════════════════════

        ⚠️ Girişli kullanıcıya GÖSTERİLMİYOR: zaten müşterimiz olan
        işletmeciye "hemen dene" demek, ona başvuru formu göstermek
        olurdu. Karar burada, bileşende değil — bileşenin oturumdan
        haberi yok ve olmasına gerek de yok.

        ⚠️ Alt boşluk: şerit `fixed` ve sayfanın son satırını örtüyordu.
        Alt şeridin altına şeridin yüksekliği kadar pay bırakılıyor.
      */}
      {!o && (
        <>
          <div aria-hidden className="h-20" />
          <YapiskanCagri sonBolumId="son-cagri" />
        </>
      )}
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
 *
 * ⚠️ **`<li>` üretmiyorlar** (Dalga 10). Sağ sütun `Sirali` ile teker
 * teker giriyor ve o kap her çocuğu kendi ögesine sarıyor; madde de
 * `<li>` olsaydı `<li><li>` doğardı. Satır ögesi artık çağrı yerinde:
 * iki sütun da `<ul>` içinde duruyor, biri düz biri sıralı.
 */
function Eksi({ children }: { children: React.ReactNode }) {
  return (
    <span className="flex gap-3">
      <span
        aria-hidden
        className="mt-[3px] flex size-[18px] shrink-0 items-center justify-center rounded-full bg-yazi-sonuk/15 text-[13px] leading-none font-bold text-yazi-sonuk"
      >
        −
      </span>
      <span>{children}</span>
    </span>
  );
}

function Arti({ children }: { children: React.ReactNode }) {
  return (
    <span className="flex gap-3">
      <span
        aria-hidden
        className="mt-[3px] flex size-[18px] shrink-0 items-center justify-center rounded-full bg-vurgu text-[12px] leading-none font-bold text-yuzey"
      >
        ✓
      </span>
      <span>{children}</span>
    </span>
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

/**
 * Kapanan döngü izi — Dalga 10.
 *
 * Kafeden çıkan ok dolanıp kapıya geri dönüyor: bölümün tek iddiası bu.
 *
 * ── ⚠️ `pathLength="1"` zorunlu ─────────────────────────────
 *
 * `Cizilen` hareketi saf CSS'te tutuyor ve bunun tek yolu yol uzunluğunu
 * normalleştirmek. Bu öznitelik unutulursa iz çizilmiş görünmez — bir
 * test onu koruyor.
 *
 * ── Neden ok kafanın ayrı bir yolu ──────────────────────────
 *
 * Tek parça çizilseydi ok ucu izin ortasında bir yerde belirir ve
 * "dönüş tamamlandı" anı kaybolurdu. Ayrı yol + kendi gecikmesi: önce
 * yay tamamlanıyor, sonra ok başladığı yere basıyor.
 */
function DonguIzi() {
  return (
    <svg
      viewBox="0 0 220 64"
      role="img"
      aria-label="Müşteri gidiyor ve geri dönüyor"
      className="h-14 w-full max-w-[220px] text-vurgu"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {/* Gidiş ve dönüş — tek sürekli yay. */}
      <path
        pathLength="1"
        d="M26 40c0-16 14-26 32-26s32 10 32 26 14 26 32 26 32-10 32-26-14-26-32-26"
        style={{ opacity: 0.85 }}
      />
      {/*
        Kapıya dönen ok ucu — yay başladığı yere vardığında basıyor.

        ⚠️ Satır içi gecikme kısayoldaki gecikmeyi **değiştiriyor**,
        eklemiyor. Yay 260 ms'de başlayıp 1,5 sn sürüyor, yani 1.760'ta
        bitiyor; ok 1.550'de giriyor ve son kıvrımla hafifçe örtüşüyor.
      */}
      {/* ⚠️ Ucun köşesi yayın başlangıcıyla (26,40) **aynı noktada**.
          İlk çizimde uç x=21'deydi ve yay x=26'da başlıyordu: gözle
          bakınca ok yaya değmiyor, ayrı bir işaret gibi duruyordu.

          🔴 **Ok ucu eğrinin TEĞETİYLE de hizalı olmak zorunda.** İkinci
          denemede yatay bir `<` kondu ve ürün sahibi *"okun ucu yanlış"*
          dedi; haklıydı ve sebebi ölçülebilir: yay bu noktadan `c0 -16`
          ile, yani **dik yukarı** ayrılıyor. Teğet dikeyken yatay duran
          bir ok ucu eğriye ait değil, yanına yapıştırılmış gibi duruyor.

          Ok artık aşağı bakıyor — tepesi (26,40)'ta, kanatları yukarı.
          Göz eğriyi "sağdan gelip bu noktaya inen yol" diye okuyor;
          yani müşteri geri dönmüş oluyor. */}
      <path pathLength="1" d="M19 33l7 7 7-7" style={{ animationDelay: "1.55s" }} />
    </svg>
  );
}

/**
 * Simülasyonun fragmanı — Ü156.
 *
 * Üç oran çubuğu kendiliğinden oynuyor, altındaki sonuç çubuğu onlarla
 * birlikte değişiyor. Anlatılan şey bir sayı değil, **mekanizma**:
 * "burada ayar çevirip sonuç görüyorsun."
 *
 * ⚠️ Etiketler simülasyonun **kendi** etiketleri
 * (`vitrin-simulasyon.tsx`): Kendi gelme oranı · 7 gün içinde ziyaret ·
 * Arkadaşını getirme. Uydurma bir arayüz göstermek, tıklayınca başka
 * bir şey bulmak demekti.
 *
 * ⚠️ Sonuç **çubuk**, para değil. Rakam yazmama kararı Ü142'den geliyor
 * ve burada da geçerli: aracın değeri sayının ziyaretçiden çıkması.
 *
 * ⚠️ `aria-hidden`: ekran okuyucuya üç yüzdesiz çubuk okumak bilgi
 * değil gürültü. Anlam yandaki metinde ve düğmede.
 */
function SimulasyonFragmani() {
  const ORANLAR = [
    { ad: "Kendi gelme oranı", n: 0 },
    { ad: "7 gün içinde ziyaret", n: 1 },
    { ad: "Arkadaşını getirme", n: 2 },
  ];

  return (
    <div
      aria-hidden
      className="rounded-2xl bg-white/[0.06] px-5 py-6 ring-1 ring-white/10 sm:px-6"
    >
      <div className="space-y-4">
        {ORANLAR.map((o) => (
          <div key={o.ad}>
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-[12px] font-semibold text-white/70">{o.ad}</span>
              <span
                className="sim-yuzde font-data text-[12px] text-odul tabular"
                style={{ "--n": o.n } as React.CSSProperties}
              />
            </div>
            <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-white/10">
              <div
                className="sim-cubuk h-full rounded-full bg-vurgu"
                style={{ "--n": o.n } as React.CSSProperties}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Sonuç — üç orandan türeyen tek çubuk. */}
      <div className="mt-6 border-t border-white/10 pt-5">
        <div className="flex items-baseline justify-between gap-3">
          <span className="etiket-caps text-[10px] text-odul">Senin senaryon</span>
          <span className="text-[11px] text-white/45">kendi rakamlarınla</span>
        </div>
        <div className="mt-2 h-3 overflow-hidden rounded-full bg-white/10">
          <div className="sim-sonuc h-full rounded-full bg-odul" />
        </div>
      </div>
    </div>
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
