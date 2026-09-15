import Link from "next/link";
import { platformGerekli } from "@/domain/yetki";
import { kafeler } from "@/domain/platform";
import { IsletmeSayfa, IsletmeBaslik, Rozet } from "@/components/isletme";
import { PlatformGezinme } from "../gezinme";

export const dynamic = "force-dynamic";
export const metadata = { title: "Kafeler · Looply" };

const DURUM_ROZETI = {
  approved: { tur: "onayli", etiket: "onaylı" },
  pending: { tur: "bekliyor", etiket: "bekliyor" },
  rejected: { tur: "red", etiket: "reddedildi" },
  suspended: { tur: "red", etiket: "askıda" },
} as const;

function tl(kurus: number): string {
  return Math.round(kurus / 100).toLocaleString("tr-TR");
}

/**
 * Bütün kafeler — Ü130.
 *
 * ── Neden kafe kafe ─────────────────────────────────────────
 *
 * Platform tarafı bugüne kadar yalnızca **başvuruları** görüyordu: bir
 * kafe onaylandıktan sonra sistemde ne yaptığı hiçbir ekranda yoktu.
 * *"Hangi kafe çalışıyor, hangisi kurulumda takıldı"* sorusunun cevabı
 * ancak veritabanına elle bakarak bulunuyordu.
 *
 * ── Sayılar neden 30 gün ────────────────────────────────────
 *
 * "Toplam" rakamı eski kafeyi hep üstte tutar; panelin cevaplaması
 * gereken soru o değil. 30 gün, bu ayın gerçeği.
 *
 * ── 🔴 Kurulum eksiği burada görünür ────────────────────────
 *
 * Konumu olmayan kafede **hiç kimse hiçbir şey kazanamıyor** (K2) ve bu
 * sahada bir kez yaşandı. Kafe bunu kendi panelinde uyarı olarak
 * görüyor ama görmezden gelebiliyor; platformun da görmesi gerek —
 * onaylanmış ama çalışmayan bir kafe, ürünün en sessiz arızası.
 */
export default async function KafelerSayfasi() {
  await platformGerekli();
  const liste = await kafeler();

  const onayli = liste.filter((k) => k.durum === "approved");
  const konumsuz = onayli.filter((k) => !k.konumVar);
  const olu = onayli.filter((k) => k.konumVar && k.oyun30 === 0);

  return (
    <IsletmeSayfa genis>
      <IsletmeBaslik ust="Platform" alt="Onaylanmış kafeler ve son 30 günde ne yaptıkları.">
        Kafeler
      </IsletmeBaslik>

      <PlatformGezinme />

      <section className="mb-7 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kutu etiket="Kafe" deger={String(liste.length)} alt={`${onayli.length} onaylı`} />
        <Kutu
          etiket="Konumu yok"
          deger={String(konumsuz.length)}
          alt="bu kafelerde kimse kazanamıyor"
          tehlike={konumsuz.length > 0}
        />
        <Kutu
          etiket="30 gündür sessiz"
          deger={String(olu.length)}
          alt="kurulumu tam, oyun yok"
          tehlike={olu.length > 0}
        />
        <Kutu
          etiket="30 günde indirim"
          deger={`${tl(liste.reduce((t, k) => t + k.indirim30Kurus, 0))} TL`}
          alt="kasada onaylanan"
        />
      </section>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[820px] border-collapse text-[14px]">
          <thead>
            <tr className="border-b border-cizgi text-left">
              <Th>Kafe</Th>
              <Th>Durum</Th>
              <Th sagda>Ürün</Th>
              <Th sagda>Ödül</Th>
              <Th sagda>Personel</Th>
              <Th sagda>Oyun · 30g</Th>
              <Th sagda>Kupon · 30g</Th>
              <Th sagda>İndirim · 30g</Th>
            </tr>
          </thead>
          <tbody>
            {liste.map((k) => {
              const r = DURUM_ROZETI[k.durum as keyof typeof DURUM_ROZETI];
              return (
                <tr key={k.cafeId} className="border-b border-cizgi last:border-0">
                  <td className="py-3 pr-4">
                    <Link
                      href={`/platform/kafeler/${k.cafeId}`}
                      className="font-semibold underline-offset-2 hover:underline"
                    >
                      {k.ad}
                    </Link>
                    <span className="mt-0.5 block text-[12px] text-yazi-sonuk">
                      {k.sehir ?? "şehir yok"}
                      {k.anaSubeAdi && ` · ${k.anaSubeAdi} şubesi`}
                    </span>
                    {k.durum === "approved" && !k.konumVar && (
                      <span className="mt-1 block text-[12px] font-semibold text-tehlike">
                        konum yok — kimse kazanamıyor
                      </span>
                    )}
                  </td>
                  <td className="py-3 pr-4">
                    {r && <Rozet tur={r.tur}>{r.etiket}</Rozet>}
                  </td>
                  <Td>{k.urun}</Td>
                  <Td>{k.odul}</Td>
                  <Td>{k.personel}</Td>
                  <Td vurgulu={k.durum === "approved" && k.oyun30 === 0}>{k.oyun30}</Td>
                  <Td>{k.kullanilanKupon30}</Td>
                  <Td>{tl(k.indirim30Kurus)} TL</Td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </IsletmeSayfa>
  );
}

function Th({ children, sagda }: { children: React.ReactNode; sagda?: boolean }) {
  return (
    <th
      className={`etiket-caps pb-2.5 text-[10px] font-normal text-yazi-sonuk ${
        sagda ? "pl-3 text-right" : "pr-4"
      }`}
    >
      {children}
    </th>
  );
}

function Td({ children, vurgulu }: { children: React.ReactNode; vurgulu?: boolean }) {
  return (
    <td
      className={`py-3 pl-3 text-right font-data tabular ${
        vurgulu ? "font-bold text-tehlike" : ""
      }`}
    >
      {children}
    </td>
  );
}

function Kutu({
  etiket,
  deger,
  alt,
  tehlike,
}: {
  etiket: string;
  deger: string;
  alt: string;
  tehlike?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border bg-yuzey px-4 py-4 ${
        tehlike ? "border-tehlike/60" : "border-cizgi"
      }`}
    >
      <div className="etiket-caps text-[10px] text-yazi-sonuk">{etiket}</div>
      <div
        className={`mt-1 font-data text-[24px] leading-none font-bold tabular ${
          tehlike ? "text-tehlike" : ""
        }`}
      >
        {deger}
      </div>
      <div className="mt-1.5 text-[12px] text-yazi-sonuk">{alt}</div>
    </div>
  );
}
