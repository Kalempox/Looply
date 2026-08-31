import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";

/**
 * Kelime listesi üretici — Ü23, Ü24.
 *
 * Oyunun kelime listesi elle yazılmıyor, **üretiliyor**: kaynak, yöntem ve
 * süzgeçler burada okunabilir durumda duruyor. "Bu kelime listeye neden
 * girdi / girmedi" sorusunun cevabı bu dosyadır.
 *
 * ── Kaynaklar ───────────────────────────────────────────────
 *
 *  1. tdd-ai/hunspell-tr  ·  MPL-2.0  ·  tr_TR.dic
 *     https://github.com/tdd-ai/hunspell-tr
 *     Türkçe imla sözlüğü. 75.909 kök. Kelimelerin GELDİĞİ yer burası.
 *
 *  2. hermitdave/FrequencyWords  ·  MIT  ·  content/2018/tr/tr_50k.txt
 *     https://github.com/hermitdave/FrequencyWords
 *     OpenSubtitles frekans listesi. Yalnızca **süzgeç** olarak kullanılıyor:
 *     "bu dizi gerçek metinde tek başına geçiyor mu?"
 *
 * ── Neden iki kaynak ────────────────────────────────────────
 *
 * Hunspell'in "kök" listesi ek çıkarımı için üretilmiş; içinde `abanm`,
 * `abac`, `aband` gibi **tek başına kelime olmayan gövdeler** var. Bunlar
 * gerçek metinde hiç geçmez. Frekans listesiyle kesiştirmek onları eliyor.
 *
 * Frekans listesi tek başına da yetmiyor: altyazı metni olduğu için çekimli
 * biçimlerle dolu (`gerekiyor`, `bozuldu`, `düşündüğümü`). Onları da
 * ayrıştırma süzgeci eliyor — bkz. `ayrıştırılabilir()`.
 *
 * ── Lisans sonucu ───────────────────────────────────────────
 *
 * Üretilen liste hunspell-tr verisinden **türetilmiştir**; MPL-2.0 dosya
 * düzeyinde copyleft olduğu için çıktı dosyası da MPL-2.0'dır ve kaynağı
 * erişilebilir tutulur. Uygulama kodunun lisansına dokunmaz. → `veri/LISANS.md`
 *
 * ── Çalıştırma ──────────────────────────────────────────────
 *
 *   npm run kelime:uret -- <tr_TR.dic yolu> <tr_50k.txt yolu>
 *
 * Kaynak dosyalar depoya konmuyor (36 MB + 712 KB); yukarıdaki adreslerden
 * indirilir.
 */

/** Türk alfabesi — başka hiçbir harf kabul edilmiyor. */
const TURKCE_HARF = /^[abcçdefgğhıijklmnoöprsştuüvyz]+$/;

const EN_KISA = 4;
const EN_UZUN = 7;
const HEDEF_ADET = 5_000;

/**
 * Çekim ve yapım ekleri.
 *
 * Liste **kasten temkinli**: yalnızca gözle görülür biçimde çekimli olan
 * kalıplar var. Fazla agresif bir liste `balık` gibi gerçek kelimeleri de
 * eler; fazla gevşek olan `gerekiyor`u listede bırakır. İkinci hata daha
 * pahalı — oyuncu bunu ekranda görür.
 */

/**
 * Fiil ekleri — taban **2 harf** olabilir.
 *
 * Türkçe fiil kökleri çok kısadır: `de-`, `al-`, `at-`, `aç-`. Taban sınırını
 * 3'te tutmak `dedi`, `aldı`, `atmış` gibi apaçık fiilleri listede bırakıyordu.
 */
const FIIL_EKLERI = [
  "yor", "ıyor", "iyor", "uyor", "üyor",
  "acak", "ecek", "cak", "cek",
  "mış", "miş", "muş", "müş",
  "malı", "meli",
  "dık", "dik", "duk", "dük", "tık", "tik", "tuk", "tük",
  "ince", "ınca", "unca", "ünce",
  "ken", "mak", "mek",
  "dı", "di", "du", "dü", "tı", "ti", "tu", "tü",
  "sın", "sin", "sun", "sün",
];

/**
 * İsim çekim ve iyelik ekleri — taban **3 harf** olmalı.
 *
 * Tek ünlü ekler (`ı`, `i`, `u`, `ü`) burada bilerek var: `farkı`, `köyün`,
 * `uçuşu` gibi iyelik biçimleri listenin en görünür kusuruydu. `a` ve `e`
 * **yok** — onlar `masa` → `mas` gibi gerçek kelimeleri elerdi.
 */
const ISIM_EKLERI = [
  "lar", "ler",
  "dan", "den", "tan", "ten",
  "ları", "leri",
  "nın", "nin", "nun", "nün",
  "sını", "sine", "ında", "inde",
  "ını", "ini", "unu", "ünü",
  "sı", "si", "su", "sü",
  "ım", "im", "um", "üm",
  "ın", "in", "un", "ün",
  "mız", "miz", "nız", "niz",
  "ı", "i", "u", "ü",
];

/**
 * Küfür, hakaret ve cinsel içerik süzgeci.
 *
 * Kaynak altyazı metni olduğu için frekans listesinin üst bandı bunlarla
 * dolu. Ekran kafede, masada, görünür yerde duruyor — bu süzgeç pazarlık
 * konusu değil.
 *
 * Kök eşleşmesi yapılıyor: kelime bu köklerden birini **içeriyorsa** eleniyor.
 * Bu bilerek geniş tutuldu; birkaç masum kelimeyi de elemesi kabul edilen
 * bedel.
 *
 * ⚠️ Canlıya çıkmadan önce bir insanın gözden geçirmesi gerekiyor — otomatik
 * süzgeç hiçbir dilde tam değildir.
 */
const YASAKLI_KOKLER = [
  "sik", "sık", "am", "amcık", "yarrak", "yarak", "göt", "got",
  "orospu", "kahpe", "piç", "pic", "oç", "puşt", "pust",
  "meme", "penis", "vajina", "seks", "porno", "fahişe", "fahise",
  "ibne", "top", "gavat", "kaltak", "sürtük", "surtuk",
  "salak", "aptal", "gerizekalı", "mal", "dangalak", "öküz",
  "pezevenk", "şerefsiz", "serefsiz", "haysiyetsiz", "namussuz",
  "yavşak", "yavsak", "zıkkım", "bok", "sıçmak", "sicmak",
];

/**
 * "am", "top", "mal", "göt" gibi kısa köklerin içerik eşleşmesi çok masum
 * kelimeyi elerdi (`amaç`, `toplam`, `malzeme`, `götürmek`). Onlar yalnızca
 * TAM eşleşmede eleniyor.
 */
const YALNIZ_TAM_ESLESME = new Set(["am", "top", "mal", "göt", "got", "oç", "meme", "bok"]);

/** Türkçe küçük harf — JS'in varsayılanı `I`'yı `i` yapar, `ı` değil. */
function kucult(s: string): string {
  return s.replace(/İ/g, "i").replace(/I/g, "ı").toLowerCase();
}

/**
 * Kelime, bilinen bir tabana ek eklenerek elde edilebiliyor mu?
 *
 * `gerekiyor` = `gerek` + `iyor` → evet, çekimli, elenir.
 * `abajur`    = ayrıştırılamıyor  → hayır, kalır.
 *
 * Tabanın da **gerçekten kullanılan** bir kelime olması aranıyor (frekans
 * listesinde geçmeli). Yalnızca hunspell kökü olması yetseydi `kadın`
 * kelimesi `kad` + `ın` diye yanlışlıkla elenirdi.
 */
function ayristirilabilir(kelime: string, gercekKelimeler: Set<string>): boolean {
  for (const ek of FIIL_EKLERI) {
    if (!kelime.endsWith(ek)) continue;
    const taban = kelime.slice(0, kelime.length - ek.length);
    if (taban.length >= 2 && gercekKelimeler.has(taban)) return true;
  }

  for (const ek of ISIM_EKLERI) {
    if (!kelime.endsWith(ek)) continue;
    const taban = kelime.slice(0, kelime.length - ek.length);
    if (taban.length >= 3 && gercekKelimeler.has(taban)) return true;
  }

  return false;
}

function yasakliMi(kelime: string): boolean {
  for (const kok of YASAKLI_KOKLER) {
    if (YALNIZ_TAM_ESLESME.has(kok)) {
      if (kelime === kok) return true;
    } else if (kelime.includes(kok)) {
      return true;
    }
  }
  return false;
}

function main() {
  const [dicYolu, frekansYolu] = process.argv.slice(2);
  if (!dicYolu || !frekansYolu) {
    console.error(
      "Kullanım: npm run kelime:uret -- <tr_TR.dic> <tr_50k.txt>\n\n" +
        "  tr_TR.dic   https://raw.githubusercontent.com/tdd-ai/hunspell-tr/main/tr_TR.dic\n" +
        "  tr_50k.txt  https://raw.githubusercontent.com/hermitdave/FrequencyWords/master/content/2018/tr/tr_50k.txt",
    );
    process.exit(1);
  }

  // ── 1 · Hunspell kökleri ──────────────────────────────────
  const kokler = new Set<string>();
  for (const satir of readFileSync(dicYolu, "utf8").split("\n").slice(1)) {
    const kok = kucult(satir.split("/")[0].trim());
    if (kok) kokler.add(kok);
  }

  // ── 2 · Frekans listesi ───────────────────────────────────
  const frekans = new Map<string, number>();
  for (const satir of readFileSync(frekansYolu, "utf8").split("\n")) {
    const [kelime, sayi] = satir.trim().split(/\s+/);
    if (!kelime) continue;
    const k = kucult(kelime);
    if (!frekans.has(k)) frekans.set(k, Number(sayi) || 0);
  }

  // Ayrıştırma süzgecinin taban kümesi: gerçekten kullanılan her kelime,
  // uzunluk sınırı olmadan. `gerek` 5 harfli ama `bul` 3 harfli de olabilir.
  const gercekKelimeler = new Set(frekans.keys());

  // ── 3 · Süzgeçler ─────────────────────────────────────────
  const sayac = { kisaUzun: 0, harf: 0, sozlukte_yok: 0, cekimli: 0, yasakli: 0 };
  const aday: { kelime: string; frekans: number }[] = [];

  for (const [kelime, sayi] of frekans) {
    if (kelime.length < EN_KISA || kelime.length > EN_UZUN) {
      sayac.kisaUzun++;
      continue;
    }
    if (!TURKCE_HARF.test(kelime)) {
      sayac.harf++;
      continue;
    }
    if (!kokler.has(kelime)) {
      sayac.sozlukte_yok++;
      continue;
    }
    if (ayristirilabilir(kelime, gercekKelimeler)) {
      sayac.cekimli++;
      continue;
    }
    if (yasakliMi(kelime)) {
      sayac.yasakli++;
      continue;
    }
    aday.push({ kelime, frekans: sayi });
  }

  aday.sort((a, b) => b.frekans - a.frekans);
  const secilen = aday.slice(0, HEDEF_ADET).map((a) => a.kelime);

  // ── 4 · Uzunluğa göre grupla ──────────────────────────────
  // Oyun bölümü "5 harfli kelimeler" gibi isteyecek; hazır gruplanmış olsun.
  const uzunlukDagilimi: Record<number, number> = {};
  for (const k of secilen) uzunlukDagilimi[k.length] = (uzunlukDagilimi[k.length] ?? 0) + 1;

  const cikti = {
    _lisans: "MPL-2.0 — tdd-ai/hunspell-tr verisinden türetilmiştir. Ayrıntı: LISANS.md",
    _uretim: "scripts/kelime-listesi-uret.ts",
    _adet: secilen.length,
    kelimeler: secilen.sort(),
  };

  const hedefDizin = path.join(process.cwd(), "src/oyunlar/veri");
  mkdirSync(hedefDizin, { recursive: true });
  writeFileSync(path.join(hedefDizin, "kelimeler.json"), JSON.stringify(cikti, null, 0), "utf8");

  console.log(`Hunspell kökü        ${kokler.size.toLocaleString("tr-TR")}`);
  console.log(`Frekans listesi      ${frekans.size.toLocaleString("tr-TR")}`);
  console.log("");
  console.log(`Elendi — uzunluk     ${sayac.kisaUzun.toLocaleString("tr-TR")}`);
  console.log(`Elendi — harf        ${sayac.harf.toLocaleString("tr-TR")}`);
  console.log(`Elendi — sözlükte yok ${sayac.sozlukte_yok.toLocaleString("tr-TR")}`);
  console.log(`Elendi — çekimli     ${sayac.cekimli.toLocaleString("tr-TR")}`);
  console.log(`Elendi — yasaklı     ${sayac.yasakli.toLocaleString("tr-TR")}`);
  console.log("");
  console.log(`Aday                 ${aday.length.toLocaleString("tr-TR")}`);
  console.log(`Yazıldı              ${secilen.length.toLocaleString("tr-TR")}`);
  console.log("");
  console.log("Uzunluk dağılımı:");
  for (const [uzunluk, adet] of Object.entries(uzunlukDagilimi).sort()) {
    console.log(`  ${uzunluk} harf  ${String(adet).padStart(5)}`);
  }
}

main();
