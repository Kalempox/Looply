/**
 * Oyuncu tarafının renk ailesi — Ü65.
 *
 * ── Neden bu renkler ────────────────────────────────────────
 *
 * Çarkın dilimlerinden geliyorlar. Ürün sahibi *"çarkı referans al"*
 * dediğinde kastettiği buydu ve ilk denemede yanlış anladım: çarkın
 * **arka fonunu** (koyu mor sahne) alıp her ekrana yapıştırdım. Oysa
 * çarkın kendisi aydınlık ve altı renkli; koyu olan yalnızca üstünde
 * durduğu sahne.
 *
 * Ürün sahibinin düzeltmesi: *"her yere bu mor efekti koyma, daha
 * renkli daha eğlenceli olmalı."*
 *
 * ── `cark.tsx`'teki not artık geçersiz ──────────────────────
 *
 * O dosyada "bu renkler yalnızca çarkta geçerli, `globals.css`e jeton
 * olarak konsalardı palet fiilen genişlerdi" yazıyordu. Karar bilerek
 * çevrildi: palet oyuncu tarafında genişledi. Ama söz konusu endişe
 * hâlâ geçerli olduğu için renkler **globals.css'e girmiyor** —
 * burada, tek dosyada duruyorlar ve yalnızca oyuncu ekranları import
 * ediyor. İşletme paneli kendi alan renklerini kullanmaya devam
 * ediyor (Ü63); iki palet birbirine karışmıyor.
 *
 * ── Tonlar ──────────────────────────────────────────────────
 *
 * Her renkte üç ton var ve üçünün de tek bir işi var:
 *
 * - `zemin` — kartın arka planı. Pastel; üstünde koyu metin okunuyor.
 * - `ana`   — çerçeve, ikon, sayı. Beyaz üstünde AA kontrastı geçiyor.
 * - `koyu`  — pastel zeminin üstündeki metin. `ana` çoğu pastelin
 *             üstünde yeterince koyu kalmıyor.
 * - `canli` — koyu zeminde ya da dolgu olarak kullanılan doygun ton.
 */

export type OyuncuRengi =
  | "kahve"
  | "buz"
  | "yesil"
  | "pembe"
  | "menekse"
  | "amber"
  | "gok"
  | "nane"
  | "lavanta"
  | "krem";

/**
 * Oyuncu tarafındaki kartın yüzeyi — Ü67, Ü70, Ü71.
 *
 * ── Nasıl buraya gelindi ────────────────────────────────────
 *
 * Ü67'de zemin soldan sağa açılan bir gradyandı: solda renk, sağda
 * beyaz. Ü69-70'te kupon bileti dört stil denemesinden geçti ve ürün
 * sahibi **açık zeminli ışın** stilinde karar kıldı — zemin kuponun
 * kendi renginde, üstünde çok soluk bir ışın dokusu.
 *
 * Ü71'de o dil **bütün kartlara** yayıldı: *"bu dili diğer kartlara da
 * yay."* Fırsat kartı, oyun kartı, sayfa başlığı, profildeki kafe
 * kartı — hepsi artık aynı yüzeyi paylaşıyor.
 *
 * ── Neden tek fonksiyon ─────────────────────────────────────
 *
 * Zemin, çerçeve ve ışın üçlüsü altı ayrı dosyada elle yazılıydı ve
 * biletin tonu her değiştiğinde altısını da güncellemek gerekiyordu.
 * Artık kartın yüzeyi tek yerden geliyor; bilet neye benziyorsa
 * ekrandaki her kart ona benziyor.
 *
 * ── Aynı hue, iki durak ─────────────────────────────────────
 *
 * `canli` tonundan onun %44'üne iniyor. Ayrı bir "açık" paleti tutmaya
 * gerek yok — parlaklık farkı yetiyor ve renk ailesi bozulmuyor.
 */
export function kartZemin(renk: OyuncuRengi): string {
  const r = RENK[renk];
  return `linear-gradient(150deg, ${r.canli} 0%, ${r.canli}70 100%)`;
}

/** Kartın çerçevesi — zeminle aynı aileden, biraz koyu. */
export function kartKenar(renk: OyuncuRengi): string {
  return `${RENK[renk].ana}40`;
}

/**
 * Işın dokusu.
 *
 * ⚠️ İki değer birden düşürüldü (Ü70). Tek başına opaklığı kısmak
 * yetmedi: 0.08'de bile doygun bir zeminin üstünde ışınlar **çizgili
 * kumaş** gibi okunuyordu. Seyreltilince (3° dolu, 20° boş) desen
 * olmaktan çıkıp yüzeye düşen ışığa dönüştü.
 *
 * Kaldırılmadı, azaltıldı: kartların ana ekrandaki koyu durum kartıyla
 * akrabalığını kuran tek detay bu.
 */
export const ISIN_OPAKLIK = 0.05;
export const ISIN_DOKUSU =
  "repeating-conic-gradient(from 0deg, #fff 0deg 3deg, transparent 3deg 20deg)";

export type RenkTonu = {
  zemin: string;
  ana: string;
  koyu: string;
  canli: string;
};

export const RENK: Record<OyuncuRengi, RenkTonu> = {
  /* Sıcak içecek — Ü69. Kahvenin kendi rengi. */
  kahve: { zemin: "#f4eae1", ana: "#8a5a33", koyu: "#5c3a1e", canli: "#c08b5c" },
  /* Soğuk içecek — Ü74. Buzlu camın rengi. */
  buz: { zemin: "#e2f5fb", ana: "#3f9ec0", koyu: "#1a6a86", canli: "#8fd8ee" },
  /* Doğrudan tutar kuponu — para yeşili. */
  yesil: { zemin: "#e3f4e8", ana: "#15803d", koyu: "#14532d", canli: "#4ade80" },
  /* Tatlı — koyu pembe. */
  pembe: { zemin: "#fde7f0", ana: "#be185d", koyu: "#831843", canli: "#f472b6" },
  menekse: { zemin: "#f1ecfe", ana: "#7c3aed", koyu: "#5b21b6", canli: "#a78bfa" },
  amber: { zemin: "#fff2d5", ana: "#c2740a", koyu: "#8a5206", canli: "#fbbf24" },
  gok: { zemin: "#e2f3fd", ana: "#0284c7", koyu: "#075985", canli: "#38bdf8" },
  /*
    🔴 Ü235 · palet oyun eklemek için genişledi.

    Yedi tonun hepsi tutuluydu: beşi oyunlarda, ikisi (kahve, amber)
    kupon kategorilerinde — aşağıdaki not bunları oyun rengi olarak
    kullanmayı açıkça yasaklıyor. Bıçak'a boş ton kalmamıştı.

    ⚠️ Yeni ton uydurulmadı, **çarktan** alındı: `cark.tsx` içindeki
    dilim listesinde duran nane (#5eead4). Ü65'in kuralı buydu — bu
    palet çarkın dilimlerinden geliyor. Çarkta kullanılmayan bir renk
    seçilseydi iki yüzey akraba olmaktan çıkardı.

    ⚠️ `ana` teal-700 (#0f766e), çarktaki parlak nane değil: dilim
    rengi beyaz üstünde 1,5:1 kontrast veriyor ve ikon/sayı için
    okunmuyor. `canli` çarkın kendi tonu, `ana` onun okunabilir eşi.
  */
  nane: { zemin: "#dcfaf4", ana: "#0f766e", koyu: "#134e4a", canli: "#5eead4" },
  /*
    Ü261 · Ayır lavanta. Yukarıdaki not son iki oyun için çarkta krem ve
    lavantanın beklediğini yazıyordu; ikisinden lavanta seçildi.

    ⚠️ Krem alınmadı çünkü okunabilir eşi kehribara (Kırıcı) düşüyor —
    iki oyun aynı sarı-kahve ailesinde kalırdı. Lavanta menekşeye
    (Sekme) komşu ama `ana` çivit-700'e çekilerek ayrıldı: menekşenin
    `ana`sı mor (#7c3aed), bunun ki mavi tarafta.

    ⚠️ Çarkta artık **yalnızca krem** kaldı. Sekizinci oyun eklenirken
    çarkın kendisi büyümek zorunda.
  */
  lavanta: { zemin: "#eceefe", ana: "#4338ca", koyu: "#312e81", canli: "#a5b4fc" },
  /*
    Ü262 · Bağla krem — çarkın dilim listesinde kalan **son** ton
    (#f0d9a8). `ana` da çarkın kendi koyu tonundan (#8a7145) geliyor ve
    beyaz üstünde 4,63 kontrast veriyor, yani ikon/sayı okunuyor.

    ⚠️ Kehribara (Kırıcı) yakın bir aile ve bu bilerek kabul edildi:
    palet gerçekten tükendi. Ayıran şey `canli` — kehribarınki parlak
    altın (#fbbf24), bunun ki soluk kum (#f0d9a8) ve kartta görünen o.

    🔴 **Onuncu oyun için çarkın kendisi büyümek zorunda.** Bu palet
    Ü65'ten beri çarkın dilimlerinden besleniyor ve dilimlerde
    kullanılmamış ton kalmadı.
  */
  krem: { zemin: "#fbf4e4", ana: "#8a7145", koyu: "#5c4a2a", canli: "#f0d9a8" },
};

/**
 * Oyunların rengi.
 *
 * Her oyunun kendi rengi var ve her yerde aynı: ana ekrandaki karo,
 * oyun kabuğunun başlığı, profildeki geçmiş satırı. Renk oyunun
 * kimliği — oyuncu adı okumadan hangi oyuna baktığını biliyor.
 *
 * Tanınmayan oyun menekşe: yeni bir oyun eklendiğinde ekran renksiz
 * kalmıyor, yalnızca kimliksiz kalıyor.
 *
 * Düşen Ü69'da gülden **pembeye** geçti: kupon paleti koyu pembeyi
 * aldığında iki yakın ton yan yana gelirdi ve altı renk yerine beş
 * tutmak, ayırt edilebilirliği artırıyor.
 */
export const OYUN_RENGI: Record<string, OyuncuRengi> = {
  blok: "gok",
  dusen: "pembe",
  // Ü217: Sekme, Ü208'de Kelime'den boşalan menekşeyi devraldı.
  sekme: "menekse",
  // Ü91: yılan yeşil. Kalan iki ton (kahve, amber) kupon kategorilerinin
  // — sıcak içecek ve yiyecek — ve oyun rengiyle karışmamalılar.
  yilan: "yesil",
  /*
    Ü235: Bıçak nane. Yukarıdaki yasak yüzünden ton kalmamıştı ve palet
    çarktan bir renkle genişledi (bkz. `RENK.nane`).

    ⚠️ Kalan dört oyun eklenirken aynı iş üç kez daha gerekecek:
    çarkın dilim listesinde krem, sarı ve lavanta duruyor. Beşincisi
    için çarkın kendisi de büyümek zorunda — palet oradan besleniyor.
  */
  bicak: "nane",
  /*
    Ü244: Kırıcı kehribar. Yukarıdaki yasak (kahve ve kehribar kupon
    kategorilerinin) kalktı — kupon rengi Ü65'te teknik tipten
    çıkıp `GORSEL_RENGI`ye taşındığı için oyun paletiyle çakışma
    artık yok. Kehribar tuğlanın kendi rengi; başka bir ton
    seçilseydi tahta ile karo ayrışırdı (Ü85).

    ⚠️ Kalan üç oyun için çarkın dilim listesinde krem, sarı ve
    lavanta duruyor.
  */
  kirici: "amber",
  /*
    Ü259: 2048 buz. Kalan iki ton (kahve, gök) — gök Blok'un, kahve
    ise kupon kategorisiyle karışıyor. Buz serbestti ve sayıların
    soğuk dili ona oturuyor.

    ⚠️ Kalan iki oyun için çarkın dilim listesinde krem ve lavanta
    duruyor; palet oradan besleniyor (bkz. `RENK.nane`).
  */
  ikibin: "buz",
  /* Ü261: Ayır lavanta — gerekçesi paletin içinde. */
  ayir: "lavanta",
  /* Ü262: Bağla krem — çarkta kalan son ton. */
  bagla: "krem",
};

export function oyunRengi(oyunId: string): OyuncuRengi {
  return OYUN_RENGI[oyunId] ?? "menekse";
}

/*
 * Kupon rengi burada değil, `oyuncu-gorsel.ts`'te (`GORSEL_RENGI`).
 *
 * Ü65'te renk kuponun **teknik tipinden** (ürün/yüzde/tutar) geliyordu
 * ve "Tatlıda %10 indirim" menekşe çıkıyordu: ekranda pasta çizimi,
 * kenarında mor bir şerit. Ü67'de renk gördüğün şeyden türüdü ve Ü69'da
 * ürün sahibi tonları kendisi seçti — **sıcak içecek kahverengi, tatlı
 * koyu pembe, doğrudan tutar kuponu koyu yeşil.** Üçü de gerçek
 * nesnenin rengi; öğrenilecek bir eşleme kalmıyor.
 */
