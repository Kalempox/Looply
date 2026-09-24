import Image from "next/image";
import {
  GOVDE_DEGISKENI,
  SERIT_DEGISKENI,
  govdeRengi,
  seritRengi,
} from "./avatar-renkleri";

/**
 * Loopy — Looply'nin maskotu (Ü147).
 *
 * ── 🔴 Çizim değil, ürün sahibinin 3B render'ı ──────────────
 *
 * Maskot üç kez denendi ve ilk ikisi **elle çizilmiş vektördü**:
 *
 *   1. düz vektör → *"avatar 3D gibi olmalı, bu olmamış hiç"*
 *   2. clay taklidi vektör → hacim doğruydu, biçim değildi
 *   3. küp biçiminde clay vektör → *"berbat oldu bu görsel"*
 *
 * Üçüncüden sonra ürün sahibi kendi 3B render'ını verdi: *"bende var,
 * istersen bunu kullanarak yapabilirsin."* Doğru karar — elle çizilen
 * vektör gerçek bir render'ın yumuşaklığını yakalayamıyor ve üç tur
 * boyunca yakalayamadı da.
 *
 * ── Görsel üründe nasıl hazırlandı ──────────────────────────
 *
 * Gelen kare 1024×1024 ve arka planı gömülüydü (mavi gök, krem zemin,
 * yere düşen gölge). Arka plan renk maskesiyle kesildi: karakter mor ve
 * doygun, arka plan düşük doygunluklu. Göz, diş ve yanaklar maskenin
 * **içindeki boşluklar** olarak geri eklendi.
 *
 * ⚠️ **Yere düşen gölge bilerek atıldı.** Gölge karenin içinde kalsaydı
 * zıplarken karakterle birlikte havaya çıkardı ve hareket yalan
 * görünürdü. Gölge artık ayrı bir öge ve zıplayınca küçülüp soluyor.
 *
 * ── 🔴 Renk oyuncunun, aksesuar hâlâ yok ────────────────────
 *
 * Ü186'ya kadar burada tek bir görsel vardı ve renk değiştirilemiyordu.
 * Artık her kare **üç katman**: gövde ve şerit oyuncunun seçtiği renkte,
 * kapak/kol/bacak/yüz sabit. Renk dosya olarak üretilmiyor, tarayıcıda
 * hesaplanıyor — bkz. `Katman` ve `avatar-renkleri.ts`.
 *
 * Aksesuar (bere, gözlük, fular) kapalı ve sebebi değişmedi: 3B bir
 * gövdenin üstüne düz vektör bir bere koymak ikisini de bozar. Renkten
 * farkı ölçülebilir — renk tek bir matematikle 990 kombinasyon veriyor,
 * aksesuar her kare için ayrı bir render istiyor (kareler farklı
 * açılarda). `players.avatar_aksesuar` kolonu ve `AVATAR_AKSESUARLARI`
 * listesi o gün için yerinde bekliyor.
 *
 * ── İfade yok, hareket var ──────────────────────────────────
 *
 * Tek karede yüz değişmiyor. Duygu **gövde hareketinden** ve yardımcı
 * ögelerden geliyor: ezilme–uzama, zıplama, eğilme, kıvılcım, kalp.
 * `ifade` alanı çağıran ekranlarda aynı kaldı ve burada harekete
 * çevriliyor — böylece kutlama ve okşama ekranlarının hiçbiri
 * değişmedi.
 */

/**
 * Aksesuar seçicisi açık mı?
 *
 * Ü147'de `COK_RENKLI` adıyla renkle birlikte kapalıydı; Ü186'da renk
 * açıldı, aksesuar kaldı. Ürün sahibi her kare için bere/gözlük/fular
 * render'larını üretince `true` yapmak yetiyor — kayıt, doğrulama ve
 * kolon zaten yerinde.
 */
export const AKSESUARLI = false;

export type AvatarIfadesi =
  | "sakin"
  | "neseli"
  | "mutlu"
  | "sasirdi"
  | "keyifli"
  | "kuponlu";
export type AvatarAksesuari = "yok" | "bere" | "gozluk" | "fular";

/**
 * Loopy'nin **dinlenme** hâli — Ü219.
 *
 * ── 🔴 `sakin` değil, `neseli` ──────────────────────────────
 *
 * Ürün sahibi: *"Loopy'mizin daha mutlu olması lazım, şu an hepsinde
 * dümdüz duruyor."* Kusurun adı zaten `loopy-sozu.tsx`te yazılıydı:
 * `sakin` karesinin **ağzı düz bir çizgi**. `neseli` aynı karenin
 * gülümseyen hâli (Ü179'da ondan türetildi) — duruş, kol, bacak,
 * boyut, hepsi aynı; değişen tek şey ağız.
 *
 * ── Neden sabit, neden tek yerde ────────────────────────────
 *
 * Dinlenme hâli dört yerde geçiyor: yuvadaki küçük düğme, tam ekran
 * karakterin başlangıcı, okşama bittiğinde dönülen hâl ve renk
 * seçicinin önizlemesi. Dördüne ayrı ayrı yazılsaydı biri her turda
 * geride kalırdı — bu projede o hatanın adı var (Ü71).
 *
 * ⚠️ `sakin` SİLİNMEDİ: nötr bir yüz gereken bir yer çıkarsa duruyor.
 * Bugün hiçbir ekran onu istemiyor.
 */
export const DURUS: AvatarIfadesi = "neseli";

/** `AKSESUARLI` açılınca sunulacak liste. */
export const AVATAR_AKSESUARLARI: { deger: AvatarAksesuari; ad: string }[] = [
  { deger: "yok", ad: "Sade" },
  { deger: "bere", ad: "Bere" },
  { deger: "gozluk", ad: "Gözlük" },
  { deger: "fular", ad: "Fular" },
];

export const VARSAYILAN_AKSESUAR: AvatarAksesuari = "yok";

/**
 * İfade → hareket.
 *
 * Duygu iki yerden birden geliyor: **kare** (yüz) ve **hareket**
 * (gövde). Ü173'e kadar yalnızca hareket vardı, çünkü elde tek bir
 * render vardı.
 *
 *   sakin    → yavaş nefes
 *   keyifli  → ezilip yaylanma + kalpler   (okşanınca)
 *   mutlu    → zıplama + kıvılcım          (kutlamalarda)
 *   sasirdi  → hızlı titreme
 */
const HAREKET: Record<AvatarIfadesi, string> = {
  sakin: "durgun",
  neseli: "durgun",
  keyifli: "seviliyor",
  mutlu: "seviniyor",
  sasirdi: "sasirdi",
  /* ⚠️ `kuponlu` zaten havada bir poz; üstüne zıplama hareketi
     eklemek iki zıplamayı üst üste bindirirdi. Nefes yeter. */
  kuponlu: "durgun",
};

/**
 * İfade → kare — Ü173.
 *
 * ⚠️ `sasirdi`nin kendi karesi YOK ve `sakin`e düşüyor. Uydurma bir
 * kare koymak yerine bilerek böyle: şaşkın hâlin rengi hareketten
 * geliyor (hızlı titreme) ve yanlış bir yüz, doğru hareketi de
 * yalanlardı. Kare üretilince buraya bir satır eklemek yetiyor.
 *
 * ⚠️ Karelerdeki uçuşan süslemeler (kıvılcım, kalp) kasten silindi:
 * ikisini de CSS çiziyor (`loopy-kivilcimlar`, `loopy-kalpler`) ve
 * görselde de olsalardı ekranda iki kat görünürlerdi. Karakterin
 * TUTTUĞU kalp duruyor — o gövdenin parçası.
 */
const KARE: Record<AvatarIfadesi, string> = {
  sakin: "sakin",
  /*
    `neseli` — Ü179. `sakin`in aynısı ama ağzı gülüyor.

    🔴 Bu kare 3B kaynaktan gelmedi, `scripts/avatar-neseli.py` ile
    `sakin`den TÜRETİLDİ ve gerekçesi orada yazılı: elde "gülen yüz +
    boş eller" olan bir kare yoktu, Ödüllerim başlığındaki elinde kupon
    tutan Loopy de tam onu istiyordu.

    ⚠️ Geçici. Aynı 3B kaynaktan gülen bir kare gelince script silinir.
  */
  neseli: "neseli",
  keyifli: "keyifli",
  mutlu: "mutlu",
  sasirdi: "sakin",
  /*
    `kuponlu` — Ü181. Havada zıplayan, göz kırpan, elinde yıldızlı
    altın ödül tutan Loopy.

    🔴 Bu kare de 3B kaynaktan gelmedi ama `neseli`den farklı yoldan
    üretildi: fal/kontext **mevcut kareyi referans alıp** yalnızca pozu
    ve elindeki nesneyi değiştirdi (`scripts/avatar-kuponlu.py`).
    Karakterin tasarımı, malzemesi ve ışığı korunuyor.

    Ü179'da elinde kupon tutan Loopy, `neseli`nin üstüne çizilmiş
    vektör bir kartla yapılmıştı; ürün sahibi *"orada hiç olmadı"*
    dedi ve haklıydı — 3B gövdeye yapıştırılmış düz kart iki ayrı
    malzeme olarak okunuyordu.
  */
  kuponlu: "kuponlu",
};

/** Kıvılcımların yönü ve uzaklığı — sabit dizi (hidrasyon uyuşmazlığı olmasın). */
const KIVILCIM = [
  { u: -62, v: -34, g: 7, gecikme: 0 },
  { u: 58, v: -42, g: 6, gecikme: 70 },
  { u: -78, v: 12, g: 5, gecikme: 130 },
  { u: 72, v: 16, g: 6, gecikme: 40 },
  { u: -30, v: -64, g: 5, gecikme: 160 },
  { u: 34, v: -68, g: 6, gecikme: 100 },
] as const;

/** Kalplerin çıkış noktası ve gecikmesi. */
const KALPLER = [
  { x: 24, gecikme: 0 },
  { x: 52, gecikme: 420 },
  { x: 74, gecikme: 820 },
] as const;

/**
 * Buhar tutamları — Ü182, Ü219'da ölçülüp düzeltildi.
 *
 * Üçü de farklı gecikmede ve farklı yana savruluyor. Aynı anda aynı yolu
 * izleselerdi üç çizgi olurlardı; duman düzensiz olduğu için duman.
 *
 * ── 🔴 `sol` 42/50/58 → 39/47/55 ────────────────────────────
 *
 * Değerler kapağın karenin **ortasında** olduğunu varsayıyordu. Alfa
 * ölçümü öyle olmadığını söyledi: `loopy-sakin-sabit-512.webp`de
 * kapağın yatay ortası karenin **%47,4**'ünde. Tutamlar 2,6 puan sağa
 * kaçıyordu — 228 pikselde 6 piksel, yani buhar bardağın kenarından
 * tütüyordu.
 *
 * ── 🔴 `savrul` piksel değil ORAN ───────────────────────────
 *
 * −7/5/10 piksel, karakterin boyu ne olursa olsun aynıydı. 228
 * pikselde doğru, 56 pikselde genişliğin sekizde biri kadar yana
 * savrulma demekti. Oranlar 228 pikselde aynı pikselleri veriyor;
 * ölçek değişince buhar da onunla ölçekleniyor.
 */
const BUHARLAR = [
  { savrul: -0.031, gecikme: 0, sol: 39 },
  { savrul: 0.022, gecikme: 850, sol: 47 },
  { savrul: 0.044, gecikme: 1700, sol: 55 },
] as const;

/**
 * Tek katman — Ü186.
 *
 * `renk` verilirse katman **parlaklık** taşıyan gri bir görsel ve
 * üstüne o renk çarpma kipinde biniyor. Matematiği:
 *
 *     rgb(h, s, v) = v · rgb(h, s, 1)
 *
 * Sabit ton ve doygunlukta RGB parlaklıkla doğrusal değişiyor; "her
 * pikseli kendi parlaklığıyla çarp" demek tam olarak `multiply`.
 * Gölgeler bu yüzden korunuyor — renk boyanmış gibi değil, o renkte
 * üretilmiş gibi duruyor.
 *
 * ⚠️ `isolation: isolate` ŞART: çarpma kipi normalde ARKASINDAKİ her
 * şeyle karışır. İzole edilmeseydi Loopy'nin rengi altındaki kartı da
 * koyulaştırırdı.
 *
 * ⚠️ Maske ham dosya yolunu kullanıyor, `next/image` çıktısını değil:
 * maskeye yalnızca alfa gerekiyor ve iyileştiricinin ürettiği adres
 * derleme başına değişiyor.
 */
function Katman({
  kare,
  ad,
  renk,
  ad2,
  oncelik,
  boy,
}: {
  kare: string;
  ad: "sabit" | "govde" | "serit";
  renk?: string;
  /** Ekran okuyucu metni — yalnızca `sabit` katmanında. */
  ad2?: string;
  oncelik: boolean;
  /** Ü275: ekranda çizilen boy (px) — görsel bu boya göre isteniyor. */
  boy: number;
}) {
  const yol = `/avatar/loopy-${kare}-${ad}-512.webp`;

  return (
    <span className="absolute inset-0 block" style={{ isolation: "isolate" }}>
      <Image
        src={yol}
        alt={ad2 ?? ""}
        width={512}
        height={512}
        /* 🔴 Ü275: çizilen boy. Verilmediğinde tarayıcı 3x ekranda
           82 piksellik Loopy için 1080'lik görseli istiyordu (sunucu
           512'yi döndürüyor) — üç katman × 512×512 çözme. */
        sizes={`${Math.ceil(boy)}px`}
        className="absolute inset-0 size-full"
        aria-hidden={ad2 ? undefined : true}
        priority={oncelik}
      />
      {renk && (
        <span
          aria-hidden
          className="absolute inset-0 block"
          style={{
            background: renk,
            mixBlendMode: "multiply",
            maskImage: `url(${yol})`,
            WebkitMaskImage: `url(${yol})`,
            maskSize: "100% 100%",
            WebkitMaskSize: "100% 100%",
          }}
        />
      )}
    </span>
  );
}

/**
 * Oyuncunun rengini sayfanın tamamına duyurur — Ü186.
 *
 * Oyuncuyu bilen sunucu sayfası bunu bir kez basıyor; altındaki bütün
 * avatarlar rengi miras alıyor. Gerekçesi `avatar-renkleri.ts`te.
 *
 * ⚠️ `<style>` içine giren değer oyuncudan GELMİYOR: `govdeRengi` ve
 * `seritRengi` ya paletteki `#rrggbb`yi ya da varsayılanı döndürüyor,
 * bilinmeyen ad sessizce düşüyor. Buraya bir gün ham metin bağlanırsa
 * enjeksiyon kapısı olur — o yüzden iki çeviriden geçmeden yazılmıyor.
 *
 * ⚠️ `:root` seçicisi bilerek: `AvatarYuvasi` tam ekran ve `fixed`,
 * bir sarmalayıcıya bağlansaydı sayfa ağacında nereye düştüğüne göre
 * rengi alıp alamaması değişirdi.
 */
export function LoopyRenkleri({ govde, serit }: { govde: string; serit: string }) {
  return (
    <style>{`:root{--loopy-govde:${govdeRengi(govde)};--loopy-serit:${seritRengi(serit)}}`}</style>
  );
}

export function Avatar({
  ifade = "sakin",
  boy = 120,
  ad,
  buhar = false,
  oncelik,
  govde,
  serit,
}: {
  /** Ü147: aksesuar render'ı olmadığı için yok sayılıyor — bkz. `AKSESUARLI`. */
  aksesuar?: AvatarAksesuari;
  ifade?: AvatarIfadesi;
  boy?: number;
  /**
   * Ekran okuyucuya ne denecek.
   *
   * Verilmezse görsel `aria-hidden`: avatar çoğu yerde **süs**, yanında
   * zaten oyuncunun adı yazıyor ve ikisini birden okumak tekrar olurdu.
   */
  ad?: string;
  /**
   * Kapaktan yükselen buhar — Ü182.
   *
   * ⚠️ Varsayılan KAPALI ve öyle kalmalı: her ekranda tüten bir bardak,
   * bir süre sonra bakılmayan bir hareket olur. Sıcaklığın anlamı olan
   * yerde açılıyor (günlük seri sahnesi).
   *
   * ⚠️ `keyifli` karesinde buhar zaten GÖMÜLÜ. Orada açılırsa iki kat
   * buhar çıkar.
   */
  buhar?: boolean;
  /**
   * Görsel ilk boyada mı yüklensin — Ü219.
   *
   * ── 🔴 Neden boy yetmiyor ───────────────────────────────────
   *
   * Verilmezse `boy >= 120` kuralı işliyor: "büyük Loopy ekranın
   * üstündedir" varsayımı ve oyuncu yüzeylerinde doğru — karşılama
   * kartındaki 150 piksellik Loopy gerçekten ilk görülen şey.
   *
   * Vitrin bu varsayımı **iki yönden birden** kırıyor:
   *
   *   · kahramandaki Loopy 104 piksel ama sayfanın İLK boyası
   *   · maskot bölümündeki 236 piksellik Loopy ekranlarca AŞAĞIDA
   *
   * Birincisi geç yüklenip yerine oturuyor, ikincisi hiç
   * görülmeyebilecek üç dosyayı öne çekiyordu. Boy bir tahmin;
   * çağıran yeri biliyor.
   */
  oncelik?: boolean;
  /**
   * Gövde ve şerit rengini **doğrudan** ver — Ü186.
   *
   * ⚠️ Neredeyse hiçbir çağıranın buna dokunması gerekmiyor: renk
   * normalde `<LoopyRenkleri>`nin bastığı CSS değişkeninden miras
   * alınıyor (bkz. `avatar-renkleri.ts`). Bu iki alan yalnızca aynı
   * ekranda **birden çok renk** gösteren yer için var — özelleştirme
   * seçicisi, her örneği kendi renginde çiziyor.
   */
  govde?: string;
  serit?: string;
}) {
  const hareket = HAREKET[ifade];
  /* Boy yalnızca TAHMİN; çağıran bilmiyorsa ona düşülüyor. */
  const oncelikli = oncelik ?? boy >= 120;

  return (
    <div
      className={`loopy loopy-${hareket}`}
      /*
        ⚠️ `--loopy-boy` CSS'e boyu duyuruyor — Ü219.

        Buharın tutam boyu, bulanıklığı ve yükselme mesafesi sabit
        pikseldi ve karakterin boyuyla ilgisi yoktu: 228 pikselde doğru,
        56 pikselde bardağın yarısı kadar bir bulut. Ölçü tek yerden,
        buradan geliyor.
      */
      style={
        { width: boy, height: boy * 1.06, "--loopy-boy": `${boy}px` } as React.CSSProperties
      }
    >
      {/*
        Gölge ayrı bir öge: zıplarken küçülüp soluyor. Görselin içine
        gömülü olsaydı karakterle birlikte havaya kalkardı ve zıplama
        yalan görünürdü — hareketi bozan en büyük tek şey.
      */}
      <span aria-hidden className="loopy-golge" />

      {/* Buhar gövdenin ARKASINDA (z-1): kapağın önünden geçseydi
          karakterin üstüne sis çekerdi. */}
      {buhar && ifade !== "keyifli" && (
        <span aria-hidden className="loopy-buharlar">
          {BUHARLAR.map((b, i) => (
            <span
              key={i}
              className="loopy-buhar"
              style={
                {
                  left: `${b.sol}%`,
                  "--savrul": `calc(var(--loopy-boy) * ${b.savrul})`,
                  animationDelay: `${b.gecikme}ms`,
                } as React.CSSProperties
              }
            />
          ))}
        </span>
      )}

      {/*
        🔴 Üç katman, tek görsel değil — Ü186.

        Nefes animasyonu (`loopy-govde`) artık SARMALAYICIDA: katmanlara
        tek tek verilseydi her biri kendi başına nefes alır ve
        birbirlerinden kayarlardı.
      */}
      <div className="loopy-govde">
        <Katman
          kare={KARE[ifade]}
          ad="govde"
          renk={govde ? govdeRengi(govde) : GOVDE_DEGISKENI}
          oncelik={oncelikli}
          boy={boy}
        />
        <Katman kare={KARE[ifade]} ad="sabit" ad2={ad} oncelik={oncelikli} boy={boy} />
        <Katman
          kare={KARE[ifade]}
          ad="serit"
          renk={serit ? seritRengi(serit) : SERIT_DEGISKENI}
          oncelik={oncelikli}
          boy={boy}
        />
      </div>

      {/* Sevinç kıvılcımları — yalnızca zıplarken. */}
      {hareket === "seviniyor" && (
        <span aria-hidden className="loopy-kivilcimlar">
          {KIVILCIM.map((k, i) => (
            <span
              key={i}
              className="loopy-kivilcim"
              style={
                {
                  width: k.g,
                  height: k.g,
                  "--u": `${k.u}px`,
                  "--v": `${k.v}px`,
                  animationDelay: `${k.gecikme}ms`,
                } as React.CSSProperties
              }
            />
          ))}
        </span>
      )}

      {/* Okşanınca yukarı süzülen kalpler. */}
      {hareket === "seviliyor" && (
        <span aria-hidden className="loopy-kalpler">
          {KALPLER.map((k, i) => (
            <svg
              key={i}
              className="loopy-kalp"
              width="16"
              height="16"
              viewBox="0 0 16 16"
              style={{ left: `${k.x}%`, animationDelay: `${k.gecikme}ms` }}
            >
              <path
                d="M8 14S1.5 9.6 1.5 5.4A3.4 3.4 0 018 3.6a3.4 3.4 0 016.5 1.8C14.5 9.6 8 14 8 14z"
                fill="#f472b6"
              />
            </svg>
          ))}
        </span>
      )}
    </div>
  );
}
