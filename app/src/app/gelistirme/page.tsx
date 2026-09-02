import { notFound } from "next/navigation";
import { defteriOku } from "@/sms/gelistirme-defteri";
import { kodEkrandaGosterilir } from "@/sms";
import { Yenileyici, TemizleDugmesi } from "./kontroller";

export const dynamic = "force-dynamic";
export const metadata = { title: "Geliştirme defteri · Looply" };

/**
 * Geliştirme defteri.
 *
 * Test ederken "kod nereye gitti" sorusunun tek cevap yeri. Giden kodları
 * ve **gönderilmeyenleri sebebiyle birlikte** gösteriyor — kayıtsız numara,
 * dolu kota, kilitli numara, aşılmış günlük tavan.
 *
 * Canlıda bu sayfa yok: `kodEkrandaGosterilir()` iki şart birden arıyor
 * (APP_ENV canlı değil **ve** sahte SMS sağlayıcısı) ve canlıda ikisi
 * birlikte sağlanamıyor. Sağlanmıyorsa sayfa 404 döner.
 */
export default async function GelistirmeDefteri() {
  if (!kodEkrandaGosterilir()) notFound();

  const kayitlar = defteriOku();

  return (
    <main className="min-h-dvh bg-zemin text-yazi">
      <Yenileyici />

      <div className="mx-auto w-full max-w-2xl px-5 py-10">
        <header className="mb-8 border-b border-cizgi pb-5">
          <div className="mb-2 etiket-caps text-odul-koyu">
            Yalnızca geliştirme
          </div>
          <h1 className="font-display text-3xl font-extrabold tracking-tight">
            Geliştirme defteri
          </h1>
          <p className="mt-2 text-[14px] leading-relaxed text-yazi-sonuk">
            Giden doğrulama kodları ve gönderilmeyenler. Sayfa üç saniyede bir
            kendini yeniliyor — açık bırakıp yan sekmede test edebilirsin.
          </p>
        </header>

        {kayitlar.length === 0 ? (
          <p className="rounded-2xl border border-cizgi bg-cukur px-4 py-10 text-center text-[14px] text-yazi-sonuk">
            Henüz kayıt yok. Bir yerde doğrulama kodu iste, burada görünsün.
          </p>
        ) : (
          <ul className="space-y-2">
            {kayitlar.map((k, i) => (
              <li
                key={`${k.zaman}-${i}`}
                className={`rounded-2xl border bg-yuzey px-4 py-3.5 ${
                  k.kod ? "border-odul" : "border-cizgi opacity-75"
                }`}
              >
                <div className="flex items-center gap-4">
                  <span className="min-w-0 flex-1">
                    <span className="block font-data text-[11px] tracking-wide text-yazi-sonuk">
                      {new Date(k.zaman).toLocaleTimeString("tr-TR")} · {k.telefon}
                    </span>
                    <span className="mt-1 block etiket-caps text-vurgu">
                      {k.nereden}
                    </span>
                    <span className="mt-0.5 block text-[14px]">{k.olay}</span>
                    {k.not && (
                      <span className="mt-0.5 block font-data text-[10px] text-yazi-sonuk">
                        {k.not}
                      </span>
                    )}
                  </span>

                  {k.kod && (
                    <span className="shrink-0 font-data text-2xl font-bold tracking-[0.2em] text-odul-koyu tabular">
                      {k.kod}
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-8 flex items-center justify-between border-t border-cizgi pt-6">
          <TemizleDugmesi />
          <span className="font-data text-[10px] text-yazi-sonuk">
            Bellekte tutulur · sunucu yeniden başlayınca silinir
          </span>
        </div>
      </div>
    </main>
  );
}
