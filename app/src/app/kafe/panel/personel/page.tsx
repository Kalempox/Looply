import Link from "next/link";
import { headers } from "next/headers";
import { kafeYoneticisiGerekli } from "@/domain/yetki";
import { personelListele, PIN_ROTASYON_GUNU } from "@/domain/staff";
import * as ayar from "@/domain/ayar";
import { withCafe } from "@/db/context";
import { istektenTabanAdres } from "@/lib/karekod-adresi";
import {
  IsletmeSayfa,
  IsletmeBaslik,
  Bolum,
  Rozet,
  IkiKolon,
} from "@/components/isletme";
import { SayiKarti, CubukListe, IKON } from "@/components/gosterge";
import { PersonelEkleFormu, PersonelSatiri } from "./kontroller";

export const dynamic = "force-dynamic";
export const metadata = { title: "Personel · Looply" };

export default async function PersonelSayfasi() {
  const o = await kafeYoneticisiGerekli();

  const personel = await personelListele(o.cafeId);

  /**
   * Ü285: kasa girişi cihaz kaydına değil kafenin konumuna bağlı. Konum
   * işaretli değilse hiçbir kasiyer giremez — ekran bunu söylüyor.
   */
  const kafe = await withCafe(o.cafeId, (db) =>
    db.one<{ lat: number | null; lng: number | null }>(`SELECT lat, lng FROM cafes`),
  );
  const konumVar = kafe?.lat != null && kafe?.lng != null;
  const yaricap = await ayar.sayiOku(o.cafeId, ayar.ANAHTARLAR.konumYaricapi);
  const kasaAdresi = `${istektenTabanAdres(await headers())}/kasa`;

  /**
   * Ü62: kasiyer başına onay sayısı.
   *
   * Ekran "kim çalışıyor" sorusunu cevaplıyordu; kafe sahibinin asıl
   * merak ettiği **kim onaylıyor**. Hiç onay yapmamış bir kasiyer, ya
   * PIN'i çalışmıyor ya da kasada değil — ikisi de öğrenilmeye değer.
   *
   * `coupon_events` değil `coupons` okunuyor: onaylayan personel
   * kuponun kendi satırında (A4 — `redeemed_by_staff_id` NULL ise durum
   * `redeemed` olamaz), yani tek tablo yetiyor.
   */
  const onaylar = await withCafe(o.cafeId, (db) =>
    db.all<{ staff_id: string; n: string }>(
      `SELECT redeemed_by_staff_id AS staff_id, count(*) AS n
         FROM coupons
        WHERE status = 'redeemed'
          AND redeemed_by_staff_id IS NOT NULL
          AND redeemed_at > (now() - interval '7 days')
        GROUP BY redeemed_by_staff_id`,
    ),
  );
  const onayHarita = new Map(onaylar.map((r) => [r.staff_id, Number(r.n)]));

  const kasiyerler = personel.filter((p) => p.rol === "cashier");
  const yoneticiler = personel.filter((p) => p.rol === "manager");

  const toplamOnay = onaylar.reduce((t, r) => t + Number(r.n), 0);
  const onayListesi = kasiyerler
    .map((k) => ({ etiket: k.ad, deger: onayHarita.get(k.id) ?? 0 }))
    .sort((a, b) => b.deger - a.deger);
  const enCok = onayListesi[0]?.deger ? onayListesi[0] : null;

  return (
    <IsletmeSayfa genis>
      <IsletmeBaslik
        ust="İşletme paneli"
        alt="Kasada kupon onaylayacak kişileri buradan yönetirsin."
      >
        Personel ve kasa
      </IsletmeBaslik>

      <section className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <SayiKarti
          etiket="Kasiyer"
          deger={String(kasiyerler.length)}
          alt="PIN ile giriyor"
          ikon={IKON.kisi}
          alan="kisi"
        />
        <SayiKarti
          etiket="Kasa girişi"
          deger={konumVar ? `${yaricap} m` : "Konum yok"}
          alt={konumVar ? "PIN yalnızca bu yarıçapta çalışır" : "önce kafenin konumunu işaretle"}
          ikon={IKON.masa}
          alan="masa"
        />
        <SayiKarti
          etiket="Onaylanan kupon"
          deger={String(toplamOnay)}
          alt="son 7 gün"
          ikon={IKON.onay}
          alan="kisi"
          vurgulu
        />
        <SayiKarti
          etiket="En çok onaylayan"
          deger={enCok ? enCok.etiket : "—"}
          alt={enCok ? `${enCok.deger} kupon` : "henüz onay yok"}
          ikon={IKON.kupon}
          alan="odul"
        />
      </section>

      <IkiKolon
        sol={
          <>
            <Bolum
              baslik="Kasiyerler"
              alt={`Kasiyer telefonla değil PIN'le giriyor — vardiya değişiminde SMS beklemek gerçekçi değil. PIN her telefon ya da tablette çalışır ama yalnızca kafenin içinde; ${PIN_ROTASYON_GUNU} günde bir değiştirilmelidir.`}
            >
              {kasiyerler.length === 0 ? (
                <p className="rounded-2xl border border-cizgi bg-yuzey px-4 py-6 text-center text-[14px] text-yazi-sonuk">
                  Henüz kasiyer eklenmedi. Kupon onaylanabilmesi için en az bir
                  kasiyer gerekiyor.
                </p>
              ) : (
                <ul className="divide-y divide-cizgi border-y border-cizgi">
                  {kasiyerler.map((p) => (
                    <PersonelSatiri key={p.id} personel={p} />
                  ))}
                </ul>
              )}

              <div className="mt-6 rounded-2xl border border-cizgi bg-yuzey p-5">
                <h3 className="mb-4 text-[15px] font-semibold">Kasiyer ekle</h3>
                <PersonelEkleFormu />
              </div>
            </Bolum>
          </>
        }
        sag={
          <>
            {/* Ü285: cihaz kaydı kalktı — kasiyer kendi telefonundan ya da
                kasadaki tabletten, kafenin içindeyken giriyor. */}
            <Bolum
              baslik="Kasa girişi"
              alt="Cihaz kaydı yok: kasiyer herhangi bir telefon ya da tabletten girer."
            >
              {!konumVar && (
                <p className="mb-4 rounded-2xl border border-tehlike/60 bg-yuzey px-4 py-3 text-[14px] text-tehlike">
                  Kafenin konumu işaretli değil — şu an hiçbir kasiyer giremez.{" "}
                  <Link href="/kafe/panel/konum" className="underline">
                    Konumu işaretle
                  </Link>
                </p>
              )}
              <div className="rounded-2xl border border-cizgi bg-yuzey p-5">
                <div className="etiket-caps text-yazi-sonuk">Kasiyerlere bu adresi ver</div>
                <p className="mt-2 break-all font-data text-[15px]">{kasaAdresi}</p>
                <ol className="mt-4 list-decimal space-y-1.5 pl-5 text-[14px] text-yazi-sonuk">
                  <li>Adresi kafenin içindeyken aç.</li>
                  <li>Tarayıcı konum isterse izin ver.</li>
                  <li>
                    PIN&apos;ini yaz — konum kafenin {yaricap} m yarıçapındaysa kasa açılır, oturum
                    sekiz saat sürer.
                  </li>
                </ol>
                <p className="mt-4 text-[12px] text-yazi-sonuk">
                  Yarıçapı{" "}
                  <Link href="/kafe/panel/konum" className="underline">
                    Konum
                  </Link>{" "}
                  sayfasından değiştirirsin; oyuncuların &ldquo;kafedesin&rdquo; kuralı da aynı.
                </p>
              </div>
            </Bolum>

            <Bolum
              baslik="Son 7 günde onay"
              alt="Hiç onay yapmamış kasiyer: ya PIN'i çalışmıyor ya kasada değil."
            >
              <CubukListe
                satirlar={onayListesi.map((k) => ({
                  etiket: k.etiket,
                  deger: k.deger,
                  not: k.deger === 0 ? "hiç onaylamadı" : `${k.deger} kupon`,
                }))}
                bosMetin="Kasiyer eklenmedi."
                alan="kisi"
              />
            </Bolum>
          </>
        }
      />

      <Bolum baslik="Yöneticiler">
        <ul className="divide-y divide-cizgi border-y border-cizgi">
          {yoneticiler.map((y) => (
            <li key={y.id} className="flex items-center justify-between py-3.5">
              <span>
                <span className="block text-[15px] font-semibold">{y.ad}</span>
                <span className="block font-data text-[11px] text-yazi-sonuk">
                  {y.telefonMaskeli}
                </span>
              </span>
              <Rozet tur="onayli">yönetici</Rozet>
            </li>
          ))}
        </ul>
      </Bolum>

      <nav className="mt-10 border-t border-cizgi pt-6 text-[14px]"></nav>
    </IsletmeSayfa>
  );
}
