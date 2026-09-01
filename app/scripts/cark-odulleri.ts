import "./_env";
import { withBypass } from "@/db/context";
import { closePools } from "@/db/pool";
import * as katalog from "@/domain/katalog";

/**
 * Demo kafelere ödül listesi kurar.
 *
 * ── Neden gerekiyor ─────────────────────────────────────────
 *
 * Çark (Ü49) ve oyun sonu anlık ödülü, kafenin **ödül listesinden**
 * çekiyor. Demo kafelerde tek bir ödül vardı ve çark aynı ismi
 * tekrarlıyordu: dönmeye değer bir şey yokmuş gibi görünüyordu.
 *
 * ── Neden raw SQL değil ─────────────────────────────────────
 *
 * `katalog.ekle` üzerinden gidiyor: değer kuralı (Ü52), kanıt kademesi
 * (E6) ve denetim izi aynen işliyor. Doğrudan INSERT etseydik demo verisi
 * üretimin kurallarını atlar ve "demoda çalışıyordu" diyen bir hata sınıfı
 * doğardı.
 *
 * ── Tutarlar (Ü52) ──────────────────────────────────────────
 *
 * 25 TL'den 50 TL'ye, 5'er artışla — ürün sahibinin kuralı. Başlıklar
 * tutarla **tutarlı** olmak zorunda: bir tur "5 TL indirim" başlıklı ödül
 * göç sırasında 25 TL'ye yuvarlandı ve ekranda yalan söyler hâle geldi.
 *
 * Tekrar çalıştırılabilir: aynı başlıktaki ödül varsa atlanıyor ve
 * başlığı yanlış tutara bağlı eski ödüller yayından kaldırılıyor.
 */

const ODULLER = [
  { baslik: "25 TL indirim", tip: "amount" as const, kurus: 25_00 },
  { baslik: "Ücretsiz filtre kahve", tip: "product" as const, kurus: 30_00 },
  { baslik: "Tatlıda %20 indirim", tip: "percent" as const, kurus: 35_00, yuzde: 20 },
  { baslik: "40 TL indirim", tip: "amount" as const, kurus: 40_00 },
  { baslik: "Ücretsiz tatlı", tip: "product" as const, kurus: 45_00 },
  { baslik: "50 TL indirim", tip: "amount" as const, kurus: 50_00 },
];

/** Göçün yuvarladığı, başlığı artık tutarını anlatmayan eski ödüller. */
const YANLIS_BASLIKLAR = [
  "5 TL indirim",
  "10 TL indirim",
  "30 TL indirim",
  "Ücretsiz çay",
  "+1 shot espresso",
  "Tatlıda %10 indirim",
  "testte yüzde 10 indirim",
];

async function main() {
  const kafeler = await withBypass("ödül listesi — kafeler", (db) =>
    db.all<{ id: string; name: string }>(
      `SELECT id, name FROM cafes WHERE status = 'approved' ORDER BY name`,
    ),
  );

  for (const kafe of kafeler) {
    // Başlığı tutarıyla çelişen ödüller yayından kalkıyor; silinmiyor,
    // çünkü bugüne kadar üretilmiş kuponlar onlara bağlı.
    const kapatilan = await withBypass("ödül listesi — eskiyi kapat", (db) =>
      db.all<{ id: string }>(
        `UPDATE rewards SET active = false
          WHERE cafe_id = $1 AND active AND title = ANY($2)
        RETURNING id`,
        [kafe.id, YANLIS_BASLIKLAR],
      ),
    );

    const mevcut = await withBypass("ödül listesi — mevcut", (db) =>
      db.all<{ title: string }>(
        `SELECT title FROM rewards WHERE cafe_id = $1 AND active`,
        [kafe.id],
      ),
    );
    const varOlan = new Set(mevcut.map((m) => m.title));

    // Denetim izi bir personel kimliği istiyor: kafenin kendi yöneticisi.
    const yonetici = await withBypass("ödül listesi — yönetici", (db) =>
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
        puanFiyati: 0,
        anlik: true,
        aktorId: yonetici.id,
      });

      if (s.ok) eklenen++;
      else console.log(`${kafe.name} · ${o.baslik}: ${s.hata}`);
    }

    console.log(
      `${kafe.name}: ${eklenen} ödül eklendi, ${kapatilan.length} eski ödül yayından kaldırıldı`,
    );
  }

  await closePools();
}

main();
