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
 */
export default function PanelDuzeni({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className="pb-20 lg:pb-0 lg:pl-60">{children}</div>
      <PanelGezinme />
    </>
  );
}
