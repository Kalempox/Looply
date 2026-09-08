import "../scripts/_env";
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { beklemeMetni, acilmaMetni, gunDilimi, HAVUZ_BOYU } from "@/domain/bekleme-metni";
import { ERTELEME_SAAT } from "@/domain/kupon";

/**
 * Ödül bekleme metinleri (Ü97).
 *
 * Sınanan şey mizahın komik olması değil — **dürüst ve kararlı** olması.
 */

/** İstanbul'da belirli bir saati veren yardımcı. */
function istanbulda(gun: string, saat: number): Date {
  return new Date(`${gun}T${String(saat).padStart(2, "0")}:00:00+03:00`);
}

describe("bekleme metni (Ü97)", () => {
  test("havuz yeterince geniş", () => {
    // Belgede "30-50 mesajlık bir havuz" isteniyor; az mesaj, aynı cümleyi
    // arka arkaya gören oyuncu demek.
    assert.ok(HAVUZ_BOYU >= 30, `havuz küçük: ${HAVUZ_BOYU}`);
  });

  test("aynı kupon aynı dilimde aynı cümleyi gösteriyor", () => {
    // ⚠️ Rastgele olsaydı oyuncu sayfayı her yenilediğinde başka bir
    // gezegen görürdü ve bu mizah değil ARIZA gibi okunurdu.
    const an = istanbulda("2026-09-08", 14);
    const aktif = istanbulda("2026-09-09", 2);
    const ilk = beklemeMetni("kpn_1", aktif, an);
    for (let i = 0; i < 20; i++) {
      assert.equal(beklemeMetni("kpn_1", aktif, an), ilk, "cümle yenilemede değişti");
    }
  });

  test("gün dilimi değişince cümle de değişebiliyor", () => {
    // Beklemenin ilerlediğini gösteren şey bu: akşam başka, sabah başka.
    const aktif = istanbulda("2026-09-09", 12);
    const dilimler = [3, 9, 14, 21].map((s) => beklemeMetni("kpn_2", aktif, istanbulda("2026-09-08", s)));
    assert.ok(new Set(dilimler).size > 1, "bütün dilimlerde aynı cümle çıktı");
  });

  test("farklı kuponlar farklı cümle alıyor", () => {
    const an = istanbulda("2026-09-08", 14);
    const aktif = istanbulda("2026-09-09", 2);
    const metinler = new Set(
      Array.from({ length: 40 }, (_, i) => beklemeMetni(`kpn_${i}`, aktif, an)),
    );
    assert.ok(metinler.size >= 8, `çeşitlilik düşük: ${metinler.size}`);
  });

  test("🔴 metin yalan söylemiyor — bugün açılacaksa 'yarın' demiyor", () => {
    // ⚠️ Mizah, oyuncunun saati BİLMEMESİ üzerine kurulu; yanlış bilmesi
    // üzerine değil. "Yarın açılacak" diyen bir cümle, ödül bu akşam
    // açılacakken gösterilirse söz tutulmamış olur.
    const an = istanbulda("2026-09-08", 9);
    const bugunAcilan = istanbulda("2026-09-08", 21);
    for (let i = 0; i < 200; i++) {
      const m = beklemeMetni(`bugun_${i}`, bugunAcilan, an);
      assert.ok(!/yarın/i.test(m), `bugün açılan ödüle "yarın" dedi: ${m}`);
    }
  });

  test("🔴 yarın açılacaksa 'bugün' demiyor", () => {
    const an = istanbulda("2026-09-08", 21);
    const yarinAcilan = istanbulda("2026-09-09", 9);
    for (let i = 0; i < 200; i++) {
      const m = beklemeMetni(`yarin_${i}`, yarinAcilan, an);
      assert.ok(!/bugün/i.test(m), `yarın açılan ödüle "bugün" dedi: ${m}`);
    }
  });

  test("🔴 metinde saat, süre ya da tutar geçmiyor", () => {
    // E9: oyuncu TL görmez. Ü97: oyuncu saati görmez. Havuzdaki hiçbir
    // cümle ikisini de sızdırmamalı.
    const an = istanbulda("2026-09-08", 14);
    for (const aktif of [istanbulda("2026-09-08", 22), istanbulda("2026-09-09", 8)]) {
      for (let i = 0; i < 300; i++) {
        const m = beklemeMetni(`s_${i}`, aktif, an);
        assert.ok(!/\d+\s*(saat|dakika|TL|₺)/i.test(m), `metin süre/tutar sızdırdı: ${m}`);
        assert.ok(!/\d{1,2}[:.]\d{2}/.test(m), `metin saat sızdırdı: ${m}`);
      }
    }
  });

  test("açılma metni net bitiyor ve kupona göre sabit", () => {
    const a = acilmaMetni("kpn_9");
    assert.equal(acilmaMetni("kpn_9"), a);
    assert.ok(/açıl|hazır/i.test(a), `açılış metni açılmayı söylemiyor: ${a}`);
  });

  test("gün dilimleri doğru sınırlarda", () => {
    assert.equal(gunDilimi(istanbulda("2026-09-08", 2)), "gece");
    assert.equal(gunDilimi(istanbulda("2026-09-08", 8)), "sabah");
    assert.equal(gunDilimi(istanbulda("2026-09-08", 14)), "gunduz");
    assert.equal(gunDilimi(istanbulda("2026-09-08", 20)), "aksam");
  });

  test("erteleme süresi 12 saat (Ü97)", () => {
    // Ürün sahibi: "sistemde hep 12 saat." Sayı sistemde duruyor;
    // gizlenen şey oyuncunun onu görmesi.
    assert.equal(ERTELEME_SAAT, 12);
  });
});
