import { PanelGezinme } from "./gezinme";

/**
 * İşletme panelinin çerçevesi.
 *
 * Tek işi alt gezinme şeridini her panel ekranına koymak ve şeridin
 * altında kalan içerik için yer bırakmak. `pb-20` olmadan sayfanın son
 * satırı şeridin arkasında kalıyor — sabit konumlu bir çubuk, akışta yer
 * kaplamıyor.
 */
export default function PanelDuzeni({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className="pb-20">{children}</div>
      <PanelGezinme />
    </>
  );
}
