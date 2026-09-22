import { headers } from "next/headers";
import { kafeYoneticisiGerekli } from "@/domain/yetki";
import * as masaYonetim from "@/domain/masa-yonetim";
import { Karekod } from "@/components/karekod";

export const dynamic = "force-dynamic";
export const metadata = { title: "Karekod — yazdır" };

/**
 * Yazdırılabilir karekod — Ü127.
 *
 * ── Neden ayrı sayfa ────────────────────────────────────────
 *
 * Panelin kabuğu (başlık, gezinme, uyarılar) kâğıda basılmamalı. Ayrı bir
 * sayfa, `@media print` hilelerine gerek bırakmadan doğru çıktıyı veriyor.
 *
 * ── QR'ın taşıdığı şey ──────────────────────────────────────
 *
 * Tam adres (`https://.../m/{kod}`) — telefonun kamera uygulaması karekodu
 * okuyunca doğrudan açabilsin diye. Adres **istekten** türüyor: ortam
 * değişkeninden alsaydık hazırlık ve canlı arasında sessizce yanlış adres
 * basma riski doğardı ve yanlış basılan karekod asıldıktan sonra geri
 * alınamaz.
 *
 * ── Tek kart, büyük ─────────────────────────────────────────
 *
 * Eskiden sayfada onlarca küçük kart vardı (masa başına bir tane) ve
 * kesilmek için tasarlanmıştı. Tek karekod kesilmiyor, asılıyor —
 * bu yüzden kart sayfayı dolduruyor ve uzaktan okunacak kadar büyük.
 */
export default async function KarekodYazdirSayfasi() {
  const o = await kafeYoneticisiGerekli();
  const [karekod, h] = await Promise.all([masaYonetim.kafeKarekodu(o.cafeId), headers()]);

  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "looply";
  const sema = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");

  return (
    <main className="min-h-dvh bg-yuzey px-6 py-8 text-yazi">
      {/* Yazdırırken bu şerit kâğıda gitmiyor. */}
      <div className="mx-auto mb-8 flex max-w-2xl items-baseline justify-between gap-4 print:hidden">
        <div>
          <div className="etiket-caps text-yazi-sonuk">{karekod.ad}</div>
          <h1 className="mt-1 font-display text-2xl font-bold">Karekodun</h1>
          <p className="mt-1 text-[13px] text-yazi-sonuk">
            Tarayıcının yazdır komutunu kullan. Müşterinin göreceği bir yere as.
          </p>
        </div>
        <a href="/kafe/panel/karekod" className="text-[14px] text-vurgu underline">
          Geri dön
        </a>
      </div>

      <article className="mx-auto max-w-2xl rounded-2xl border border-cizgi p-8 text-center">
        <div className="etiket-caps text-[12px] text-yazi-sonuk">{karekod.ad}</div>

        <div className="mx-auto mt-6 w-fit bg-white p-6">
          {/* `isaret`: ortada Loopy, hata düzeltme `H` — Ü246.
              Bu KÂĞIDA basılan kod; masada yıllarca duracak ve
              çizilecek. Ölçüldü (`karekod.test.ts` sürümü bekçiliyor,
              okunurluk tarayıcıda jsQR ile sınandı): rozetli kod
              sade `M` koddan **daha** dayanıklı, çünkü seviye
              M'den H'ye çıkıyor ve rozet o bütçenin dörtte birini
              bile harcamıyor. */}
          <Karekod
            deger={`${sema}://${host}/m/${karekod.kod}`}
            boyut={280}
            etiket={`${karekod.ad} karekodu`}
            isaret
          />
        </div>

        <div className="mt-6 font-display text-2xl leading-tight font-bold">Okut, oyna, kazan</div>
        <p className="mt-2 text-[15px] text-yazi-sonuk">
          Kamerani karekoda tut — kazandığın indirimi kasada kullan.
        </p>
        <p className="mt-4 font-data text-[13px] tracking-wider text-yazi-sonuk tabular">
          {karekod.kod}
        </p>
      </article>
    </main>
  );
}
