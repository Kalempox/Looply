import Link from "next/link";
import { notFound } from "next/navigation";
import { platformGerekli } from "@/domain/yetki";
import { kafeDetayi } from "@/domain/platform";
import * as ayar from "@/domain/ayar";
import { IsletmeSayfa, IsletmeBaslik, Bolum, Rozet } from "@/components/isletme";
import { PlatformGezinme } from "../../gezinme";
import { AktivasyonAyari, IsletmeTuruAyari } from "./kontroller";

export const dynamic = "force-dynamic";
export const metadata = { title: "Kafe künyesi · Looply" };

/**
 * Ayar anahtarlarının okunabilir adı ve birimi.
 *
 * ⚠️ Tip `Record<ayar.Anahtar, …>`: yeni bir ayar eklenip buraya
 * yazılmazsa derleme düşüyor. Önceden `Record<string, …>`tı ve eksik
 * kalan ayar ekranda ham anahtarla ("odul_ust_sinir_kurus: 8000")
 * görünüyordu — K5'in üst sınırı, geçerlilik günü, çark aralığı ve konum
 * yarıçapı öyle görünüyordu.
 */
const AYAR_ADI: Record<ayar.Anahtar, { ad: string; birim: "tl" | "saat" | "gun" | "metre" }> = {
  [ayar.ANAHTARLAR.ertelemeSaati]: { ad: "Aktivasyon saati", birim: "saat" },
  [ayar.ANAHTARLAR.gecerlilikGunu]: { ad: "Kupon geçerliliği", birim: "gun" },
  [ayar.ANAHTARLAR.odulUstSinir]: { ad: "Ödül üst sınırı", birim: "tl" },
  [ayar.ANAHTARLAR.gunlukButce]: { ad: "Günlük bütçe", birim: "tl" },
  [ayar.ANAHTARLAR.ortalamaAdisyon]: { ad: "Ortalama adisyon", birim: "tl" },
  [ayar.ANAHTARLAR.carkUstSinir]: { ad: "Çark üst sınırı", birim: "tl" },
  [ayar.ANAHTARLAR.carkAralikSaat]: { ad: "Çark aralığı", birim: "saat" },
  [ayar.ANAHTARLAR.acilisSaati]: { ad: "Açılış saati", birim: "saat" },
  [ayar.ANAHTARLAR.kapanisSaati]: { ad: "Kapanış saati", birim: "saat" },
  [ayar.ANAHTARLAR.konumYaricapi]: { ad: "Konum yarıçapı", birim: "metre" },
};

function deger(anahtar: string, n: number): string {
  const t = AYAR_ADI[anahtar as ayar.Anahtar]?.birim;
  if (t === "tl") return `${Math.round(n / 100).toLocaleString("tr-TR")} TL`;
  if (t === "gun") return `${n} gün`;
  if (t === "metre") return `${n} m`;
  return String(n);
}

/**
 * Tek kafenin künyesi — Ü130.
 *
 * ── Neden gerekti ───────────────────────────────────────────
 *
 * Bir kafe onaylandıktan sonra platform tarafında görünmez oluyordu.
 * Destek isteği geldiğinde ("müşteri kupon kazanamıyor") bakılacak hiçbir
 * ekran yoktu; cevap veritabanına elle sorgu atmaktan geçiyordu.
 *
 * ── 🔴 Kurulum eksikleri en üstte ───────────────────────────
 *
 * Konum yoksa o kafede **hiç kimse hiçbir şey kazanamıyor** (K2) ve bu
 * sahada yaşandı. Ödül yoksa çark dönmüyor. İkisi de sessiz arıza: kafe
 * paneli çalışıyor görünüyor, müşteri eli boş dönüyor. Bu yüzden künyenin
 * en üstünde ve kırmızı.
 */
export default async function KafeKunyesi({
  params,
}: {
  params: Promise<{ cafeId: string }>;
}) {
  const o = await platformGerekli();
  const { cafeId } = await params;
  const k = await kafeDetayi(cafeId);
  if (!k) notFound();

  const admin = o.rol === "platform_admin";
  const ertelemeSaat =
    k.ayarlar.find((a) => a.anahtar === ayar.ANAHTARLAR.ertelemeSaati)?.deger ??
    ayar.SINIRLAR[ayar.ANAHTARLAR.ertelemeSaati].varsayilan;

  const engeller = [
    !k.konumVar && "Konum girilmemiş — bu kafede hiç kimse ödül kazanamıyor (K2).",
    k.odul === 0 && "Yayında ödül yok — çark dönmüyor, oyun sonunda bir şey çıkmıyor.",
    k.personel === 0 && "Personel yok — kasada kupon onaylayacak kimse kayıtlı değil.",
  ].filter(Boolean) as string[];

  return (
    <IsletmeSayfa genis>
      <IsletmeBaslik ust="Platform · kafe künyesi" alt={`${k.sehir ?? "şehir yok"} · ${k.durum}`}>
        {k.ad}
      </IsletmeBaslik>

      <PlatformGezinme />

      <div className="mb-6">
        <Link href="/platform/kafeler" className="text-[14px] text-vurgu underline">
          ← Bütün kafeler
        </Link>
      </div>

      {engeller.length > 0 && (
        <div className="mb-7 rounded-2xl border border-tehlike/60 bg-tehlike/5 px-5 py-4">
          <div className="etiket-caps text-[10px] text-tehlike">Kurulum engeli</div>
          <ul className="mt-2 space-y-1.5 text-[14px] leading-relaxed">
            {engeller.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        </div>
      )}

      <section className="mb-7 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Sayi etiket="Oyun · 30g" deger={String(k.oyun30)} />
        <Sayi etiket="Kullanılan kupon · 30g" deger={String(k.kullanilanKupon30)} />
        <Sayi
          etiket="İndirim · 30g"
          deger={`${Math.round(k.indirim30Kurus / 100).toLocaleString("tr-TR")} TL`}
        />
        <Sayi etiket="Ürün · Ödül" deger={`${k.urun} · ${k.odul}`} />
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <Bolum baslik="Künye">
          <dl className="divide-y divide-cizgi border-y border-cizgi">
            <Satir k="Durum" v={k.durum} />
            <Satir k="İşletme türü" v={k.isletmeTuru === "butik" ? "Butik" : "Kafe"} />
            <Satir k="Onay" v={k.onayTarihi?.toLocaleDateString("tr-TR") ?? "—"} />
            <Satir k="Yetkili" v={k.yetkiliAdi ?? "—"} />
            {/* ⚠️ Yetkilinin cebi burada da maskeli. Tam numara ayrı bir
                işlem ve denetim izine düşüyor (docs/08 §3). */}
            <Satir
              k="Yetkili cep"
              v={k.yetkiliTelefonMaskeli ?? "—"}
              not="tam numarayı yalnızca yönetici açabilir"
            />
            <Satir k="İşletme telefonu" v={k.isletmeTelefonu ?? "—"} />
            <Satir
              k="Konum"
              v={k.konumVar ? `${k.lat?.toFixed(5)}, ${k.lng?.toFixed(5)}` : "girilmemiş"}
            />
            {k.anaSubeAdi && <Satir k="Ana işletme" v={k.anaSubeAdi} />}
          </dl>
        </Bolum>

        <Bolum baslik="Ayarlar" alt="Kafenin kendi panelinden yazdığı değerler.">
          {k.ayarlar.length === 0 ? (
            <p className="text-[14px] text-yazi-sonuk">
              Kafe hiçbir ayara dokunmamış — hepsi varsayılanda.
            </p>
          ) : (
            <dl className="divide-y divide-cizgi border-y border-cizgi">
              {k.ayarlar.map((a) => (
                <Satir
                  key={a.anahtar}
                  k={AYAR_ADI[a.anahtar as ayar.Anahtar]?.ad ?? a.anahtar}
                  v={deger(a.anahtar, a.deger)}
                />
              ))}
            </dl>
          )}

          {/* Ü137: tür, ürünün hangi akışı çalıştıracağını belirliyor. */}
          <div className="mt-6 rounded-2xl border border-cizgi bg-yuzey px-5 py-5">
            <div className="text-[15px] font-semibold">İşletme türü</div>
            <p className="mt-0.5 mb-4 text-[12px] leading-relaxed text-yazi-sonuk">
              Şu an <strong className="text-yazi">{k.isletmeTuru === "butik" ? "butik" : "kafe"}</strong>.
              Butikte oyun yok; çark hakkını kasiyer alışveriş tutarına bakarak veriyor.
            </p>
            {admin ? (
              <IsletmeTuruAyari cafeId={k.cafeId} mevcut={k.isletmeTuru} />
            ) : (
              <p className="text-[13px] text-yazi-sonuk">
                Destek rolündesin — değiştirme yetkisi yalnızca yöneticide (G9).
              </p>
            )}
          </div>

          <div className="mt-6 rounded-2xl border border-cizgi bg-yuzey px-5 py-5">
            <div className="text-[15px] font-semibold">Aktivasyon saati</div>
            <p className="mt-0.5 mb-4 text-[12px] leading-relaxed text-yazi-sonuk">
              Şu an <strong className="text-yazi">{ertelemeSaat} saat</strong>. Her
              ödül bu kadar sonra açılıyor; çark ve oyun ödülü aynı kuralı
              paylaşıyor.
            </p>
            {admin ? (
              <AktivasyonAyari cafeId={k.cafeId} mevcut={ertelemeSaat} />
            ) : (
              <p className="text-[13px] text-yazi-sonuk">
                Destek rolündesin — değiştirme yetkisi yalnızca yöneticide (G9).
              </p>
            )}
          </div>
        </Bolum>

        <Bolum baslik={`Personel · ${k.personeller.length}`}>
          {k.personeller.length === 0 ? (
            <p className="text-[14px] text-yazi-sonuk">Personel kaydı yok.</p>
          ) : (
            <ul className="divide-y divide-cizgi border-y border-cizgi">
              {k.personeller.map((p, i) => (
                <li key={`${p.ad}-${i}`} className="flex items-center justify-between gap-3 py-3">
                  <span className="text-[14px]">{p.ad}</span>
                  <span className="flex items-center gap-2">
                    <span className="text-[12px] text-yazi-sonuk">
                      {p.rol === "manager" ? "yönetici" : "kasiyer"}
                    </span>
                    {!p.aktif && <Rozet tur="pasif">kapalı</Rozet>}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Bolum>

        {k.subeler.length > 0 && (
          <Bolum baslik={`Şubeler · ${k.subeler.length}`}>
            <ul className="divide-y divide-cizgi border-y border-cizgi">
              {k.subeler.map((s) => (
                <li key={s.cafeId} className="flex items-center justify-between gap-3 py-3">
                  <Link
                    href={`/platform/kafeler/${s.cafeId}`}
                    className="text-[14px] underline-offset-2 hover:underline"
                  >
                    {s.ad}
                  </Link>
                  <span className="text-[12px] text-yazi-sonuk">{s.durum}</span>
                </li>
              ))}
            </ul>
          </Bolum>
        )}
      </div>
    </IsletmeSayfa>
  );
}

function Sayi({ etiket, deger }: { etiket: string; deger: string }) {
  return (
    <div className="rounded-2xl border border-cizgi bg-yuzey px-4 py-4">
      <div className="etiket-caps text-[10px] text-yazi-sonuk">{etiket}</div>
      <div className="mt-1 font-data text-[22px] leading-none font-bold tabular">{deger}</div>
    </div>
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
