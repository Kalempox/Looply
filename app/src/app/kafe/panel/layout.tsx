import * as oturum from "@/domain/session";
import { isletmeTuru } from "@/domain/cark-kosul";
import { PanelGezinme } from "./gezinme";

/**
 * İşletme panelinin çerçevesi.
 *
 * Gezinme iki biçimli (Ü58): telefonda alt şerit, bilgisayarda sol kenar
 * çubuğu. Çerçevenin işi ikisine de yer açmak.
 *
 *   · `pb-20`  — alt şerit sabit konumlu, akışta yer kaplamıyor. Olmasa
 *                sayfanın son satırı şeridin arkasında kalıyor.
 *   · `lg:pl-60` — kenar çubuğu da sabit; içerik onun altına kaymasın.
 *   · `lg:pb-0` — bilgisayarda alt şerit yok, boşluğu da olmamalı.
 *
 * ── 🔴 İşletme türü neden burada okunuyor ───────────────────
 *
 * Menü butikte farklı (Ü137: butikte oyun yok) ve `gezinme.tsx` bir
 * istemci bileşeni — veritabanına kendisi bakamıyor. Türü okuyabilecek
 * tek ortak yer bu çerçeve.
 *
 * ⚠️ **`kafeYoneticisiGerekli()` bilerek kullanılmadı.** O yardımcı
 * yetkisiz ziyaretçiyi `/kafe/giris`e yönlendiriyor; çerçeveye konsaydı
 * yönlendirme kararını sayfalardan önce çerçeve verirdi ve her sayfanın
 * kendi yetki kapısı sessizce anlamsızlaşırdı. Burada yapılan iş yalnızca
 * **menüyü boyamak**: oturum okunamazsa tür `kafe` varsayılıyor, gerçek
 * kapı sayfada duruyor.
 *
 * ⚠️ **Çerçeveler gezinmede yeniden çalışmıyor** — Next onları istemcide
 * saklıyor. Şube değiştirmek `cafeId`'yi değiştirdiği için menü bayat
 * kalabilirdi; `sube-actions.ts` bu yüzden çerçeveyi açıkça tazeliyor
 * (`revalidatePath(..., "layout")`). İki şubesi farklı türde olan bir
 * işletme bunun tek gerçek örneği ama yeterli.
 */
export default async function PanelDuzeni({ children }: { children: React.ReactNode }) {
  const o = await oturum.oku();
  const turu = o?.cafeId ? await isletmeTuru(o.cafeId) : "kafe";

  return (
    <>
      <div className="pb-20 lg:pb-0 lg:pl-60">{children}</div>
      <PanelGezinme turu={turu} />
    </>
  );
}
