import { redirect } from "next/navigation";
import { platformGerekli } from "@/domain/yetki";
import { basvurulariListele, type Basvuru } from "@/domain/cafe";
import * as oturum from "@/domain/session";
import { IsletmeSayfa, IsletmeBaslik, Rozet, IsletmeUyari } from "@/components/isletme";
import { KararKontrolleri, TelefonAcma } from "./kontroller";

export const dynamic = "force-dynamic";
export const metadata = { title: "Başvurular · Looply" };

/**
 * Kafe başvuruları — G5'in insan tarafı.
 *
 * Sahte kafe kaydı, sisteme kupon üretebilecek yeni bir taraf sokmanın en
 * ucuz yolu. Otomatik onay yok: her başvuru burada belgesiyle birlikte
 * incelenip elle karara bağlanıyor.
 */
export default async function Basvurular({
  searchParams,
}: {
  searchParams: Promise<{ durum?: string }>;
}) {
  const o = await platformGerekli();
  const sp = await searchParams;
  const durum = (sp.durum ?? "pending") as Basvuru["durum"];

  const basvurular = await basvurulariListele(durum);
  const admin = o.rol === "platform_admin";

  return (
    <IsletmeSayfa genis>
      <IsletmeBaslik
        ust={admin ? "Platform · yönetici" : "Platform · destek"}
        alt="Onaylanmadan hiçbir kafe karekod üretemez, kupon dağıtamaz."
      >
        İşletme başvuruları
      </IsletmeBaslik>

      {!admin && (
        <div className="mb-7">
          <IsletmeUyari tur="bekle">
            Destek rolündesin: başvuruları görebilirsin ama karara bağlayamazsın. Onay yetkisi
            yalnızca yöneticidedir (G9).
          </IsletmeUyari>
        </div>
      )}

      <nav className="mb-7 flex gap-1 border-b border-cizgi">
        {(
          [
            ["pending", "Bekleyen"],
            ["approved", "Onaylı"],
            ["rejected", "Reddedilen"],
          ] as const
        ).map(([d, etiket]) => (
          <a
            key={d}
            href={`/platform/basvurular?durum=${d}`}
            className={`border-b-2 px-3 py-2.5 text-[14px] ${
              durum === d
                ? "border-yazi font-semibold text-yazi"
                : "border-transparent text-yazi-sonuk"
            }`}
          >
            {etiket}
          </a>
        ))}
      </nav>

      {basvurular.length === 0 ? (
        <p className="rounded-2xl border border-cizgi bg-yuzey px-4 py-10 text-center text-[15px] text-yazi-sonuk">
          Bu listede başvuru yok.
        </p>
      ) : (
        <div className="space-y-5">
          {basvurular.map((b) => (
            <BasvuruKarti key={b.id} basvuru={b} admin={admin} />
          ))}
        </div>
      )}

      <nav className="mt-10 flex items-center gap-5 border-t border-cizgi pt-6 text-[14px]">
        <form action={cikisYap}>
          <button type="submit" className="text-yazi-sonuk underline">
            Çıkış yap
          </button>
        </form>
      </nav>
    </IsletmeSayfa>
  );
}

function BasvuruKarti({ basvuru, admin }: { basvuru: Basvuru; admin: boolean }) {
  const rozet =
    basvuru.durum === "approved" ? "onayli" : basvuru.durum === "rejected" ? "red" : "bekliyor";

  return (
    <article className="overflow-hidden rounded-2xl border border-cizgi bg-yuzey">
      <header className="flex items-start justify-between gap-4 border-b border-cizgi px-5 py-4">
        <div className="min-w-0">
          <h2 className="font-display text-xl font-bold">{basvuru.ad}</h2>
          <p className="text-[13px] text-yazi-sonuk">
            {basvuru.yasalAd} · {basvuru.sehir}
          </p>
        </div>
        <Rozet tur={rozet}>
          {basvuru.durum === "approved" ? "onaylı" : basvuru.durum === "rejected" ? "reddedildi" : "bekliyor"}
        </Rozet>
      </header>

      <dl className="divide-y divide-cizgi px-5">
        <Satir k="Yetkili" v={basvuru.yetkiliAdi ?? "—"} />
        <div className="flex items-baseline justify-between gap-6 py-3">
          <dt className="shrink-0 text-[13px] text-yazi-sonuk">Telefon</dt>
          <dd className="text-right">
            {basvuru.yetkiliTelefonMaskeli ? (
              admin ? (
                <TelefonAcma cafeId={basvuru.id} maskeli={basvuru.yetkiliTelefonMaskeli} />
              ) : (
                <span>
                  <span className="block text-[14px]">{basvuru.yetkiliTelefonMaskeli}</span>
                  <span className="font-data text-[10px] text-yazi-sonuk">
                    tam numarayı yalnızca yönetici açabilir
                  </span>
                </span>
              )
            ) : (
              <span className="text-[14px]">—</span>
            )}
          </dd>
        </div>
        <Satir k="Adres" v={basvuru.adres ?? "—"} />
        <Satir
          k="Başvuru"
          v={
            basvuru.basvuruTarihi
              ? basvuru.basvuruTarihi.toLocaleString("tr-TR", {
                  day: "numeric",
                  month: "long",
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "—"
          }
        />
        <Satir
          k="Belge"
          v={
            basvuru.belgeler.length
              ? basvuru.belgeler
                  .map((b) => `${b.ad ?? b.tur} (${Math.round((b.boyut ?? 0) / 1024)} KB)`)
                  .join(", ")
              : "yüklenmemiş"
          }
          not="şifreli saklanır"
        />
        {basvuru.redSebebi && <Satir k="Ret gerekçesi" v={basvuru.redSebebi} />}
      </dl>

      {basvuru.durum === "pending" && admin && (
        <div className="border-t border-cizgi bg-cukur px-5 py-4">
          <KararKontrolleri cafeId={basvuru.id} ad={basvuru.ad} />
        </div>
      )}
    </article>
  );
}

function Satir({ k, v, not }: { k: string; v: string; not?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-6 py-3">
      <dt className="shrink-0 text-[13px] text-yazi-sonuk">{k}</dt>
      <dd className="text-right">
        <span className="block text-[14px]">{v}</span>
        {not && <span className="font-data text-[10px] text-yazi-sonuk">{not}</span>}
      </dd>
    </div>
  );
}

async function cikisYap() {
  "use server";
  await oturum.kapat("kullanici_cikisi");
  redirect("/platform/giris");
}
