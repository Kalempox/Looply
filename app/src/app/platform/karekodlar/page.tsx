import { platformGerekli } from "@/domain/yetki";
import { basiliKodlar, kodsuzMasalar } from "@/domain/qr";
import { IsletmeSayfa, IsletmeBaslik, IsletmeUyari, Rozet } from "@/components/isletme";
import { PlatformGezinme } from "../gezinme";
import { YonlendirmeDegistir } from "./kontroller";

export const dynamic = "force-dynamic";
export const metadata = { title: "Karekodlar · Looply" };

/**
 * Basılı karekodların yönlendirmesi — Ü266.
 *
 * Ürün sahibi: *"301 redirect için admin paneline kısayol ekle, biz
 * oradan hangi kafenin karekodunun yönlendirmesini değiştireceğimize
 * tek tuşla bakabilelim."*
 *
 * ── Buradaki "301" ne demek ─────────────────────────────────
 *
 * Basılı karekod `…/m/<kod>` taşıyor; `masaCoz` o kodu
 * `cafe_tables.print_code` üzerinden bir masaya bağlıyor. Yönlendirmeyi
 * değiştirmek = kodu başka bir masaya bağlamak. Ayrı bir "kod → adres"
 * tablosu yok ve olmamalı: aynı bilgi iki yerde dursaydı ayrıştıkları
 * gün hangisinin doğru olduğu bilinmezdi.
 *
 * ⚠️ **Basılı kâğıt değişmiyor.** Toptan basılan karekodlar aynen
 * kalıyor; değişen tek şey o kodun hangi masaya düştüğü. Ürün
 * sahibinin "önce toptan bastıralım, sonra kafelere dağıtalım"
 * fikrinin karşılığı bu ekran.
 */
export default async function Karekodlar() {
  const o = await platformGerekli();
  const admin = o.rol === "platform_admin";
  const [kodlar, hedefler] = await Promise.all([basiliKodlar(), kodsuzMasalar()]);

  return (
    <IsletmeSayfa genis>
      <IsletmeBaslik
        ust={admin ? "Platform · yönetici" : "Platform · destek"}
        alt="Basılı kâğıt değişmez — değişen, kodun hangi masaya gittiğidir."
      >
        Karekod yönlendirmeleri
      </IsletmeBaslik>

      <PlatformGezinme />

      {!admin && (
        <IsletmeUyari tur="bilgi">
          Yönlendirmeyi yalnızca yönetici değiştirebilir. Bu liste okunabilir.
        </IsletmeUyari>
      )}

      {kodlar.length === 0 ? (
        <IsletmeUyari tur="bilgi">
          Henüz basılı koda bağlı masa yok. Kafe panelinden karekod üretilince
          burada görünür.
        </IsletmeUyari>
      ) : (
        <table className="w-full border-collapse text-[14px]">
          <thead>
            <tr className="border-b border-cizgi text-left text-yazi-sonuk">
              <th className="py-2 font-normal">Basılı kod</th>
              <th className="py-2 font-normal">Şu an gittiği yer</th>
              <th className="py-2 font-normal">Son okutma</th>
              <th className="py-2 font-normal">{admin ? "İşlem" : ""}</th>
            </tr>
          </thead>
          <tbody>
            {kodlar.map((k) => (
              <tr key={k.kod} className="border-b border-cizgi/60 align-top">
                <td className="py-3 pr-4">
                  <span className="font-data text-[13px]">{k.kod}</span>
                </td>
                <td className="py-3 pr-4">
                  <span className="block font-semibold">{k.cafeAdi}</span>
                  <span className="text-[13px] text-yazi-sonuk">{k.masaAdi}</span>
                  {!k.aktif && (
                    <span className="ml-2">
                      <Rozet tur="pasif">masa kapalı</Rozet>
                    </span>
                  )}
                </td>
                <td className="py-3 pr-4 text-[13px] text-yazi-sonuk">
                  {k.sonTarama
                    ? k.sonTarama.toLocaleDateString("tr-TR", {
                        day: "numeric",
                        month: "short",
                      })
                    : "hiç"}
                </td>
                <td className="py-3">
                  {admin && <YonlendirmeDegistir kod={k.kod} hedefler={hedefler} />}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <p className="mt-6 text-[13px] text-yazi-sonuk">
        Hedef listesinde yalnızca <strong>kodu olmayan açık masalar</strong> var.
        Bir masanın zaten kodu varsa, o kâğıt çalışmaya devam ediyor demektir;
        üstüne ikinci bir kod bağlamak eskisini sessizce geçersiz kılardı.
      </p>
    </IsletmeSayfa>
  );
}
