import { withBypass } from "@/db/context";
import { log, hataAlanlari } from "@/lib/log";

export const dynamic = "force-dynamic";

/**
 * Sağlık ucu — dışarıdan izleme için (G19).
 *
 * Bilerek az bilgi döner: sürüm, şema durumu, tablo adı, hata metni — hiçbiri.
 * Sağlık ucu, saldırgana sistem hakkında bilgi veren bir pencere olmamalı.
 * Ayrıntı loglara gider, cevaba değil.
 */
export async function GET() {
  try {
    const ok = await withBypass("sağlık kontrolü", async (db) => {
      const r = await db.one<{ bir: number }>("SELECT 1 AS bir");
      return r?.bir === 1;
    });

    if (!ok) throw new Error("veritabanı beklenmeyen cevap döndü");

    return Response.json({ durum: "iyi" }, { status: 200 });
  } catch (err) {
    log.error("saglik kontrolu basarisiz", hataAlanlari(err));
    return Response.json({ durum: "bozuk" }, { status: 503 });
  }
}
