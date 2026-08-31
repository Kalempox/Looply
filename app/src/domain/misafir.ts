import { randomToken, imzala, imzaGecerliMi } from "@/lib/crypto";
import { oyunBul, tekrarOyna } from "@/oyunlar";
import { log } from "@/lib/log";
import * as acil from "./acil";
import { GEOFENCE_METRE, mesafeMetre } from "./masa";
import { withBypass } from "@/db/context";

/**
 * Misafir oyun akışı — Ü35'in vitrin katmanı.
 *
 * ── Ü1 bozulmuyor ───────────────────────────────────────────
 *
 * Kayıt hâlâ oyundan önce geliyor; yalnızca **oynama anı ile kayıt anı yer
 * değiştiriyor.** Kayıt öncesi oynanan oyun hiçbir deftere yazılmıyor:
 * `play_sessions` satırı yok, puan yok, XP yok, kupon yok. Sunucu oyunu
 * doğruluyor ve sonucu **imzalı bir talep** olarak çereze koyuyor. Oyuncu
 * kaydolduğu anda o talep normal yoldan bozduruluyor
 * (`oyun.misafirOyunuYaz`) ve gerçek bir satır ile gerçek bir ödül üretiyor —
 * K2, bütçe, günlük tavan ve fraud kuralları aynen işleyerek.
 *
 * ── Neden imza ──────────────────────────────────────────────
 *
 * Çerez oyuncunun elinde. İmzasız olsaydı oyuncu kendi skorunu yazar ve
 * kaydolduğunda onu bozdururdu. İmzanın gövdesinde kafe ve masa da var:
 * A kafesinde oynanan oyun, B kafesinin bütçesinden ödül yazdıramaz.
 *
 * ── Neden veritabanı yok ────────────────────────────────────
 *
 * G13'ün ta kendisi: doğrulanmamış bir ziyaretçinin hiçbir izi kalıcı
 * olmamalı. Karekodu okutan ama kaydolmayan kimsenin veritabanında satırı
 * olmuyor — ne oyun, ne konum, ne cihaz.
 */

/** Devam eden misafir oyunu — tohumu taşır. */
export const OYUN_COOKIE = "cp_misafir_oyun";
/** Bozdurulmayı bekleyen sonuç. */
export const TALEP_COOKIE = "cp_talep";
/** Misafirin konum ölçümü — yalnızca sonuç, koordinat değil (G10). */
export const KONUM_COOKIE = "cp_misafir_konum";

/**
 * Talep ömrü kısa: 30 dakika.
 *
 * Uzun olsaydı, dün başka bir kafede oynanan bir oyun bugün burada
 * bozdurulabilirdi. Masa biletiyle aynı süre — ikisi birlikte yaşıyor.
 */
export const TALEP_OMRU_SN = 30 * 60;

const AMAC_OYUN = "misafir-oyun";
const AMAC_TALEP = "misafir-talep";
const AMAC_KONUM = "misafir-konum";

/* ── İmzalı taşıyıcı ──────────────────────────────────────── */

/**
 * Gövde JSON, taşıma base64url, sonuna imza.
 *
 * Sıra önemli: çözerken **önce imza doğrulanıyor**, sonra JSON ayrıştırılıyor.
 * Tersi olsaydı, kurcalanmış bir çerez ayrıştırıcıya ulaşırdı — imzanın işi
 * tam da bunu engellemek.
 */
function paketle(amac: string, veri: unknown): string {
  const govde = Buffer.from(JSON.stringify(veri), "utf8").toString("base64url");
  return `${govde}.${imzala(amac, govde)}`;
}

function ac<T>(amac: string, paket: string | undefined | null): T | null {
  if (!paket) return null;

  const nokta = paket.lastIndexOf(".");
  if (nokta < 1) return null;

  const govde = paket.slice(0, nokta);
  if (!imzaGecerliMi(amac, govde, paket.slice(nokta + 1))) return null;

  try {
    return JSON.parse(Buffer.from(govde, "base64url").toString("utf8")) as T;
  } catch {
    return null;
  }
}

function suresiGecti(son: unknown): boolean {
  return typeof son !== "number" || son < Date.now();
}

/* ── Konum (K2) ───────────────────────────────────────────── */

export type MisafirKonum = { cafeId: string; k2: boolean; mesafeM: number; son: number };

export type KonumSonucu =
  | { durum: "dogrulandi"; mesafeM: number; cerez: string }
  | { durum: "uzak"; mesafeM: number; cerez: string }
  | { durum: "kafe_konumu_yok" };

/**
 * Misafirin konumunu doğrular.
 *
 * ── Neden kayıt öncesi ölçülüyor ────────────────────────────
 *
 * Ölçülmeseydi Ü35 kâğıt üzerinde kalırdı: oyuncu oynar, kaydolur ve talep
 * K2 olmadan bozdurulduğu için hiçbir ödül çıkmazdı. Oysa istenen tam tersi
 * — "önce oynasın, **ödül kazansın**". Konum, oyunun gerçekten oynandığı
 * anda ve gerçekten kafedeyken ölçülmeli; kayıttan sonra sorulan konum
 * başka bir sorunun cevabı olurdu.
 *
 * ── G10 korunuyor ───────────────────────────────────────────
 *
 * Koordinat sunucuya geliyor, mesafe hesaplanıyor ve **koordinat atılıyor**.
 * Çereze de veritabanına da yalnızca metre ve "yakın mı" bilgisi giriyor.
 * "Oyuncu şu saatte şuradaydı" verisi hiçbir aşamada oluşmuyor.
 */
export async function konumDogrula(opts: {
  cafeId: string;
  lat: number;
  lng: number;
}): Promise<KonumSonucu> {
  const kafe = await withBypass("misafir konum — kafe koordinatı", (db) =>
    db.one<{ lat: number | null; lng: number | null }>(
      `SELECT lat, lng FROM cafes WHERE id = $1 AND status = 'approved'`,
      [opts.cafeId],
    ),
  );

  if (!kafe || kafe.lat == null || kafe.lng == null) {
    return { durum: "kafe_konumu_yok" };
  }

  const mesafe = mesafeMetre(opts.lat, opts.lng, kafe.lat, kafe.lng);
  const yakin = mesafe <= GEOFENCE_METRE;

  const veri: MisafirKonum = {
    cafeId: opts.cafeId,
    k2: yakin,
    mesafeM: mesafe,
    son: Date.now() + TALEP_OMRU_SN * 1000,
  };

  // Koordinat loglanmıyor (docs/08 §7.1) — yalnızca sonuç
  log.info("misafir konumu olculdu", { yakin, mesafeM: mesafe });

  const cerez = paketle(AMAC_KONUM, veri);
  return yakin
    ? { durum: "dogrulandi", mesafeM: mesafe, cerez }
    : { durum: "uzak", mesafeM: mesafe, cerez };
}

export function konumOku(cerez: string | undefined, cafeId: string): MisafirKonum | null {
  const k = ac<MisafirKonum>(AMAC_KONUM, cerez);
  if (!k || suresiGecti(k.son)) return null;
  // Başka kafede ölçülen konum burada geçerli değil.
  if (k.cafeId !== cafeId) return null;
  return k;
}

/* ── Oyun başlangıcı ──────────────────────────────────────── */

type AcikOyun = {
  oyunId: string;
  bolum: number;
  tohum: string;
  cafeId: string;
  tableId: string;
  baslangic: number;
  son: number;
};

export type BaslaSonucu =
  | { ok: true; tohum: string; bolum: number; cerez: string }
  | { ok: false; hata: string };

/**
 * Misafir oyunu başlatır. Veritabanına hiçbir şey yazılmaz.
 *
 * Tohumu **sunucu** üretiyor. İstemci seçebilseydi, oyuncu kolay dizi veren
 * tohumu arayıp her seferinde onu oynardı — normal akışta da kural bu
 * (`oyun.basla`).
 */
export async function basla(opts: {
  oyunId: string;
  bolum: number;
  cafeId: string;
  tableId: string;
}): Promise<BaslaSonucu> {
  const oyun = oyunBul(opts.oyunId);
  if (!oyun) return { ok: false, hata: "Böyle bir oyun yok." };
  if (!Number.isInteger(opts.bolum) || opts.bolum < 1 || opts.bolum > oyun.bolumSayisi) {
    return { ok: false, hata: "Böyle bir bölüm yok." };
  }

  // Acil durdurma misafiri de kapsıyor: oyunlar durduysa herkes için durur.
  if (await acil.durduruldu(acil.ANAHTARLAR.oyun)) {
    return { ok: false, hata: "Oyunlar geçici olarak durduruldu. Birazdan tekrar dene." };
  }

  const veri: AcikOyun = {
    oyunId: oyun.id,
    bolum: opts.bolum,
    tohum: randomToken(16),
    cafeId: opts.cafeId,
    tableId: opts.tableId,
    baslangic: Date.now(),
    son: Date.now() + TALEP_OMRU_SN * 1000,
  };

  return { ok: true, tohum: veri.tohum, bolum: veri.bolum, cerez: paketle(AMAC_OYUN, veri) };
}

/* ── Oyun bitişi → talep ──────────────────────────────────── */

export type Talep = {
  oyunId: string;
  bolum: number;
  tohum: string;
  cafeId: string;
  tableId: string;
  /** Sunucunun `tekrarOyna` ile bulduğu skor — istemcinin iddiası değil. */
  skor: number;
  basarili: boolean;
  /** İstemcinin iddiası; yalnızca denetim için taşınıyor (S5). */
  iddia: number;
  sureMs: number;
  /** Konum ölçüldü mü ve yakın mıydı — koordinat yok (G10). */
  k2: boolean;
  mesafeM: number | null;
  son: number;
};

export type BitirSonucu =
  | { ok: true; skor: number; basarili: boolean; k2: boolean; cerez: string }
  | { ok: false; hata: string; reddedildi?: boolean };

/**
 * Misafir oyununu bitirir: girdi kaydını yeniden oynatır, sonucu imzalar.
 *
 * Doğrulama normal akıştakiyle **aynı fonksiyon** (`tekrarOyna`) — istemcinin
 * iddia ettiği skor hiçbir hesaba girmiyor, yalnızca talebe denetim için
 * yazılıyor.
 */
export function bitir(opts: {
  acikOyunCerezi: string | undefined;
  konumCerezi: string | undefined;
  girdiler: unknown;
  iddiaEdilenSkor: number;
}): BitirSonucu {
  const acik = ac<AcikOyun>(AMAC_OYUN, opts.acikOyunCerezi);
  if (!acik || suresiGecti(acik.son)) {
    return { ok: false, hata: "Oyunun süresi doldu. Yeniden başlat." };
  }

  const oyun = oyunBul(acik.oyunId);
  if (!oyun) return { ok: false, hata: "Oyun tanımı bulunamadı." };

  const sonuc = tekrarOyna(oyun, acik.tohum, acik.bolum, opts.girdiler);
  if (!sonuc.gecerli) {
    log.warn("misafir oyunu reddedildi", { sebep: sonuc.sebep });
    return { ok: false, hata: "Oyun kaydı doğrulanamadı.", reddedildi: true };
  }

  const konum = konumOku(opts.konumCerezi, acik.cafeId);

  const talep: Talep = {
    oyunId: acik.oyunId,
    bolum: acik.bolum,
    tohum: acik.tohum,
    cafeId: acik.cafeId,
    tableId: acik.tableId,
    skor: sonuc.skor,
    basarili: sonuc.basarili,
    iddia: Number.isFinite(opts.iddiaEdilenSkor) ? Math.trunc(opts.iddiaEdilenSkor) : 0,
    sureMs: Math.max(0, Date.now() - acik.baslangic),
    k2: !!konum?.k2,
    mesafeM: konum?.mesafeM ?? null,
    son: Date.now() + TALEP_OMRU_SN * 1000,
  };

  return {
    ok: true,
    skor: talep.skor,
    basarili: talep.basarili,
    k2: talep.k2,
    cerez: paketle(AMAC_TALEP, talep),
  };
}

/**
 * Talebi çözer. İmzası tutmuyorsa, süresi geçtiyse veya biçimi bozuksa null.
 *
 * Sessizce null dönüyor — süresi dolan talep bir hata değil. Ekran
 * "oyunu tekrar oyna" diyor, kullanıcıya bir arıza gösterilmiyor.
 */
export function talepCoz(cerez: string | undefined): Talep | null {
  const t = ac<Talep>(AMAC_TALEP, cerez);
  if (!t || suresiGecti(t.son)) return null;

  // Biçim denetimi: imza gövdenin bizden çıktığını söylüyor ama sürüm
  // atlamalarında alan eksik kalabilir. Eksik talep sessizce düşsün.
  if (
    typeof t.oyunId !== "string" ||
    typeof t.cafeId !== "string" ||
    typeof t.tableId !== "string" ||
    !Number.isInteger(t.bolum) ||
    !Number.isFinite(t.skor)
  ) {
    return null;
  }
  return t;
}
