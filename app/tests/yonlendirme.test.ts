import "../scripts/_env";
import { test, after, describe } from "node:test";
import assert from "node:assert/strict";
import { withBypass } from "@/db/context";
import { closePools } from "@/db/pool";
import { MASA_COOKIE } from "@/domain/qr";
import { goreliYonlendir } from "@/lib/yonlendir";
import { GET as karekodGet } from "@/app/m/[kod]/route";

/**
 * Karekod yönlendirmesi — Ü273.
 *
 * 🔴 Ürün sahibi Safari'de karekodu okuttu: adres `192.168.1.175` ile
 * açıldı ve `0.0.0.0`a yönlendi. Geliştirme sunucusu `-H 0.0.0.0` ile
 * dinliyor ve yönlendirme `new URL(yol, istek.url)` ile kuruluyordu —
 * `istek.url` sunucunun dinlediği adresi taşıyordu. Burada istek tam
 * olarak öyle kuruluyor: `https://0.0.0.0:3000/m/<kod>`.
 */

after(async () => {
  await closePools();
});

const ctx = (kod: string) => ({ params: Promise.resolve({ kod }) });

describe("karekod yönlendirmesi (Ü273)", () => {
  test("🔴 0.0.0.0 ile gelen istek bile GÖRELİ yönleniyor — telefon geldiği adreste kalıyor", async () => {
    const masa = await withBypass("test: basılı kodu olan masa", (db) =>
      db.one<{ print_code: string }>(
        `SELECT t.print_code FROM cafe_tables t JOIN cafes c ON c.id = t.cafe_id
          WHERE t.print_code IS NOT NULL AND t.active AND c.status = 'approved' LIMIT 1`,
      ),
    );
    assert.ok(masa, "önkoşul: basılı kodu olan aktif masa yok (npm run db:seed)");

    const cevap = await karekodGet(
      new Request(`https://0.0.0.0:3000/m/${masa.print_code}`),
      ctx(masa.print_code),
    );

    assert.equal(cevap.status, 307);
    const yer = cevap.headers.get("location") ?? "";
    assert.equal(yer, "/hemen?cark=1");
    assert.doesNotMatch(yer, /0\.0\.0\.0|:\/\//, "yönlendirme sunucunun dinlediği adrese gidiyor");
    assert.match(cevap.headers.get("set-cookie") ?? "", new RegExp(`${MASA_COOKIE}=`), "masa bileti verilmedi");
  });

  test("geçersiz kod da göreli yönleniyor", async () => {
    const cevap = await karekodGet(new Request("https://0.0.0.0:3000/m/yok-boyle-bir-kod"), ctx("yok-boyle-bir-kod"));
    assert.equal(cevap.status, 307);
    assert.equal(cevap.headers.get("location"), "/giris?hata=masa");
  });

  test("yalnızca site içi yol — açık yönlendirme yok", () => {
    for (const kotu of ["//evil.com", "https://evil.com", "/\\evil.com", "evil.com", ""]) {
      assert.throws(() => goreliYonlendir(kotu), `kabul edildi: ${kotu}`);
    }
    assert.equal(goreliYonlendir("/oyna").headers.get("location"), "/oyna");
  });
});
