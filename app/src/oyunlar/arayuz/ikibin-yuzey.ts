import type { CSSProperties } from "react";

/**
 * 2048'in yüzeyleri — Ü259.
 *
 * Aile koyu arcade sahnesinde (Blok · Düşen · Sekme · Yılan · Bıçak ·
 * Kırıcı) ve bu dosya aynı derinliği kuruyor. Ayırt edici renk **buz**:
 * `oyuncu-renk.ts`'te oyunun kimliği o ve tahtanın da o olması
 * gerekiyor, yoksa karo ile tahta ayrı iki oyun gibi okunuyor (Ü85).
 *
 * ── 🔴 Karo rengi DEĞERDEN türüyor, rastgele değil ──────────
 *
 * Oyuncu tahtaya bakıp hangi karonun hangisiyle birleşeceğini **renkten**
 * okuyor; klasik 2048'in tek görsel kuralı bu. Renkler rastgele ya da
 * sırayla verilseydi 2 ile 4 birbirine benzer, 64 ile 128 ayrışmaz ve
 * oyun okunmaz olurdu.
 *
 * Ton, değerin **ikilik basamağına** bağlı: 2 → 1, 4 → 2, 8 → 3…
 * Böylece her kademe bir öncekinden belirgin biçimde ayrılıyor ve
 * listenin sonuna gelindiğinde (2048 ve üstü) renk sabitleniyor.
 */

export const IKIBIN_RENK = {
  isik: "#67e8f9",
  derin: "#083344",
  bos: "rgb(255 255 255 / .06)",
} as const;

/**
 * Değer kademelerinin tonları — sırayla 2, 4, 8, 16, …
 *
 * ── 🔴 Palet Ü263'te DEĞİŞTİ: kural "koyulaşma" değil artık ──
 *
 * Ü260'ta ürün sahibi *"git gide daha koyu, sayı büyüdükçe daha koyu"*
 * demişti ve palet ona göre kurulmuştu: parlaklık 0,921'den 0,009'a tek
 * yönlü düşüyordu, testi de vardı.
 *
 * Sonra ürün sahibi bir **referans görsel** gönderdi
 * (`docs/tasarim/oyun-kartlari-referans/00-ikon-2048-ve-tupler.webp`)
 * ve *"blok için görseldeki gibi olsun"* dedi. O görselde renkler
 * koyulaşmıyor: 512 yeşil, 1024 mavi, 2048 parlayan altın. İki istek
 * çeliştiği için soruldu ve ürün sahibi **referansı** seçti.
 * Koyulaşma kuralı ve onun testi kalktı.
 *
 * ⚠️ Renkler gözle kopyalanmadı: görsel tarayıcıda tuvale çizilip her
 * karonun içinden **medyan** renk okundu. İlk iki deneme yanlış çıktı
 * ve ikisi de ölçümle görüldü — merkez örneklemesi beyaz **rakama**
 * denk geliyordu (2048 için `#fff4de`), doygunluk süzgeci ise açık
 * karolarda kenar parlamasını yakalıyordu.
 *
 * ── 🔴 Yazı rengi referanstan ALINMADI ──────────────────────
 *
 * Referans on bir karonun hepsinde beyaz rakam kullanıyor. Ölçüldü:
 * açık karolarda beyaz okunmuyor — `2` karosunda kontrast **1,97**,
 * `32`de 2,11, `2048`de 2,26. İkon boyutunda göze batmıyor ama oyunda
 * rakam tahtanın yarısı kadar ve okunması şart.
 *
 * Kural: zemin **koyuysa** (bağıl parlaklık < 0,30) beyaz, **açıksa**
 * kendi tonundan türeyen çok koyu bir renk. Böylece referansın canlı
 * zeminleri aynen duruyor, rakam her karoda okunuyor.
 *
 * ⚠️ Eşik 3,0 — 4,5 değil. WCAG'ın **büyük yazı** eşiği bu ve rakamlar
 * gerçekten büyük: en küçüğü (dört basamaklı) 27 piksel kalın, sınır
 * 18,66. Test `oyun-motoru.test.ts` içinde.
 */
const TONLAR: readonly { zemin: string; yazi: string }[] = [
  { zemin: "#a0b8f4", yazi: "#1a1d27" }, // 2    L .483 — açık, koyu yazı
  { zemin: "#7255fd", yazi: "#ffffff" }, // 4    L .172
  { zemin: "#0195fe", yazi: "#ffffff" }, // 8    L .287
  { zemin: "#02b2e0", yazi: "#001c24" }, // 16   L .372
  { zemin: "#fd9b3e", yazi: "#28190a" }, // 32   L .447
  { zemin: "#fc4e54", yazi: "#ffffff" }, // 64   L .268
  { zemin: "#fb36bd", yazi: "#ffffff" }, // 128  L .268
  { zemin: "#e328f7", yazi: "#ffffff" }, // 256  L .246
  { zemin: "#07be86", yazi: "#011e15" }, // 512  L .386
  { zemin: "#0d6dfa", yazi: "#ffffff" }, // 1024 L .179
  { zemin: "#fd9203", yazi: "#281700" }, // 2048 L .414 — altın, parlıyor
];

/** Zemin bundan koyuysa beyaz yazı okunuyor; açıksa koyu yazı gerek. */
export const IKIBIN_BEYAZ_YAZI_SINIRI = 0.3;

/** Kademe sayısı — testin ve `ikibinKaro`nun ortak kaynağı. */
export const IKIBIN_KADEME = TONLAR.length;

/** Bir kademenin tonu — test bunu okuyup parlaklığı ölçüyor. */
export function ikibinTonu(kademe: number): { zemin: string; yazi: string } {
  return TONLAR[Math.min(IKIBIN_KADEME - 1, Math.max(0, kademe))];
}

/** Sahne — ailenin koyu zemini, buza kayan bulut. */
export function ikibinSahnesi(): CSSProperties {
  return {
    background:
      "radial-gradient(120% 80% at 50% -10%, #0b3a4a 0%, #07222e 45%, #04141c 100%)",
  };
}

/** Tahtanın çerçevesi. */
export function ikibinTahtasi(): CSSProperties {
  return {
    background: "rgb(0 0 0 / .26)",
    border: "2px solid rgb(103 232 249 / .28)",
    borderRadius: 18,
    boxShadow: "inset 0 0 40px rgb(0 0 0 / .45)",
  };
}

/**
 * Boş hücre — aynı zamanda karonun **ölçü kabı**.
 *
 * ⚠️ `containerType` burada süs değil: `ikibinYaziBoyu` punto'yu
 * `cqmin` ile veriyor ve o birimin çözüleceği kabı bu satır kuruyor.
 * Kaldırılırsa punto **sessizce** üst ögenin 16px'ine düşer ve sayılar
 * 8 piksel olur — aşağıdaki nota bakın.
 */
export function ikibinBosluk(): CSSProperties {
  return {
    background: IKIBIN_RENK.bos,
    borderRadius: 10,
    containerType: "size",
  };
}

/** Değerli karo. */
export function ikibinKaro(deger: number): CSSProperties {
  /* `log2(deger) - 1`: 2 → 0, 4 → 1, 8 → 2… Listenin sonunda
     sabitleniyor, yani 4096 de 2048 gibi görünüyor. */
  const kademe = Math.min(TONLAR.length - 1, Math.max(0, Math.round(Math.log2(deger)) - 1));
  const t = TONLAR[kademe];
  return {
    background: t.zemin,
    color: t.yazi,
    borderRadius: 10,
    /* ⚠️ Parlama yalnızca **en üst** karoda ve Ü263'te geri geldi:
       referansta 2048 karosu altın rengi ve çevresine ışık veriyor.
       Ü260'ta kaldırılmıştı çünkü o zamanki kural "büyük = koyu"ydu ve
       ışık o düşüşü gözle bozuyordu; kural kalkınca gerekçe de kalktı. */
    boxShadow:
      kademe === TONLAR.length - 1
        ? "inset 0 1px 0 rgb(255 255 255 / .28), 0 0 22px rgb(253 146 3 / .75)"
        : "inset 0 1px 0 rgb(255 255 255 / .18)",
  };
}

/**
 * Karonun yazı boyu — hücrenin **kısa kenarının** yüzdesi.
 *
 * ── 🔴 `%` DEĞİL, `cqmin` ──────────────────────────────────
 *
 * Bu satır bir kez `"54%"` yazıldı ve tarayıcıda **8,64 piksel**
 * ölçüldü: CSS'te yüzdeli `font-size`, ögenin kendi boyutuna değil
 * **üst ögenin punto'suna** göre çözülüyor. Üstte punto 16px olduğu
 * için 76 piksellik hücreye 8 piksellik sayı yazılıyordu — ürün
 * sahibi *"sayıları büyüt"* derken gördüğü şey buydu ve yüzdeleri
 * değiştirmek onu düzeltmiyordu, çünkü hepsi 16'nın yüzdesiydi.
 *
 * `cqmin` hücrenin kısa kenarına göre çözülüyor (kabı
 * `ikibinBosluk`): 54cqmin = hücrenin %54'ü ≈ 41px. Tahta ekrana
 * göre büyüyüp küçülünce punto da onunla geliyor.
 *
 * ⚠️ Sabit `px` denenmedi değil — tahta `min(92vw, 62dvh)` ile
 * ölçekleniyor, sabit punto dar telefonda taşar geniş ekranda
 * kaybolurdu.
 */
export function ikibinYaziBoyu(deger: number): string {
  const basamak = String(deger).length;
  /*
    Merdiven tahmin değil, tarayıcıda **ölçülerek** kuruldu: her
    basamak sayısının gerçek yazı genişliği canvas'la ölçülüp hücreyi
    dolduracak punto seçildi.

    ⚠️ Bir kez daha büyütüldü (Ü263): ürün sahibi *"sayılar hâlâ küçük,
    baya büyük olsun"* dedi ve gönderdiği referansta rakamlar karoyu
    neredeyse dolduruyor. Hedef %80'den **%85'e** çıktı ve tek basamak
    yükseklik sınırına dayandı.

    ⚠️ Tek basamağı sınırlayan şey genişlik değil **yükseklik**: "2"
    54cqmin'de hücrenin yalnızca %32'sini kaplıyor ama rakamın boyu
    zaten hücrenin yarısı. Genişliğe göre büyütmek rakamı yukarıdan
    taşırırdı, o yüzden 54'te duruyor.
  */
  const basamaklar: Record<number, string> = {
    1: "72cqmin", // "2"     55px · genişlik %42  — sınır: yükseklik
    2: "64cqmin", // "64"    49px · genişlik %77
    3: "50cqmin", // "256"   38px · genişlik %86
    4: "35cqmin", // "2048"  27px · genişlik %85
  };
  return basamaklar[Math.min(4, basamak)] ?? "35cqmin";
}

/**
 * Ödül paketini taşıyan karo — Ü207: yalnızca `kazandirir` ise
 * çiziliyor.
 *
 * ⚠️ Karonun rengini **değiştirmiyor**, üstüne halka koyuyor: renk
 * değerin bilgisi (yukarıdaki nota bakın) ve onu ezmek oyuncunun
 * tahtayı okumasını bozardı.
 */
export function ikibinPaketi(): CSSProperties {
  return {
    borderRadius: 10,
    boxShadow: "inset 0 0 0 3px #a7f3d0, 0 0 18px rgb(16 185 129 / .75)",
  };
}

/** HUD hapı — ailenin öteki ekranlarıyla aynı. */
export function ikibinPanel(): CSSProperties {
  return {
    background: "rgb(0 0 0 / .32)",
    border: "1px solid rgb(103 232 249 / .22)",
    borderRadius: 999,
  };
}
