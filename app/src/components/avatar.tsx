import Image from "next/image";
import type { OyuncuRengi } from "./oyuncu-renk";

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
 * ── 🔴 Tek kare: renk ve aksesuar şimdilik KAPALI ───────────
 *
 * Elde tek render var, yani renk değiştirilemiyor ve aksesuar
 * takılamıyor: 3B bir gövdenin üstüne düz vektör bir bere koymak ikisini
 * de bozardı. `players.avatar_renk` ve `avatar_aksesuar` kolonları
 * **yerinde duruyor** (göç 0042) ve doğrulama da çalışıyor — ürün
 * sahibi diğer renkleri üretince `COK_RENKLI` açılıyor ve seçiciler
 * geri geliyor. Göç geri alınmadı çünkü veri kaybı yaratmadan bekleyen
 * bir kolon, sonradan yeniden eklenecek bir kolondan ucuz.
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
 * Renk ve aksesuar seçicileri açık mı?
 *
 * Tek render varken `false`. Ürün sahibi altı rengi üretip
 * `public/avatar/loopy-<renk>.webp` olarak koyunca `true` yapmak
 * yetiyor — seçiciler, kayıt ve doğrulama zaten yazılı.
 */
export const COK_RENKLI = false;

export type AvatarIfadesi =
  | "sakin"
  | "neseli"
  | "mutlu"
  | "sasirdi"
  | "keyifli"
  | "kuponlu";
export type AvatarAksesuari = "yok" | "bere" | "gozluk" | "fular";

/** Özelleştirmede sunulan renkler — `COK_RENKLI` açılınca kullanılıyor. */
export const AVATAR_RENKLERI: OyuncuRengi[] = [
  "gok",
  "menekse",
  "pembe",
  "amber",
  "yesil",
  "buz",
];

export const AVATAR_AKSESUARLARI: { deger: AvatarAksesuari; ad: string }[] = [
  { deger: "yok", ad: "Sade" },
  { deger: "bere", ad: "Bere" },
  { deger: "gozluk", ad: "Gözlük" },
  { deger: "fular", ad: "Fular" },
];

export const VARSAYILAN_RENK: OyuncuRengi = "gok";
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
 * Buhar tutamları — Ü182.
 *
 * Üçü de farklı gecikmede ve farklı yana savruluyor. Aynı anda aynı yolu
 * izleselerdi üç çizgi olurlardı; duman düzensiz olduğu için duman.
 */
const BUHARLAR = [
  { savrul: -7, gecikme: 0, sol: 42 },
  { savrul: 5, gecikme: 850, sol: 50 },
  { savrul: 10, gecikme: 1700, sol: 58 },
] as const;

export function Avatar({
  ifade = "sakin",
  boy = 120,
  ad,
  buhar = false,
}: {
  /** Ü147: renk tek render varken yok sayılıyor — bkz. `COK_RENKLI`. */
  renk?: OyuncuRengi;
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
}) {
  const hareket = HAREKET[ifade];

  return (
    <div
      className={`loopy loopy-${hareket}`}
      style={{ width: boy, height: boy * 1.06 }}
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
                  "--savrul": `${b.savrul}px`,
                  animationDelay: `${b.gecikme}ms`,
                } as React.CSSProperties
              }
            />
          ))}
        </span>
      )}

      <Image
        src={`/avatar/loopy-${KARE[ifade]}-512.webp`}
        alt={ad ?? ""}
        width={512}
        height={512}
        className="loopy-govde"
        aria-hidden={ad ? undefined : true}
        priority={boy >= 120}
      />

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
