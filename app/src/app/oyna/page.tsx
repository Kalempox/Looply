import Link from "next/link";
import { redirect } from "next/navigation";
import * as oturum from "@/domain/session";
import * as masaOturumu from "@/domain/masa";
import { idIleBul, gorunum } from "@/domain/player";
import { ozet } from "@/domain/puan";
import { kafeSeviyesi, type KafeSeviyesi } from "@/domain/xp";
import { OYUNLAR, gununOyunu } from "@/oyunlar";
import * as liderlik from "@/domain/liderlik";
import * as cark from "@/domain/cark";
import * as seri from "@/domain/seri";
import * as challenge from "@/domain/challenge";
import { withBypass } from "@/db/context";
import * as happy from "@/domain/happy";
import { isGunu } from "@/lib/tarih";
import {
  KoyuKart,
  CamKutu,
  SiraJetonu,
  RenkliKart,
  GorselKart,
  KartDokusu,
  kartStili,
} from "@/components/oyuncu";
import { RENK, oyunRengi, type OyuncuRengi } from "@/components/oyuncu-renk";
import { oyunGorseli, type GorselAdi } from "@/components/oyuncu-gorsel";
import { OyunIkonu, CarkIkonu, KupaIkonu } from "@/components/oyuncu-ikon";
import { OyuncuNav, NavBosluk } from "@/components/oyuncu-nav";
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
  const bonus = gununOyunu(isGunu());

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

        {carkDurumu && <CarkKarti durum={carkDurumu} />}

        {lider && (
          <LiderKarti
            liste={lider}
            oyunAdi={bonus.ad}
            haftalik={haftalik}
            kalanGun={sezon.kalanGun}
          />
        )}

        {/* ── Günün oyunu ───────────────────────────────── */}
        <section className="mb-10">
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="etiket-caps" style={{ color: RENK[oyunRengi(bonus.id)].ana }}>
              Bugünün oyunu
            </h2>
            <span className="font-data text-[10px] tracking-[0.14em] text-odul-koyu">×2 PUAN</span>
          </div>

          {/* Ekranın birincil eylemi ve kartın rengi oyunun kendi rengi
              (Ü65): aşağıdaki karolarla aynı renk ailesi, böylece
              "bugünün oyunu" ile "tüm oyunlar" aynı ürünün parçası
              olarak okunuyor. */}
          <GorselKart
            renk={oyunRengi(bonus.id)}
            gorsel={oyunGorseli(bonus.id)}
            className="px-6 py-7"
          >
            <div className="flex items-start gap-4">
              <span className="flex size-16 shrink-0 items-center justify-center rounded-2xl bg-yuzey shadow-sm">
                <OyunIkonu oyunId={bonus.id} boy={38} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-display text-2xl leading-tight font-extrabold tracking-tight">
                  {bonus.ad}
                </span>
                <span
                  className="mt-1.5 block text-[14px] leading-relaxed"
                  style={{ color: RENK[oyunRengi(bonus.id)].koyu }}
                >
                  {bonus.ozet}
                </span>
              </span>
            </div>

            <Link
              href={`/oyna/${bonus.id}?basla=1`}
              className="mt-5 block w-full rounded-xl py-3.5 text-center font-display text-[16px] font-bold text-white transition-transform active:scale-[0.99]"
              style={{ background: RENK[oyunRengi(bonus.id)].ana }}
            >
              Oyna
            </Link>
          </GorselKart>
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
            alt={`${OYUNLAR.length} oyun · kategorilere ayrılmış`}
            renk="gok"
            gorsel="kumanda"
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
  // Zemin ve ışın dokusu `KoyuKart`'a taşındı (Ü64): aynı yüzey artık
  // /oduller, /profil, /liderlik ve oyun kabuğunda da kullanılıyor.
  // Burada kopyası durduğu sürece beşi ayrı ayrı kayabilirdi.
  return (
    <KoyuKart>
      <p className="etiket-caps text-white/60">Merhaba</p>
      <h1 className="mt-1 font-display text-3xl leading-none font-extrabold tracking-tight">
        {ad}
      </h1>

      <div className="mt-5 grid grid-cols-2 gap-2.5">
        <CamKutu
          etiket={masada ? "Bu kafedeki puanın" : "Puan"}
          deger={puan.toLocaleString("tr-TR")}
          alt={masada ? undefined : "kafede kazanılır"}
        />
        <CamKutu
          etiket="Kullanılabilir kupon"
          deger={kupon.toLocaleString("tr-TR")}
          altin={kupon > 0}
        />
      </div>

      {seviye && (
        <Link
          href="/profil"
          className="mt-3 block rounded-2xl bg-white/10 px-4 py-3.5 transition-colors hover:bg-white/15"
        >
          <div className="flex items-baseline justify-between gap-3">
            <span className="etiket-caps text-white/60">Bu kafedeki seviyen</span>
            <span className="font-data text-lg leading-none font-bold text-odul tabular">
              {seviye.seviye}
            </span>
          </div>

          <div className="mt-2.5 h-1.5 w-full rounded-full bg-white/15">
            <div
              className="asil-serit h-full rounded-full bg-odul"
              style={{ width: `${seviye.ilerlemeYuzde}%` }}
              role="progressbar"
              aria-valuenow={seviye.ilerlemeYuzde}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Seviye ilerlemesi"
            />
          </div>

          <div className="mt-2 font-data text-[10px] text-white/55">
            {seviye.sonrakiEsik === null
              ? "En üst seviyedesin"
              : `Sonraki seviyeye ${(seviye.sonrakiEsik - seviye.xp).toLocaleString("tr-TR")} XP`}
          </div>
        </Link>
      )}
    </KoyuKart>
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
function CarkKarti({ durum }: { durum: cark.CarkDurumu }) {
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

      <Link href="/cark" className="block transition-transform active:scale-[0.99]">
        <RenkliKart renk="pembe" dolu>
          <div className="flex items-center gap-4">
            <span className="shrink-0">
              <CarkIkonu boy={54} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-display text-xl leading-tight font-extrabold">
                Çarkın hazır
              </span>
              <span className="mt-1 block text-[13px] leading-relaxed text-white/80">
                Günde bir kez çevirebilirsin. Çıkan ödül hesabına işlenir.
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
}: {
  yol: string;
  ust: string;
  baslik: string;
  alt: string;
  renk: OyuncuRengi;
  gorsel: GorselAdi;
}) {
  const r = RENK[renk];

  return (
    <Link
      href={yol}
      className="kart-golge kart-gel relative block overflow-hidden rounded-3xl px-5 py-4 transition-transform hover:-translate-y-0.5"
      style={kartStili(renk)}
    >
      <KartDokusu renk={renk} gorsel={gorsel} />

      <div className="relative">
        <div className="etiket-caps" style={{ color: r.koyu }}>
          {ust}
        </div>
        <div className="mt-1 flex items-baseline justify-between gap-3">
          <span className="font-display text-lg leading-tight font-bold text-yazi">{baslik}</span>
          <span aria-hidden className="text-[15px]" style={{ color: r.ana }}>
            →
          </span>
        </div>
        <p className="mt-1 text-[13px] leading-relaxed" style={{ color: r.koyu }}>
          {alt}
        </p>
      </div>
    </Link>
  );
}
