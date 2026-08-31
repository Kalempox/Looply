import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { blok, type BlokDurumu, type BlokGirdisi } from "@/oyunlar/blok";
import { dusen, type DusenDurumu, type DusenGirdisi, type DusenHareket } from "@/oyunlar/dusen";
import { kelime, kurulabilir, kucult, type KelimeDurumu, type KelimeGirdisi } from "@/oyunlar/kelime";

/**
 * Simülasyon botları — oyunları GERÇEKTEN oynarlar.
 *
 * ── Neden bot gerekiyor ─────────────────────────────────────
 *
 * `oyun.bitir` girdi kaydını `tekrarOyna` ile yeniden oynatıp skoru kendisi
 * hesaplıyor (S5). Yani simülasyon "şu oyuncu 340 puan aldı" diye bir satır
 * yazamaz; **geçerli bir girdi kaydı** üretmek zorunda. Bot bunu üretiyor.
 *
 * ── Neden her zaman geçerli ─────────────────────────────────
 *
 * Bot hamleyi kendi kafasından uydurmuyor: adayı **motorun kendi `uygula`
 * fonksiyonuna** veriyor ve yalnızca `null` dönmeyeni kaydına yazıyor. Yani
 * kayıt, tanım gereği motorun kabul ettiği hamlelerden oluşuyor — sunucunun
 * doğrulaması da aynı fonksiyonla yapıldığı için ikisi ayrışamıyor.
 *
 * Botlar iyi oyuncu değil, **kurallara uyan** oyuncu. Amaç yüksek skor değil,
 * ekranları ve raporları gerçek veriyle doldurmak.
 */

export type BotSonucu = { girdiler: unknown[]; skor: number; basarili: boolean };

/** Deterministik rastgelelik — aynı tohum aynı simülasyonu versin. */
export function zar(tohum: number) {
  let s = tohum >>> 0;
  return () => {
    s = (s * 1_664_525 + 1_013_904_223) >>> 0;
    return s / 4_294_967_296;
  };
}

/* ── Blok ─────────────────────────────────────────────────── */

/**
 * Üç teklifi ve 64 köşeyi tarar, ilk sığan yere koyar.
 *
 * Açgözlü ve kısa görüşlü — tıkanana kadar oynuyor. Bölüm hedefini tutturmak
 * şansa kalıyor ve bu **isteniyor**: başarısız biten oyunlar da raporda
 * görünmeli, yoksa demo herkesin her bölümü geçtiği bir dünyayı anlatır.
 */
function blokOyna(tohum: string, bolum: number, rnd: () => number): BotSonucu {
  let durum: BlokDurumu = blok.baslat(tohum, bolum);
  const girdiler: BlokGirdisi[] = [];

  for (let adim = 0; adim < 400 && !blok.bittiMi(durum); adim++) {
    // Başlangıç noktası rastgele: her oyun aynı köşeden başlamasın, yoksa
    // otuz oyuncunun otuz oyunu birbirinin kopyası olur.
    const kaydir = Math.floor(rnd() * 64);
    let kondu = false;

    for (let t = 0; t < 3 && !kondu; t++) {
      for (let i = 0; i < 64; i++) {
        const hucre = (i + kaydir) % 64;
        const girdi: BlokGirdisi = { t, s: Math.floor(hucre / 8), k: hucre % 8 };
        const sonraki = blok.uygula(durum, girdi);
        if (sonraki) {
          durum = sonraki;
          girdiler.push(girdi);
          kondu = true;
          break;
        }
      }
    }
    if (!kondu) break; // hiçbir parça sığmıyor — motor da bitmiş sayacak
  }

  return { girdiler, skor: blok.skor(durum), basarili: blok.basarili(durum) };
}

/* ── Kelime ───────────────────────────────────────────────── */

const KELIMELER: string[] = JSON.parse(
  readFileSync(fileURLToPath(new URL("../src/oyunlar/veri/kelimeler.json", import.meta.url)), "utf8"),
).kelimeler;

/**
 * Eldeki harflerden kurulabilen kelimeleri dener.
 *
 * Hepsini değil: oyuncu gibi davranması için bir kısmını atlıyor. Her botun
 * bütün kelimeleri bulması, kelime oyununu raporda "herkes tam puan" gibi
 * gösterirdi.
 */
function kelimeOyna(tohum: string, bolum: number, rnd: () => number): BotSonucu {
  let durum: KelimeDurumu = kelime.baslat(tohum, bolum);
  const girdiler: KelimeGirdisi[] = [];

  const adaylar = KELIMELER.filter((k) => kurulabilir(kucult(k), durum.harfler));

  for (const aday of adaylar) {
    if (kelime.bittiMi(durum)) break;
    if (rnd() < 0.35) continue; // bazılarını göremedi

    const girdi: KelimeGirdisi = { k: aday };
    const sonraki = kelime.uygula(durum, girdi);
    if (sonraki) {
      durum = sonraki;
      girdiler.push(girdi);
    }
  }

  return { girdiler, skor: kelime.skor(durum), basarili: kelime.basarili(durum) };
}

/* ── Düşen ────────────────────────────────────────────────── */

const DUSEN_HAREKETLER: DusenHareket[] = ["sol", "sag", "don", "birak", "bekle"];

/**
 * Zaman tabanlı oyun: hamleler tick taşıyor.
 *
 * Bot birkaç yön hamlesi yapıp parçayı bırakıyor. Hangi hamlenin geçerli
 * olduğunu yine motor söylüyor — `uygula` null dönerse sıradaki denenir.
 */
function dusenOyna(tohum: string, bolum: number, rnd: () => number): BotSonucu {
  let durum: DusenDurumu = dusen.baslat(tohum, bolum);
  const girdiler: DusenGirdisi[] = [];
  let tick = durum.tick;

  for (let adim = 0; adim < 900 && !dusen.bittiMi(durum); adim++) {
    tick += 1 + Math.floor(rnd() * 3);

    // Çoğunlukla bırak; arada bir yana kaydır veya döndür.
    const hareket: DusenHareket =
      rnd() < 0.55 ? "birak" : DUSEN_HAREKETLER[Math.floor(rnd() * DUSEN_HAREKETLER.length)];

    let kondu = false;
    for (const a of [hareket, ...DUSEN_HAREKETLER]) {
      const girdi: DusenGirdisi = { tick, a };
      const sonraki = dusen.uygula(durum, girdi);
      if (sonraki) {
        durum = sonraki;
        girdiler.push(girdi);
        kondu = true;
        break;
      }
    }
    if (!kondu) break;
  }

  return { girdiler, skor: dusen.skor(durum), basarili: dusen.basarili(durum) };
}

/* ── Seçici ───────────────────────────────────────────────── */

export function botOyna(
  oyunId: string,
  tohum: string,
  bolum: number,
  rnd: () => number,
): BotSonucu {
  if (oyunId === "blok") return blokOyna(tohum, bolum, rnd);
  if (oyunId === "kelime") return kelimeOyna(tohum, bolum, rnd);
  if (oyunId === "dusen") return dusenOyna(tohum, bolum, rnd);
  throw new Error(`Bot yok: ${oyunId}`);
}
