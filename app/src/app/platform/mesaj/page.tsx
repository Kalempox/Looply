import { platformGerekli } from "@/domain/yetki";
import { pazarlamaKitleSayisi } from "@/domain/platform";
import { tavanDurumu } from "@/sms";
import { IsletmeSayfa, IsletmeBaslik, Bolum, IsletmeUyari } from "@/components/isletme";
import { PlatformGezinme } from "../gezinme";
import { MesajFormu } from "./kontroller";

export const dynamic = "force-dynamic";
export const metadata = { title: "Mesaj · Looply" };

/**
 * Ticari ileti — Ü130.
 *
 * ── 🔴 İYS kaydı bu ekranın kapsamı dışında ─────────────────
 *
 * Türkiye'de ticari elektronik ileti göndermek İleti Yönetim Sistemi
 * kaydı **ve** açık rıza istiyor. Rıza tarafı üründe: oyuncu kayıtta
 * onay veriyor, `/verilerim`den geri alabiliyor, sürümüyle birlikte
 * saklanıyor. İYS kaydı ise bir kurum işi ve kod onu halledemez —
 * ekran bunu açıkça yazıyor ki "sistem hallediyordur" sanılmasın.
 *
 * ── Rızasıza gönderilemiyor ─────────────────────────────────
 *
 * Kitle `pazarlamaKitlesi()`den geliyor ve süzgeç SQL'de. Bu ekranda
 * "hepsine gönder" diye bir seçenek yok ve eklenemez: alıcı listesini
 * üreten tek fonksiyon rızasızı hiç döndürmüyor.
 */
export default async function MesajSayfasi() {
  const o = await platformGerekli();
  const admin = o.rol === "platform_admin";

  const [kitle, tavan] = await Promise.all([pazarlamaKitleSayisi(), tavanDurumu()]);

  return (
    <IsletmeSayfa>
      <IsletmeBaslik
        ust="Platform"
        alt="Looply adına, yalnızca rıza verenlere."
      >
        Ticari ileti
      </IsletmeBaslik>

      <PlatformGezinme />

      <section className="mb-7 grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-cizgi bg-yuzey px-4 py-4">
          <div className="etiket-caps text-[10px] text-yazi-sonuk">Rıza veren</div>
          <div className="mt-1 font-data text-[26px] leading-none font-bold tabular">
            {kitle}
          </div>
          <div className="mt-1.5 text-[12px] text-yazi-sonuk">ulaşılabilecek kişi</div>
        </div>
        <div className="rounded-2xl border border-cizgi bg-yuzey px-4 py-4">
          <div className="etiket-caps text-[10px] text-yazi-sonuk">Bugünkü SMS</div>
          <div className="mt-1 font-data text-[26px] leading-none font-bold tabular">
            {tavan.gonderilen}
          </div>
          <div className="mt-1.5 text-[12px] text-yazi-sonuk">
            günlük tavan {tavan.tavan}
          </div>
        </div>
      </section>

      <div className="mb-7">
        <IsletmeUyari tur="bekle">
          <strong>İYS kaydı bu ekranın dışında.</strong> Ticari elektronik ileti
          göndermek için İleti Yönetim Sistemi kaydı yasal zorunluluk. Sistem rızayı
          tutuyor ve rızasıza gönderim yapmıyor; İYS kaydını yapan taraf işletme.
        </IsletmeUyari>
      </div>

      <Bolum
        baslik="Mesaj"
        alt="Yalnızca ticari ileti rızası açık olan oyunculara gider. Geri alınamaz."
      >
        {!admin ? (
          <p className="rounded-2xl border border-cizgi bg-yuzey px-5 py-5 text-[14px] text-yazi-sonuk">
            Destek rolündesin — gönderim yetkisi yalnızca yöneticide (G9).
          </p>
        ) : kitle === 0 ? (
          <p className="rounded-2xl border border-cizgi bg-yuzey px-5 py-5 text-[14px] text-yazi-sonuk">
            Ticari ileti rızası olan kimse yok. Gönderilecek bir kitle oluşmadan bu form
            çalışmıyor.
          </p>
        ) : (
          <div className="rounded-2xl border border-cizgi bg-yuzey p-5">
            <MesajFormu kitle={kitle} />
          </div>
        )}
      </Bolum>

      <Bolum baslik="Ne kaydediliyor">
        <p className="text-[14px] leading-relaxed text-yazi-sonuk">
          Her gönderim <strong className="text-yazi">maskeli numarayla</strong> SMS
          defterine düşüyor; kitleyi açan her çağrı gerekçesiyle birlikte denetim izine
          yazılıyor. Mesajın sonuna çıkma bağlantısı{" "}
          <strong className="text-yazi">otomatik</strong> ekleniyor — kaldırılamıyor.
        </p>
      </Bolum>
    </IsletmeSayfa>
  );
}
