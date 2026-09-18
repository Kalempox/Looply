import Link from "next/link";
import { redirect } from "next/navigation";
import * as oturum from "@/domain/session";
import * as masaOturumu from "@/domain/masa";
import { idIleBul, gorunum } from "@/domain/player";
import { ozet } from "@/domain/puan";
import { kafeSeviyesi, type KafeSeviyesi } from "@/domain/xp";
import * as liderlik from "@/domain/liderlik";
import * as cark from "@/domain/cark";
import * as seri from "@/domain/seri";
import * as challenge from "@/domain/challenge";
import * as oyunSecimi from "@/domain/oyun-secimi";
import { withBypass } from "@/db/context";
import * as happy from "@/domain/happy";
import {
  BiletYuzeyi,
  KoyuKart,
  SiraJetonu,
  RenkliKart,
} from "@/components/oyuncu";
import { RENK, oyunRengi, type OyuncuRengi } from "@/components/oyuncu-renk";
import { Gorsel, oyunGorseli, type GorselAdi } from "@/components/oyuncu-gorsel";
import { OyunIkonu, CarkIkonu, KupaIkonu, TacIkonu, MadalyaIkonu } from "@/components/oyuncu-ikon";
import { LooplyLogo } from "@/components/logo";
import { LoopySozu, LoopyPozitif } from "@/components/loopy-sozu";
import { OyunSahnesi, sahneVarMi } from "@/components/oyun-sahnesi";
import { OyuncuNav, NavBosluk } from "@/components/oyuncu-nav";
import { AvatarYuvasi } from "@/components/avatar-yuvasi";
import { SeriSahnesi } from "@/components/seri-sahnesi";
import { kodEkrandaGosterilir } from "@/sms";
import { DurumSeridi, type SeritDurumu } from "./durum-seridi";

export const dynamic = "force-dynamic";

/**
 * Oyuncu ana ekranı.
 *
 * Ekrandaki her sayı sunucudan geliyor — puan bakiyesi defterin toplamı,
 * kupon sayısı sorgunun sonucu. İstemcide hiçbir şey hesaplanmıyor
 * (Faz 4 güvenlik kapısı).
 *
 * Tasarım: ekranın tepesindeki durum şeridi oyuncunun tek gerçek sorusuna
 * cevap veriyor — "kazanabiliyor muyum?". Gerisi ona göre sıralanıyor.
 */
export default async function OynaSayfasi() {
  const o = await oturum.oku();
  if (!o || o.rol !== "oyuncu") redirect("/giris");

  const oyuncu = await idIleBul(o.ozneId);
  if (!oyuncu) redirect("/giris");

  const g = gorunum(oyuncu);
  const masa = await masaOturumu.aktif(o.ozneId);

  // Ü95: masa yoksa sebebi öğren — hiç okutmadı mı, yoksa oturumu mu doldu?
  // İkisine de "Kafe dışındasın" demek, masadan kalkmamış oyuncuyu kendini
  // kafe dışında sanılıyor sanmaya itiyordu.
  const dolan = masa ? null : await masaOturumu.sonDolanOturum(o.ozneId);
  const sayilar = await ozet(o.ozneId, masa?.cafeId);
  // Ü15: seviye kafe bazında — kafe dışında gösterilecek bir seviye yok.
  const seviyeBilgisi = masa ? await kafeSeviyesi(o.ozneId, masa.cafeId) : null;
  // Ü109: bonuslu oyun kafenin AÇIK listesinden. Kafe o günün oyununu
  // kapattıysa platform takvimine uymak, oynanamayan bir oyunu
  // "bugünün oyunu" diye göstermek olurdu.
  const bonus = await oyunSecimi.gununOyunuKafede(masa?.cafeId ?? null);
  // Katalog kartındaki sayı da kafeye göre: "4 oyun" yazıp katalogda üç
  // oyun göstermek, kapatılan oyunu aramaya yollar.
  const acikSayisi = (await oyunSecimi.acikOyunlar(masa?.cafeId ?? null)).length;

  // Ö3: açık Happy Hour penceresi — yalnızca kafedeyken anlamlı.
  const pencere = masa ? await happy.acikPencere(masa.cafeId) : null;

  // Bugünün sıralaması — yalnızca kafedeyken anlamlı. Günün oyunu
  // üzerinden tutuluyor ki skorlar karşılaştırılabilir olsun.
  const lider = masa
    ? await liderlik.bugun({ cafeId: masa.cafeId, oyunId: bonus.id, bakanId: o.ozneId })
    : null;

  // Ü105: haftalık sezondaki kendi sıran — liderlik kartının altında tek
  // satır. Ayrı kart açmak ana ekranı uzatırdı; sezonun asıl yeri
  // /liderlik ve bu satır oraya gitmek için bir sebep veriyor.
  const sezon = liderlik.sezon();
  const haftalik = masa
    ? liderlik.kendiSatiri(await liderlik.hafta({ cafeId: masa.cafeId, bakanId: o.ozneId }))
    : null;

  // Ü49: günlük çark — yalnızca kafedeyken, ödül kafenin bütçesinden çıkıyor.
  const carkDurumu = masa
    ? await cark.durum({ playerId: o.ozneId, cafeId: masa.cafeId })
    : null;
  // Ü158: aralık kafenin ayarı — kart üzerindeki cümle bunu söylemeli.
  const carkAralik = masa ? await cark.aralikSaat(masa.cafeId) : 24;

  // Ü54: günlük seri. Kafe başına — seri, o kafenin müşterisini geri
  // getirme aracı; kafeler arası ortak olsaydı A'da oynayıp B'de
  // ödüllenmek mümkün olurdu.
  const seriDurumu = masa
    ? await withBypass("günlük seri", (db) =>
        seri.hesapla(db, { playerId: o.ozneId, cafeId: masa.cafeId }),
      )
    : null;

  // Ü106: günün görevi. Kafe dışında gösterilmiyor — görev kafede oynayarak
  // tamamlanıyor ve tamamlanamayacak bir hedefi göstermek yalnızca hayal
  // kırıklığı üretir.
  const gorev = masa
    ? await withBypass("günün görevi", (db) =>
        challenge.ilerleme(db, { playerId: o.ozneId, cafeId: masa.cafeId }),
      )
    : null;

  const seridDurumu = seridBelirle(masa, dolan);
  const kazanabilir = seridDurumu.tur === "dogrulandi";

  return (
    <main className="min-h-dvh bg-zemin text-yazi">
      <div className="mx-auto w-full max-w-md px-5 pb-16">
        <DurumSeridi durum={seridDurumu} demoKapisi={kodEkrandaGosterilir()} />

        {/* ── Durum kartı (Ü61) ─────────────────────────
            Oyuncu tarafının dili çarktan geliyor: koyu zemin, ışın
            dokusu, canlı vurgular. Panelin dili sakin ve resmî;
            oyuncununki heyecanlı olmalı, ikisi bilerek ayrıştı. */}
        <section className="gir mb-8">
          <DurumKarti
            ad={g.ad}
            puan={sayilar.kafePuani ?? 0}
            kupon={sayilar.aktifKupon}
            masada={!!masa}
            seviye={seviyeBilgisi}
          />
        </section>

        {g.odulKilidiBitis && (
          <div className="mb-10 rounded-lg border border-odul/50 bg-cukur px-4 py-3.5">
            <div className="etiket-caps text-odul-koyu">
              Ödüller geçici olarak kilitli
            </div>
            <p className="mt-1.5 text-[13px] leading-relaxed text-yazi-sonuk">
              Telefon numaran yakında değişti. Güvenlik için{" "}
              {g.odulKilidiBitis.toLocaleString("tr-TR", {
                hour: "2-digit",
                minute: "2-digit",
                day: "numeric",
                month: "long",
              })}
              &apos;a kadar kupon kullanılamıyor. Oynamaya devam edebilirsin, puanların birikir.
            </p>
          </div>
        )}

        {pencere && <HavuzKarti pencere={pencere} kafeAdi={masa!.cafeAdi} />}

        {gorev && <GorevKarti ilerleme={gorev} />}

        {seriDurumu && seriDurumu.gun > 0 && <SeriKarti seri={seriDurumu} />}

        {carkDurumu && <CarkKarti durum={carkDurumu} aralikSaat={carkAralik} />}

        {lider && (
          <LiderKarti
            liste={lider}
            oyunAdi={bonus.ad}
            haftalik={haftalik}
            kalanGun={sezon.kalanGun}
          />
        )}

        {/* ── Günün oyunu ───────────────────────────────── */}
        {/*
          Ü176: tasarımdaki hâline getirildi. Bölüm başlığı kartın
          İÇİNE girdi, sahne çizimi geldi, düğme hap biçimini aldı.

          ⚠️ Loopy'nin balonu KALKTI — ürün sahibi *"sadece hadi
          oynayalım yazmasın"* dedi. Karakter duruyor, sözü gitti:
          kartta zaten "Oyna" yazan bir düğme var ve balon aynı şeyi
          ikinci kez söylüyordu.
        */}
        <section className="mb-10">
          <BiletYuzeyi renk={oyunRengi(bonus.id)} className="px-5 pt-5 pb-5">
            <p className="etiket-caps text-odul">Bugünün oyunu</p>

            <div className="mt-2 flex items-start gap-2">
              <div className="min-w-0 flex-1">
                <h2 className="font-display text-[34px] leading-none font-extrabold tracking-tight text-white">
                  {bonus.ad}
                </h2>
                <p className="mt-2 text-[14px] leading-snug text-white/80">{bonus.ozet}</p>

                <div className="mt-3 flex flex-wrap items-center gap-1.5">
                  {/*
                    "×2 PUAN" DOLU beyaz, "Bugün" saydam: ikisi aynı
                    ağırlıkta olsaydı hangisinin kazanç olduğu
                    belirsiz kalırdı. Kazandıran şey öne çıkıyor.
                  */}
                  <span className="inline-flex items-center gap-1 rounded-full bg-yuzey px-2.5 py-1 text-[11px] font-bold text-odul-koyu">
                    <span aria-hidden className="text-odul">★</span> ×2 PUAN
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-semibold text-white">
                    Bugün
                  </span>
                </div>
              </div>

              {/*
                Sahne ve ikon: ikon beyaz kutuda, sahne onun arkasında
                taşıyor. Tasarımdaki katman sırası bu — kutu oyunu
                tanıtıyor, sahne oyunun ne olduğunu gösteriyor.
              */}
              <div className="relative shrink-0">
                <span className="absolute -top-1 -left-2 z-10 flex size-12 items-center justify-center rounded-2xl bg-yuzey shadow-lg">
                  <OyunIkonu oyunId={bonus.id} boy={28} />
                </span>
                {/*
                  Ü180: üretilmiş neon sahne. Sahnesi olmayan oyunlar
                  (katalogda bekleyen yedi oyun) eski soluk çizimde
                  kalıyor — uydurma bir sahne koymaktansa.
                */}
                {sahneVarMi(bonus.id) ? (
                  /*
                    ⚠️ Sahne MUTLAK konumda ve kutu sabit: akışta
                    dururken kartın boyunu o belirliyordu ve Düşen'in
                    sahnesi dikey (267×512) olduğu için kartı 40 piksel
                    uzatıyordu. Kutu 124'te sabit, sahne 148 — farkı
                    yukarı taşıyor, kart büyümüyor.
                  */
                  /*
                    ⚠️ Sahne 148'den 190'a çıktı — Ü181: *"kartlarda
                    yeterli alanı kaplamıyor."* Kutu 124'te sabit
                    kaldığı için kart büyümüyor, fark yukarı taşıyor ve
                    parçalar kartın üst kenarından giriyormuş gibi
                    duruyor.
                  */
                  <span className="block h-[124px] w-[124px]">
                    <span className="absolute -right-3 -bottom-2">
                      <OyunSahnesi oyun={bonus.id} boy={190} />
                    </span>
                  </span>
                ) : (
                  <span className="flex h-[112px] w-[140px] items-end justify-center text-white/25">
                    <Gorsel ad={oyunGorseli(bonus.id)} boy={104} />
                  </span>
                )}
              </div>
            </div>

            {/* Loopy: balonsuz, hep pozitif (Ü176). */}
            <div className="pointer-events-none -mt-8 flex justify-end pr-1">
              <span aria-hidden className="block">
                <LoopyPozitif boy={96} />
              </span>
            </div>

            <Link
              href={`/oyna/${bonus.id}`}
              /*
                Hap biçimi ve turuncu gradyan tasarımdan. Karttaki tek
                turuncu bu — bakılacak yer tartışmasız.
              */
              className="-mt-2 flex w-full items-center justify-center gap-2.5 rounded-full py-4 text-center font-display text-[19px] font-bold text-white shadow-lg transition-transform active:scale-[0.99]"
              style={{ background: "linear-gradient(100deg, #fb923c 0%, #f97316 50%, #ea580c 100%)" }}
            >
              <span aria-hidden className="text-[15px]">▶</span> Oyna
            </Link>
          </BiletYuzeyi>
        </section>

        {/* ── Diğer sayfalara geçişler (Ü66) ─────────────
            Oyun karoları ve "fırsatlar" bağlantısı ayrı ayrı
            duruyordu; ikisi de "buradan başka bir yere git" diyor ve
            aynı biçimde durmaları gerekiyordu. */}
        <section className="mb-10 grid gap-2.5">
          <GecisKarti
            yol="/oyunlar"
            ust="Katalog"
            baslik="Tüm oyunlar"
            alt={`${acikSayisi} oyun · kategorilere ayrılmış`}
            renk="gok"
            sahne="tum-oyunlar"
          />
          {masa && (
            <GecisKarti
              yol="/firsatlar"
              ust={masa.cafeAdi}
              baslik="Buradaki fırsatlar"
              alt="Bu kafenin ödül kataloğu ve ürün indirimleri"
              renk="yesil"
              gorsel="etiket"
            />
          )}
        </section>

        {!kazanabilir && (
          <p className="mb-10 border-l-2 border-cizgi pl-4 text-[13px] leading-relaxed text-yazi-sonuk">
            {masa
              ? "Konumunu doğrulayana kadar oyunlar puan kazandırmaz. Yukarıdaki şeritten doğrulayabilirsin."
              : "Puan ve kupon yalnızca bir Looply kafesinde, masadaki karekodu okutunca kazanılır."}
          </p>
        )}

        {/*
          Hesap bağlantıları (davet, verilerim, çıkış) buradan
          **profile taşındı** (Ü66). Ürün sahibi *"çıkış yap,
          arkadaşını çağır vb. butonlar sayfamızın yapısıyla alakasız
          olmuş"* dedi: ana ekran oynanacak yer, hesap ayarları
          profilin işi. Alt alta üç çıplak alt çizgili bağlantı,
          ekranın en altında kalan bir artık gibi duruyordu.
        */}

        <NavBosluk />
      </div>

      {/* Ü159: avatar yuvası. Ana ekran `OyuncuSayfa` kabuğunu
          kullanmıyor (kendi düzeni var), o yüzden yuva burada elle
          duruyor — kabuğa bırakılsaydı ana ekranda hiç çıkmazdı. */}
      <AvatarYuvasi />
      <OyuncuNav aktif="/oyna" />
    </main>
  );
}

/* ── Parçalar ──────────────────────────────────────────── */

function seridBelirle(
  masa: Awaited<ReturnType<typeof masaOturumu.aktif>>,
  dolan: Awaited<ReturnType<typeof masaOturumu.sonDolanOturum>>,
): SeritDurumu {
  // ⚠️ Ü95: "masa yok" iki ayrı şey. Oturumu dolan oyuncuya ne olduğunu ve
  // ne yapacağını söylüyoruz; hiç okutmayana yalnızca ne yapacağını.
  if (!masa) {
    return dolan
      ? { tur: "oturum_doldu", kafe: dolan.cafeAdi, masa: dolan.masaAdi }
      : { tur: "disarida" };
  }

  const ortak = { kafe: masa.cafeAdi, masa: masa.masaAdi };

  // Kazanılmış kanıt her şeyin önünde: kafe konumunu sonradan silse bile
  // bu oyuncu doğrulanmış kalıyor, kanıt biti geri alınmıyor (AL-2).
  if (masa.kanitMaskesi & masaOturumu.K2) {
    return { tur: "dogrulandi", ...ortak, mesafeM: masa.mesafeM };
  }

  // ⚠️ Ü95: doğrulanmamış oyuncuda kafenin konumu YOKSA, doğrulama
  // hiçbir zaman başarılı olamaz. Eskiden bu durum "konum bekliyor"a
  // düşüyordu ve oyuncu kendi hatasını arıyordu; oysa eksik olan kafenin
  // kurulumu. Reddedilmiş konumdan da önce geliyor: izin verilse bile
  // sonuç değişmezdi.
  if (!masa.kafeKonumuVar) {
    return { tur: "kafe_konumsuz", ...ortak };
  }
  if (masa.mesafeM != null) {
    return { tur: "uzak", ...ortak, mesafeM: masa.mesafeM };
  }
  if (masa.konumReddedildi) {
    return { tur: "konum_kapali", ...ortak };
  }
  return { tur: "konum_bekliyor", ...ortak };
}

/**
 * Seviye şeridi — Ü14 ve Ü15'in ana ekrandaki yüzü.
 *
 * Puanın yanında değil altında duruyor: puan harcanan şey, seviye biriken
 * şey. Yan yana konsalardı aynı cinsten iki sayı gibi okunurlardı.
 */
/**
 * Oyuncunun durum kartı — Ü61.
 *
 * ── Neden koyu ve renkli ────────────────────────────────────
 *
 * Ürün sahibinin ayrımı net: **panel resmî ve net, oyuncu tarafı
 * eğlenceli, canlı, içine çeken.** Bu ekran üç beyaz kutuda üç sayı
 * gösteriyordu — doğru bilgi, yanlış ton. Çarkın dili (koyu mor zemin,
 * ışın dokusu, altın vurgu) buraya taşındı.
 *
 * ── Neden tek kart ──────────────────────────────────────────
 *
 * Puan, kupon ve seviye üç ayrı kutudaydı ve üçü de aynı soruyu
 * cevaplıyor: *"bu kafede nerede duruyorum?"* Tek kart, üç kutunun
 * kapladığı yerin yarısını kaplıyor ve okuması bir bakış sürüyor.
 *
 * ── Renkler nereden ─────────────────────────────────────────
 *
 * Zemin çark sahnesiyle aynı aileden. Palet jetonları burada da
 * kullanılıyor (altın vurgu `--color-odul`); yeni renk tanımlanmadı,
 * yalnızca koyu zeminde okunan tonlar seçildi.
 */
function DurumKarti({
  ad,
  puan,
  kupon,
  masada,
  seviye,
}: {
  ad: string;
  puan: number;
  kupon: number;
  masada: boolean;
  seviye: KafeSeviyesi | null;
}) {
  /*
    Ü174: ürün sahibinin gönderdiği tasarıma göre yeniden yazıldı.

    Değişenler: selamlama satırı, sağda konuşan Loopy, ve sayaçlar
    cam kutulardan **beyaz döşemelere** geçti.

    ⚠️ Beyaz döşeme koyu kartın üstünde bilerek: cam kutu (beyaz %10)
    zeminle aynı aileden olduğu için sayılar okunuyordu ama kutular
    görünmüyordu — üç ayrı bilgi tek bir bulanık blok gibi duruyordu.
    Beyaz döşeme her sayıyı kendi kabına koyuyor.

    ⚠️ Zemin `KoyuKart` (ürünün sabit mor imza yüzeyi), `BiletYuzeyi`
    değil — bkz. Ü171.
  */
  /*
    Ü176: profil başlığının kalıbına geçti — ürün sahibi *"profilim
    kısmında yaptığın bu kısmı oyna kısmı için yapmalısın"* dedi.

    Değişen: üç döşeme artık kartın İÇİNDE değil, alt kenarına
    **biniyor**. Kart ile içerik arasındaki sınırı yumuşatıyor ve
    sayıları "kartın bir parçası" olmaktan çıkarıp "kartın taşıdığı
    şey" yapıyor.

    ⚠️ Döşeme sırası `relative` ŞART: kart konumlandırılmış
    (`relative`), döşemeler değilse kartın ALTINDA kalıyorlar — DOM'da
    sonra gelmek yetmiyor. Bu tuzağa profil başlığında bir kez
    düşüldü (Ü175).
  */
  return (
    <div>
      {/*
        🔴 Loopy ARTIK LOGONUN HİZASINDAN başlıyor — Ü179.

        Ürün sahibi: *"kartın böyle uzun olmasına gerek yok, 'bugün
        harika bir gün oynayalım' yazısının altında bitmeli."*

        Sebep ölçüldü: kartın boyunu metin değil **Loopy'nin kolonu**
        belirliyor (balon 52 + boşluk 6 + karakter 146 = 204), metin
        ise 142. Loopy logonun ALTINDAN başlayınca o 204'ün üstüne bir
        de logo satırı biniyordu ve aradaki fark boş mor olarak
        kalıyordu. Aynı satıra alınca logo satırı bedava geliyor.

        ⚠️ Kart yine de metnin bittiği yerde bitmiyor ve bitemez:
        138 piksellik bir karakter 138 piksellik yer istiyor. Kartı
        daha da kısaltmanın tek yolu Loopy'yi küçültmek — ürün sahibi
        iki tur önce büyütülmesini istemişti, o yüzden kısaltma burada
        duruyor.
      */}
      <KoyuKart className="pt-5 pb-9">
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <LooplyLogo boyut={30} beyaz />
            <p className="etiket-caps mt-5 text-white/60">Merhaba</p>
            <h1 className="mt-1.5 font-display text-3xl leading-none font-extrabold tracking-tight">
              {ad}
            </h1>
            <p className="mt-2 text-[13px] leading-snug text-white/70">
              {masada
                ? "Bugün harika bir gün, oynayalım!"
                : "Bir Looply kafesine uğra, puan kazanmaya başla."}
            </p>
          </div>

          {/*
            Loopy'nin sözü kartın DURUMUNA göre değişiyor: masada
            değilken "hedeflerini tamamla" demek, yapılamayacak bir şeyi
            istemek olurdu — oyuncu kafeye gitmeden puan kazanamıyor.

            ⚠️ İfade `keyifli` (Ü176): ürün sahibi Loopy'nin hep
            pozitif olmasını istedi. `sakin`in yüzü düz — nötr bir
            karakter "iyi ki buradasın" demiyor.
          */}
          {/*
            ⚠️ Kolon SABİT genişlikte ve Loopy onun içinde büyüyor —
            Ü174'ün dersi. Esnek kolonda karakteri büyütmek metnin
            yerini yer ve 375 pikselde başlık dört satıra düşer.
            Profil başlığındaki kardeşiyle aynı boy: iki kart yan yana
            görülüyor.

            🔴 `-mr-3` — Ü178. Ürün sahibi *"çok belli değil"* dedi ve
            haklıydı, ama kolonu tek başına genişletmek metinden o
            kadar yer alıyordu. Negatif kenar boşluğu Loopy'yi kartın
            KENDİ İÇ DOLGUSUNA taşırıyor: 20 piksel oradan geliyor,
            metinden değil. Kartın `overflow-hidden`ı dış kenarda
            kırpıyor, dolgunun içi serbest.
          */}
          <div className="-mr-3 w-[9rem] shrink-0">
            <LoopySozu
              soz={masada ? "Hedeflerini tamamla!" : "Seni kafede bekliyorum!"}
              ifade="keyifli"
              boy={150}
              yon="alt"
            />
          </div>
        </div>
      </KoyuKart>

      <div className="relative -mt-8 grid grid-cols-3 gap-2 px-2">
        <Dosem ikon={<TacIkonu boy={20} />} etiket="Kullanılabilir kupon" deger={kupon.toLocaleString("tr-TR")} vurgu={kupon > 0} />
        <Dosem
          ikon={<Gorsel ad="para" boy={22} />}
          etiket={masada ? "Bu kafedeki puanın" : "Puanın"}
          deger={puan.toLocaleString("tr-TR")}
        />
        {seviye ? (
          <Link
            href="/profil"
            className="kart-golge rounded-2xl bg-yuzey px-2 py-3 text-center transition-transform active:scale-[0.98]"
          >
            <span className="flex justify-center text-odul-koyu">
              <MadalyaIkonu boy={20} />
            </span>
            <span className="mt-1.5 block text-[10px] leading-tight font-semibold text-yazi-sonuk">
              Seviyen
            </span>
            <span className="mt-0.5 block font-data text-xl leading-none font-bold text-yazi tabular">
              {seviye.seviye}
            </span>
            <span className="mt-1.5 block h-1 w-full overflow-hidden rounded-full bg-cizgi">
              <span
                className="block h-full rounded-full bg-odul"
                style={{ width: `${seviye.ilerlemeYuzde}%` }}
                role="progressbar"
                aria-valuenow={seviye.ilerlemeYuzde}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="Seviye ilerlemesi"
              />
            </span>
          </Link>
        ) : (
          <Dosem ikon={<MadalyaIkonu boy={20} />} etiket="Seviyen" deger="—" />
        )}
      </div>

      {seviye && seviye.sonrakiEsik !== null && (
        <p className="mt-2.5 text-center font-data text-[10px] text-yazi-sonuk">
          Sonraki seviyeye {(seviye.sonrakiEsik - seviye.xp).toLocaleString("tr-TR")} XP
        </p>
      )}
    </div>
  );
}

/**
 * Karşılama kartındaki beyaz döşeme — Ü174.
 *
 * `CamKutu`nun (beyaz %10) yerini aldı ve sebebi ölçülebilir: cam kutu
 * koyu zeminle aynı aileden olduğu için **kutunun kendisi
 * görünmüyordu**; üç sayı tek bir blok gibi okunuyordu. Beyaz döşeme
 * her sayıya kendi kabını veriyor.
 *
 * ⚠️ `CamKutu` silinmedi: başka ekranlarda (liderlik, oyun kabuğu)
 * hâlâ kullanılıyor ve orada tek başına duruyor, yan yana değil.
 */
function Dosem({
  ikon,
  etiket,
  deger,
  vurgu,
}: {
  ikon: React.ReactNode;
  etiket: string;
  deger: string;
  /** Kazanılmış bir şey varsa sayı altın. */
  vurgu?: boolean;
}) {
  return (
    <div className="kart-golge rounded-2xl bg-yuzey px-2 py-3 text-center">
      <span className="flex justify-center text-odul-koyu">{ikon}</span>
      <span className="mt-1.5 block text-[10px] leading-tight font-semibold text-yazi-sonuk">
        {etiket}
      </span>
      <span
        className={`mt-0.5 block font-data text-xl leading-none font-bold tabular ${
          vurgu ? "text-odul-koyu" : "text-yazi"
        }`}
      >
        {deger}
      </span>
    </div>
  );
}

/**
 * Happy Hour havuzu (Ö3).
 *
 * Kaynak dokümanın kararı **dümdüz**: çarpan yok, görünür TL havuzu var.
 * *"2x puan" oyuncuya hiçbir şey ifade etmez.* Havuz eridikçe aciliyet
 * kendiliğinden doğuyor — ayrı bir "acele et" mekaniği kurmaya gerek yok.
 *
 * Buradaki TL, E9'u ihlal etmiyor: E9 **kuponun** değerini gizliyor, çünkü
 * kasiyerin telefona bakıp ürün vermesi sistemi kör eder. Havuz bir kuponun
 * değeri değil, kafenin o saate ayırdığı bütçe — kasada hiçbir şeyin yerine
 * geçmiyor.
 */
function HavuzKarti({ pencere, kafeAdi }: { pencere: happy.Pencere; kafeAdi: string }) {
  const yuzde = Math.max(
    2,
    Math.min(100, Math.round((pencere.kalanKurus / pencere.havuzKurus) * 100)),
  );

  return (
    <section className="mb-10 rounded-2xl border border-odul bg-yuzey px-5 py-5">
      <div className="flex items-baseline justify-between gap-3">
        <span className="etiket-caps text-odul-koyu">Havuz açık</span>
        <span className="font-data text-[10px] text-yazi-sonuk tabular">
          {saatBicim(pencere.bitis)}&apos;a kadar
        </span>
      </div>

      <div className="mt-2 flex items-baseline gap-2">
        <span className="font-data text-3xl leading-none font-bold text-odul-koyu tabular">
          {(pencere.kalanKurus / 100).toLocaleString("tr-TR", { maximumFractionDigits: 0 })} TL
        </span>
        <span className="text-[14px] text-yazi-sonuk">ödül kaldı</span>
      </div>

      <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-cukur">
        <div className="asil-serit h-full rounded-full bg-odul" style={{ width: `${yuzde}%` }} />
      </div>

      <p className="mt-2.5 text-[13px] leading-relaxed text-yazi-sonuk">
        {kafeAdi} bu saate ödül ayırdı. Havuz bitmeden oynarsan bugün{" "}
        <strong className="text-yazi">ikinci bir ödül</strong> daha kazanabilirsin.
      </p>
    </section>
  );
}

/**
 * Günün görevi (Ü106).
 *
 * ── Neden ilerleme çubuğu var ───────────────────────────────
 *
 * "2 tur oyna" ile "1/2 tur oynadın" arasındaki fark, hedefin
 * ulaşılabilir olduğunu görmek. Yalnızca hedefi yazan bir kart, yarısını
 * yapmış oyuncuya hiçbir şey söylemez ve o kişi çoğu zaman bir tur
 * eksikle bırakır.
 *
 * ── Tamamlanınca kaybolmuyor ────────────────────────────────
 *
 * Kart yeşile dönüyor ama duruyor: kaybolan bir kart "özellik
 * kaldırıldı" diye okunuyor (çark kartıyla aynı gerekçe) ve yarın yeni
 * bir görev geleceğini söyleyecek yer kalmıyor.
 */
function GorevKarti({ ilerleme: i }: { ilerleme: challenge.Ilerleme }) {
  const tamam = i.tamam;
  const yuzde = Math.min(100, Math.round((i.mevcut / i.gorev.hedef) * 100));
  const renk: OyuncuRengi = tamam ? "yesil" : "buz";

  return (
    <section className="mb-10">
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="etiket-caps" style={{ color: RENK[renk].ana }}>
          Günün görevi
        </h2>
        <span className="font-data text-[10px] tracking-[0.14em] text-odul-koyu">
          +{i.gorev.xp} XP
        </span>
      </div>

      <div
        className="rounded-2xl border bg-yuzey px-5 py-5"
        style={{ borderColor: RENK[renk].ana }}
      >
        <div className="flex items-baseline justify-between gap-3">
          <span className="font-display text-lg leading-tight font-bold">
            {i.gorev.baslik}
          </span>
          <span
            className="shrink-0 font-data text-[13px] leading-none font-bold tabular"
            style={{ color: RENK[renk].ana }}
          >
            {i.mevcut.toLocaleString("tr-TR")}/{i.gorev.hedef.toLocaleString("tr-TR")}
          </span>
        </div>

        <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-cukur">
          <div
            className="asil-serit h-full rounded-full"
            style={{ width: `${Math.max(2, yuzde)}%`, background: RENK[renk].ana }}
          />
        </div>

        <p className="mt-2.5 text-[13px] leading-relaxed text-yazi-sonuk">
          {tamam
            ? "Tamamladın. Yarın yeni bir görev geliyor."
            : i.gorev.aciklama}
        </p>
      </div>
    </section>
  );
}

/**
 * Günlük seri kartı (Ü54).
 *
 * ── Neden yalnızca seri varken görünüyor ────────────────────
 *
 * "0 günlük serin var" diye bir şey yok: ilk gün gelen için seri henüz
 * bir şey ifade etmiyor ve boş bir sayaç ekranı doldurmaktan başka iş
 * yapmıyor. Kart, kaybedilecek bir şey olduğunda çıkıyor.
 *
 * ── Riskteyken dili değişiyor ───────────────────────────────
 *
 * Bugün oynanmadıysa seri **kırılmış sayılmıyor** — gün henüz bitmedi.
 * Kart o zaman hatırlatıyor; kırıldığını söylemek, akşam gelecek
 * müşteriyi sabahtan kaybetmek olurdu.
 */
function SeriKarti({ seri: s }: { seri: seri.Seri }) {
  const bonus = seri.bonusPuani(s.gun + (s.bugunOynadi ? 1 : 0));

  // Kart artık sahneyi de taşıyor (Ü66): dokununca tam ekran seri
  // animasyonu açılıyor. Kart ile sahne aynı bileşende çünkü sahne
  // istemci tarafı ve karta dokunmakla açılıyor.
  return (
    <section className="mb-10">
      <h2 className="etiket-caps mb-3" style={{ color: RENK.amber.ana }}>
        Günlük seri
      </h2>
      <SeriSahnesi gun={s.gun} riskte={s.riskte} bonus={bonus} />
    </section>
  );
}

/**
 * Günlük çark kartı (Ü49).
 *
 * Kart çarkın kendisini göstermiyor, yalnızca durumunu: çarkın SVG'si ve
 * animasyonu bu ekranı ikiye katlardı. Kapalıyken de duruyor — kaybolan
 * bir kart "özellik kaldırıldı" diye okunuyor.
 *
 * ── Açıkken dolu, kapalıyken sakin (Ü64, Ü65) ───────────────
 *
 * Ana ekranda durum kartından sonra her şey beyazdı ve çark da o
 * beyazların arasında bir satır olarak kalıyordu — oysa uygulamanın en
 * heyecanlı anı orada. Çark **hazırken** doygun renkli karta dönüşüyor;
 * günün çevirmesi bitince sakin beyaza düşüyor.
 *
 * Ü64'te bu kart da koyu mordu — durum kartıyla aynı yüzey. Ürün
 * sahibi *"her yere bu mor efekti koyma"* dediğinde en çok haklı
 * olduğu yer burasıydı: iki koyu kart arasında hangisinin tıklanacağı
 * belirsizdi. Şimdi çark, çarkın kasasının rengini (gül) taşıyor.
 */
function CarkKarti({
  durum,
  aralikSaat,
}: {
  durum: cark.CarkDurumu;
  /** Kafenin çevirme aralığı (Ü158) — sabit değil. */
  aralikSaat: number;
}) {
  const acik = durum.acik;

  if (!acik) {
    return (
      <section className="mb-10">
        <h2 className="etiket-caps mb-3 text-yazi-sonuk">Şans çarkı</h2>
        <Link
          href="/cark"
          className="block rounded-2xl border border-cizgi bg-yuzey px-5 py-5 transition-colors hover:border-yazi-sonuk/40"
        >
          <div className="flex items-center gap-4">
            <span className="shrink-0 opacity-50">
              <CarkIkonu boy={40} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-display text-lg leading-tight font-bold">
                Çark kapalı
              </span>
              <span className="mt-1 block text-[13px] leading-relaxed text-yazi-sonuk">
                {cark.durumMetni(durum)}
              </span>
            </span>
            <span aria-hidden className="text-yazi-sonuk">
              →
            </span>
          </div>
        </Link>
      </section>
    );
  }

  return (
    <section className="mb-10">
      <h2 className="etiket-caps mb-3" style={{ color: RENK.pembe.ana }}>
        Şans çarkı
      </h2>

      {/*
        🔴 `?cark=1` — Ü161.

        Ürün sahibi: *"Çevir'e basınca bir ekran daha açılmamalı, direkt
        çevirme ekranı açılmalı."* Haklıydı: düğmenin adı "Çevir" ama
        vardığı yer bir **davet kartıydı** (*"Dokun, çark tam ekranda
        açılsın"*) ve oyuncu aynı şeye ikinci kez basmak zorundaydı.
        Düğmenin sözü ile yaptığı iş ayrışıyordu.

        ⚠️ Yeni bir yol açılmadı: Ü96 karekodu yeni okutan oyuncu için
        `?cark=1` ile sahneyi kendiliğinden açan mekanizmayı zaten
        kurmuştu. İkinci bir "doğrudan aç" kapısı yazmak, aynı şeyin iki
        kopyası olurdu.

        ⚠️ Adres çubuğundan `/cark`e giden hâlâ daveti görüyor ve bu
        doğru: oraya niyetle gelen, çevirmeden önce dilimlere bakabilir.
      */}
      <Link href="/cark?cark=1" className="block transition-transform active:scale-[0.99]">
        <RenkliKart renk="pembe" dolu>
          <div className="flex items-center gap-4">
            {/*
              🔴 Çark DÖNÜYOR — Ü159.

              Ürün sahibi: *"burdaki çark animasyonu dönsün."* Duran bir
              çark görseli, kartın "hazır" dediği şeyle çelişiyordu:
              ekran "çevirebilirsin" diyor, resim durmuş bir tekerlek
              gösteriyordu.

              ⚠️ Yavaş ve **sürekli**: çark bir olay değil bir davet.
              Hızlı dönseydi "çevriliyor" sanılır, tıklamadan önce iş
              bitmiş gibi görünürdü.
            */}
            <span className="cark-donuyor shrink-0">
              <CarkIkonu boy={54} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-display text-xl leading-tight font-extrabold">
                Çarkın hazır
              </span>
              {/* ⚠️ "Günde bir" DEĞİL: süre Ü158'den beri kafenin ayarı
                  ve kayan saat üzerinden işliyor. Sabit cümle bırakılsaydı
                  kafe 6 saat yazdığında ekran yalan söylerdi. */}
              <span className="mt-1 block text-[13px] leading-relaxed text-white/80">
                {aralikSaat === 24
                  ? "Günde bir kez çevirebilirsin."
                  : `${aralikSaat} saatte bir çevirebilirsin.`}{" "}
                Çıkan ödül hesabına işlenir.
              </span>
            </span>
          </div>

          {/* Düğme `--color-odul` değil, çarkın kazanan diliminin altını
              (#ffcf3f). Jeton altını gül zeminin üstünde donuk kalıyor;
              çarkın altını parlıyor. */}
          <div
            className="mt-4 rounded-xl py-3 text-center font-display text-[15px] font-bold"
            style={{ background: "#ffcf3f", color: "#3d1220" }}
          >
            Çevir
          </div>
        </RenkliKart>
      </Link>
    </section>
  );
}

/**
 * Bugünün liderlik tablosu.
 *
 * ── Neden masa tahtının yerine geçti ────────────────────────
 *
 * Kart önce "Masa 3 tahtı" diyordu ve tek kişi gösteriyordu. İki şey
 * yanlıştı: oyuncu hangi masada oturduğunu zaten biliyor (masa bilgisi ona
 * bir şey söylemiyor) ve tek satırlık bir sıralamada yarışacak bir şey yok
 * — ikinci sıradaki kendini göremiyordu.
 *
 * ── Ad neden maskeli ────────────────────────────────────────
 *
 * Ad + soyadın baş harfi: `Mert Y***`. Kafedeki bir başkasının ekranında
 * tam ad görünmesi, oyuncunun kabul ettiği bir şey değil; sıralamanın işe
 * yaraması için de gerekmiyor.
 *
 * Kart tıklanınca tüm zamanlar listesine gidiyor — bugünün ilk üçüne
 * giremeyen için "hiç yokum" demek yerine gidilecek bir yer kalıyor.
 */
function LiderKarti({
  liste,
  oyunAdi,
  haftalik,
  kalanGun,
}: {
  liste: liderlik.Liste;
  oyunAdi: string;
  /** Ü105: haftalık sezondaki kendi satırın — hiç puanın yoksa null. */
  haftalik: liderlik.LiderSatiri | null;
  kalanGun: number;
}) {
  const bos = liste.satirlar.length === 0;

  return (
    <section className="mb-10">
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="etiket-caps text-yazi-sonuk">Bugünün liderleri</h2>
        <span className="font-data text-[10px] text-yazi-sonuk">{oyunAdi}</span>
      </div>

      <Link
        href="/liderlik"
        className="block rounded-2xl border border-cizgi bg-yuzey px-5 py-5 transition-colors hover:border-yazi-sonuk"
      >
        {bos ? (
          <>
            <div className="flex items-center gap-3">
              <KupaIkonu boy={28} />
              <span className="font-display text-lg leading-tight font-bold">Liste boş</span>
            </div>
            <p className="mt-1.5 text-[13px] leading-relaxed text-yazi-sonuk">
              Bugün bu kafede henüz kimse oynamadı. İlk skoru sen yaz.
            </p>
          </>
        ) : (
          <ol className="space-y-2.5">
            {liste.satirlar.slice(0, 3).map((s) => (
              <KucukSatir key={s.sira} satir={s} />
            ))}
          </ol>
        )}

        {liste.benimSiram && (
          <ol className="mt-3 border-t border-cizgi pt-3">
            <KucukSatir satir={liste.benimSiram} />
          </ol>
        )}

        {/* Ü105: haftalık sezon. Tüm zamanlar listesi kazanılamaz — üç
            aydır gelenin birikimi bu hafta gelen için erişilemez. Sezon
            her pazartesi sıfırlandığı için burada gösterilebilecek
            gerçek bir hedef var. */}
        <div className="mt-4 flex items-baseline justify-between gap-3 border-t border-cizgi pt-3">
          <span className="text-[13px] text-yazi-sonuk">
            {haftalik ? (
              <>
                Bu sezon{" "}
                <strong className="text-odul-koyu">{haftalik.sira}. sıradasın</strong> ·{" "}
                {haftalik.deger.toLocaleString("tr-TR")} puan
              </>
            ) : (
              <>Bu sezon henüz puanın yok</>
            )}
          </span>
          <span className="shrink-0 font-data text-[10px] text-yazi-sonuk tabular">
            {kalanGun === 1 ? "SON GÜN" : `${kalanGun} GÜN`}
          </span>
        </div>

        <p className="mt-3 font-data text-[10px] tracking-wide text-yazi-sonuk">
          SEZON VE TÜM ZAMANLAR →
        </p>
      </Link>
    </section>
  );
}

/** Ana ekrandaki liderlik satırı — `/liderlik` ile aynı sıra jetonu. */
function KucukSatir({ satir }: { satir: liderlik.LiderSatiri }) {
  return (
    <li className={`flex items-center gap-3 ${satir.benMiyim ? "text-odul-koyu" : ""}`}>
      <SiraJetonu sira={satir.sira} kucuk />
      <span className="min-w-0 flex-1 truncate font-display text-[15px] font-bold">
        {satir.benMiyim ? "Sen" : satir.gorunenAd}
      </span>
      <span
        className={`font-data text-[15px] leading-none font-bold tabular ${
          satir.benMiyim ? "text-odul-koyu" : "text-vurgu"
        }`}
      >
        {satir.deger.toLocaleString("tr-TR")}
      </span>
    </li>
  );
}

function saatBicim(d: Date): string {
  return d.toLocaleTimeString("tr-TR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Istanbul",
  });
}

/**
 * Ana ekrandan çıkan kapı — Ü66.
 *
 * Katalog ve fırsatlar aynı işi yapıyor: oyuncuyu ana ekranın
 * dışındaki bir listeye götürüyor. Farklı görünmeleri için bir sebep
 * yok; arkalarındaki çizim hangisine gittiğini söylüyor.
 */
function GecisKarti({
  yol,
  ust,
  baslik,
  alt,
  renk,
  gorsel,
  sahne,
}: {
  yol: string;
  ust: string;
  baslik: string;
  alt: string;
  renk: OyuncuRengi;
  gorsel?: GorselAdi;
  /**
   * Üretilmiş sahne — Ü180.
   *
   * ⚠️ `gorsel` ile birlikte kullanılmıyor: `gorsel` kartın arkasında
   * %24 opaklıkta **fısıldayan** bir çizim, sahne ise tam renkte
   * duruyor. İkisi aynı köşede olsaydı biri diğerinin altında gürültü
   * bırakırdı.
   */
  sahne?: string;
}) {
  const r = RENK[renk];

  /*
    Ü171: bu kart da biletin yüzeyinde.

    ⚠️ `KoyuKart` bir `<div>`; bağlantı onu SARIYOR, içine girmiyor.
    Tersi denendi ve olmuyor: kartın kendi `overflow-hidden`ı ve
    yuvarlak köşeleri bağlantının dışında kalırsa tıklama alanı
    köşelerden taşıyor.
  */
  return (
    <Link
      href={yol}
      className="block transition-transform hover:-translate-y-0.5 active:scale-[0.99]"
    >
      <BiletYuzeyi renk={renk} gorsel={gorsel} className="px-5 py-4">
        {/*
          Sahne sağ kenardan taşıyor ve kırpılıyor — biletin kendi
          diliyle aynı (Ü72): kutuya sığdırılmış çizim "buraya bir ikon
          koyduk" diye okunuyor, taşan çizim kartı bir nesneye çeviriyor.

          ⚠️ Metnin sağ ucuna değmemesi için sağa YASLI ve dar: kart
          iki satır yazı taşıyor ve sahne onların üstüne binerse başlık
          okunmaz oluyor.
        */}
        {sahne && (
          <span aria-hidden className="pointer-events-none absolute -top-2 -right-5">
            <OyunSahnesi oyun={sahne} boy={104} />
          </span>
        )}

        <div className="relative etiket-caps text-white/55">{ust}</div>
        <div className="relative mt-1 flex items-baseline justify-between gap-3">
          <span className="font-display text-lg leading-tight font-bold text-white">{baslik}</span>
          {/* Ok biletteki "Kasada göster →"in karşılığı: bu kart da bir
              yere gitmeyi vaat ediyor. Rengi `canli` — koyu zeminde
              beyazdan ayrılıyor ama başlığı bastırmıyor. */}
          <span aria-hidden className="text-[15px]" style={{ color: r.canli }}>
            →
          </span>
        </div>
        {/* ⚠️ Sahne varken metin dar: tam genişlikte alt satır sahnenin
            altına giriyor ve iki katman üst üste okunmaz oluyor. */}
        <p
          className={`relative mt-1 text-[13px] leading-relaxed text-white/65 ${
            sahne ? "max-w-[62%]" : ""
          }`}
        >
          {alt}
        </p>
      </BiletYuzeyi>
    </Link>
  );
}

