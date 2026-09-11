import { headers } from "next/headers";
import { withCafe } from "@/db/context";
import { kafeYoneticisiGerekli } from "@/domain/yetki";
import * as masaYonetim from "@/domain/masa-yonetim";
import { TUR_ADI } from "@/domain/karekod-turu";
import { Karekod } from "@/components/karekod";

export const dynamic = "force-dynamic";
export const metadata = { title: "Karekodlar — yazdır" };

/**
 * Yazdırılabilir masa karekodları.
 *
 * ── Neden ayrı sayfa ────────────────────────────────────────
 *
 * Panelin kabuğu (başlık, gezinme, uyarılar) kâğıda basılmamalı. Ayrı bir
 * sayfa, `@media print` hilelerine gerek bırakmadan doğru çıktıyı veriyor:
 * ekranda ne varsa kâğıtta da o var.
 *
 * ── QR'ın taşıdığı şey ──────────────────────────────────────
 *
 * Tam adres (`https://.../m/{kod}`) — telefonun kamera uygulaması karekodu
 * okuyunca doğrudan açabilsin diye. Kodun kendisi `qr_secret`ten türeyen 16
 * hex hane; tahmin edilemez ama gizli değil (onu K2 koruyor).
 *
 * Adres istekten türüyor: ortam değişkeni eklemek, hazırlık ve canlı
 * arasında sessizce yanlış adres basma riskini getirirdi — ve yanlış basılan
 * karekod masaya yapıştırıldıktan sonra geri alınamaz.
 *
 * ── Yalnızca açık karekodlar ────────────────────────────────
 *
 * Kapalı olanın kodu zaten çözülmüyor; basmak, çalışmayan bir etiketi
 * yapıştırmak olurdu.
 *
 * ── Ü108: kart hangi türde olduğunu yazıyor ─────────────────
 *
 * Dört tür aynı boyda kesiliyor ve kartta yalnızca ad olsaydı ("Kasa"
 * ile "Masa 7") kâğıtlar karışırdı. Türün adı kartın üstünde, nereye
 * asılacağı altında — kesen kişinin elinde talimat kalıyor.
 */
export default async function YazdirSayfasi() {
  const o = await kafeYoneticisiGerekli();

  const [masalar, kafe, h] = await Promise.all([
    masaYonetim.listele(o.cafeId),
    withCafe(o.cafeId, (db) => db.one<{ name: string }>(`SELECT name FROM cafes`)),
    headers(),
  ]);

  const acik = masalar.filter((m) => m.aktif);
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "looply";
  const sema = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");

  return (
    <main className="min-h-dvh bg-yuzey px-6 py-8 text-yazi">
      {/* Yazdırırken bu şerit kâğıda gitmiyor. */}
      <div className="mx-auto mb-8 flex max-w-4xl items-baseline justify-between gap-4 print:hidden">
        <div>
          <div className="etiket-caps text-yazi-sonuk">{kafe?.name}</div>
          <h1 className="mt-1 font-display text-2xl font-bold">
            {acik.length} karekod
          </h1>
          <p className="mt-1 text-[13px] text-yazi-sonuk">
            Tarayıcının yazdır komutunu kullan. Kes, yerine yapıştır.
          </p>
        </div>
        <a href="/kafe/panel/masalar" className="text-[14px] text-vurgu underline">
          Geri dön
        </a>
      </div>

      {acik.length === 0 ? (
        <p className="mx-auto max-w-4xl text-[15px] text-yazi-sonuk print:hidden">
          Açık karekodun yok. Önce karekod ekle.
        </p>
      ) : (
        <div className="mx-auto grid max-w-4xl grid-cols-2 gap-6 sm:grid-cols-3">
          {acik.map((m) => (
            <article
              key={m.id}
              className="break-inside-avoid rounded-2xl border border-cizgi p-4 text-center"
            >
              <div className="flex items-baseline justify-between gap-2">
                <span className="etiket-caps text-[10px] text-yazi-sonuk">{kafe?.name}</span>
                {m.tur !== "masa" && (
                  <span className="etiket-caps text-[10px] text-vurgu">
                    {TUR_ADI[m.tur].tekil}
                  </span>
                )}
              </div>

              {/* Karekodun kendi beyaz sessiz alanı — kâğıt beyaz olsa bile
                  okuyucunun kenarı bulabilmesi için. */}
              <div className="mx-auto mt-3 w-fit bg-white p-4">
                <Karekod
                  deger={`${sema}://${host}/m/${m.kod}`}
                  boyut={150}
                  etiket={`${m.ad} karekodu`}
                />
              </div>

              <div className="mt-3 font-display text-lg leading-tight font-bold">{m.ad}</div>
              <p className="mt-1 text-[12px] text-yazi-sonuk">Okut, oyna, kazan.</p>
              <p className="mt-0.5 text-[10px] text-yazi-sonuk print:text-[9px]">
                {TUR_ADI[m.tur].nereye}
              </p>
            </article>
          ))}
        </div>
      )}
    </main>
  );
}
