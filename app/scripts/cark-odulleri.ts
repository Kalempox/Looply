import "./_env";
import { withBypass } from "@/db/context";
import { closePools } from "@/db/pool";
import * as katalog from "@/domain/katalog";

/**
 * Demo kafelere çark için anlık ödül ekler.
 *
 * ── Neden gerekiyor ─────────────────────────────────────────
 *
 * Çark (Ü49) kafenin **anlık ödül kataloğundan** dönüyor. Demo kafelerde
 * tek bir anlık ödül vardı ve çark aynı ismi tekrarlıyordu: dönmeye değer
 * bir şey yokmuş gibi görünüyordu. Bu betik çarkın gerçekten çalıştığını
 * gösterecek kadar ödül ekliyor.
 *
 * ── Neden raw SQL değil ─────────────────────────────────────
 *
 * `katalog.ekle` üzerinden gidiyor: kanıt kademesi (E6) tutardan
 * hesaplanıyor, doğrulamalar ve denetim izi aynen işliyor. Doğrudan
 * INSERT etseydik demo verisi üretimin kurallarını atlar ve "demoda
 * çalışıyordu" diyen bir hata sınıfı doğardı.
 *
 * ── Tutarlar neden küçük ────────────────────────────────────
 *
 * Ürün sahibinin tarifi: *"çok da yüksek ödüller vermeyen bir çark."*
 * En büyüğü 25 TL — erteleme eşiğinin (50 TL varsayılan) altında, yani
 * çarktan çıkan ödül anında açılıyor.
 *
 * Tekrar çalıştırılabilir: aynı başlıktaki ödül varsa atlanıyor.
 */

const ODULLER = [
  { baslik: "Ücretsiz çay", tip: "product" as const, kurus: 8_00 },
  { baslik: "5 TL indirim", tip: "amount" as const, kurus: 5_00 },
  { baslik: "10 TL indirim", tip: "amount" as const, kurus: 10_00 },
  { baslik: "Tatlıda %10 indirim", tip: "percent" as const, kurus: 12_00, yuzde: 10 },
  { baslik: "+1 shot espresso", tip: "product" as const, kurus: 15_00 },
  { baslik: "25 TL indirim", tip: "amount" as const, kurus: 25_00 },
];

async function main() {
  const kafeler = await withBypass("çark ödülleri — kafe listesi", (db) =>
    db.all<{ id: string; name: string }>(
      `SELECT id, name FROM cafes WHERE status = 'approved' ORDER BY name`,
    ),
  );

  for (const kafe of kafeler) {
    const mevcut = await withBypass("çark ödülleri — mevcut", (db) =>
      db.all<{ title: string }>(
        `SELECT title FROM rewards WHERE cafe_id = $1 AND kind = 'instant'`,
        [kafe.id],
      ),
    );
    const varOlan = new Set(mevcut.map((m) => m.title));

    // Denetim izi bir personel kimliği istiyor: kafenin kendi yöneticisi.
    const yonetici = await withBypass("çark ödülleri — yönetici", (db) =>
      db.one<{ id: string }>(
        `SELECT id FROM staff WHERE cafe_id = $1 AND active
          ORDER BY (role = 'manager') DESC, created_at LIMIT 1`,
        [kafe.id],
      ),
    );
    if (!yonetici) {
      console.log(`${kafe.name}: yöneticisi yok, atlandı`);
      continue;
    }

    let eklenen = 0;
    for (const o of ODULLER) {
      if (varOlan.has(o.baslik)) continue;

      const s = await katalog.ekle({
        cafeId: kafe.id,
        tip: o.tip,
        baslik: o.baslik,
        maliyetKurus: o.kurus,
        yuzde: o.yuzde,
        // E2: anlık ödül puan istemez.
        puanFiyati: 0,
        anlik: true,
        aktorId: yonetici.id,
      });

      if (s.ok) eklenen++;
      else console.log(`${kafe.name} · ${o.baslik}: ${s.hata}`);
    }

    console.log(`${kafe.name}: ${eklenen} ödül eklendi (${varOlan.size} zaten vardı)`);
  }

  await closePools();
}

main();
