import * as oturum from "@/domain/session";
import * as avatar from "@/domain/avatar";
import { LoopyRenkleri } from "./avatar";

/**
 * Oturumdaki oyuncunun Loopy renklerini sayfaya basar — Ü186.
 *
 * ── 🔴 Neden `OyuncuSayfa`nın içinde değil ──────────────────
 *
 * Doğru yer orasıydı: yedi oyuncu sayfası o kabuktan geçiyor ve tek
 * satırla hepsi renklenirdi. Ama `components/oyuncu.tsx`i iki **istemci**
 * bileşeni import ediyor (`oyun-kabuk.tsx`, `seri-sahnesi.tsx`). Oraya
 * `@/domain/avatar` eklemek `pg` sürücüsünü istemci paketine sokar ve
 * sayfa `Can't resolve 'dns'` ile 500 döner — Ü75'te bir kez yaşandı,
 * `oyun-kabuk.tsx`in yorumunda hâlâ yazılı.
 *
 * Ayrı dosya o tuzağı yapısal olarak kapatıyor: bunu yalnızca sunucu
 * sayfaları import ediyor.
 *
 * ── Kendi okumasını kendi yapıyor ───────────────────────────
 *
 * Çağıran sayfanın oyuncuyu bulup iki alan geçirmesi de olurdu ama o
 * zaman her yeni ekranda aynı üç satır tekrar yazılırdı ve biri
 * unutulduğunda ekran **sessizce** varsayılan renge düşerdi — yanlış
 * görünmeyen, yalnızca eksik olan bir hata.
 *
 * ⚠️ Oturum yoksa hiçbir şey basmıyor: değişkeni tanımlamamak, onu
 * varsayılan değere ayarlamakla aynı sonucu veriyor (`GOVDE_DEGISKENI`
 * zaten yedekli) ve bir sorgu eksiliyor.
 */
export async function OyuncununRenkleri() {
  const o = await oturum.oku();
  if (!o || o.rol !== "oyuncu") return null;

  const secim = await avatar.oku(o.ozneId);
  return <LoopyRenkleri govde={secim.govde} serit={secim.serit} />;
}
