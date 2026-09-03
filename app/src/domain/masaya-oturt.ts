import { cookies } from "next/headers";
import { MASA_COOKIE, biletCoz } from "./qr";
import * as masaOturumu from "./masa";
import { takmaAd } from "./player";

/**
 * Masa biletini çerezden okuyup oyuncuyu masaya oturtur.
 *
 * ── Neden tek yerde (Ü95) ───────────────────────────────────
 *
 * Bu fonksiyon `giris/actions.ts` içinde yaşıyordu ve yorumu şunu
 * söylüyordu: *"İki giriş yolu var ve ikisi de aynı şeyi yapmak zorunda.
 * Ayrı ayrı yazılsaydı biri unutulurdu."* Gerekçe doğruydu ama sayım
 * eksikti — **üçüncü** bir yol vardı ve gerçekten unutuldu:
 *
 *   1. karekod → kayıt ol      → `giris/actions.ts`  ✓
 *   2. karekod → parolayla gir → `giris/actions.ts`  ✓
 *   3. karekod → **zaten girişli**                    ✗
 *
 * ⚠️ Üçüncü yolda karekod `/hemen`'e gidiyor, `/hemen` girişli oyuncuyu
 * `/oyna`'ya yolluyor ve masa oturumu **hiç açılmıyordu**. Oyuncu ana
 * ekranda *"Kafe dışındasın"* görüyor, karekodu tekrar okutuyor, yine aynı
 * ekranı görüyordu. İlk ziyarette çalışması hatayı gizliyordu: kayıt akışı
 * oturumu açıyor, ikinci ziyaret sessizce kırılıyordu.
 *
 * ⚠️ Masa bileti **çerezden** okunuyor, formdan ya da adresten değil.
 * Formdaki gizli alan kullanıcı tarafından değiştirilebilirdi; çerez
 * HttpOnly ve imzalı — başka kafenin kimliği yazılamıyor.
 *
 * Bilet yoksa sessizce dönüyor: karekod okutmadan giren oyuncu da bu
 * yoldan geçiyor ve onun için yapılacak bir şey yok.
 */
export async function masayaOturt(playerId: string, cihazId?: string): Promise<void> {
  const bilet = (await cookies()).get(MASA_COOKIE)?.value;
  if (!bilet) return;

  const masa = biletCoz(bilet);
  if (!masa) return;

  await takmaAd(masa.cafeId, playerId);
  await masaOturumu.ac({ cafeId: masa.cafeId, tableId: masa.tableId, playerId, cihazId });
}
