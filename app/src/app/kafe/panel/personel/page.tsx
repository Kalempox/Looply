import { kafeYoneticisiGerekli } from "@/domain/yetki";
import { personelListele, PIN_ROTASYON_GUNU } from "@/domain/staff";
import { withCafe } from "@/db/context";
import {
  IsletmeSayfa,
  IsletmeBaslik,
  Bolum,
  Rozet,
  IkiKolon,
} from "@/components/isletme";
import { SayiKarti, CubukListe, IKON } from "@/components/gosterge";
import {
  PersonelEkleFormu,
  PersonelSatiri,
  CihazKaydiFormu,
} from "./kontroller";

export const dynamic = "force-dynamic";
export const metadata = { title: "Personel · Looply" };

export default async function PersonelSayfasi() {
  const o = await kafeYoneticisiGerekli();

  const personel = await personelListele(o.cafeId);
  const cihazlar = await withCafe(o.cafeId, (db) =>
    db.all<{ id: string; label: string; created_at: Date }>(
      `SELECT id, label, created_at FROM cafe_devices WHERE active = true ORDER BY created_at`,
    ),
  );

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
        alt="Kasada kupon onaylayacak kişileri ve cihazları buradan yönetirsin."
      >
        Personel ve cihazlar
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
          etiket="Kayıtlı cihaz"
          deger={String(cihazlar.length)}
          alt="PIN yalnızca bunlarda çalışır"
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
              alt={`Kasiyer telefonla değil PIN'le giriyor — vardiya değişiminde SMS beklemek gerçekçi değil. PIN yalnızca aşağıda kayıtlı cihazlarda çalışır ve ${PIN_ROTASYON_GUNU} günde bir değiştirilmelidir.`}
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
        sag={
          <Bolum
            baslik="Kayıtlı cihazlar"
            alt="PIN yalnızca bu cihazlarda çalışır. Kayıtlı olmayan bir telefondan PIN denemek işe yaramaz."
          >
            {cihazlar.length === 0 ? (
              <p className="rounded-2xl border border-cizgi bg-yuzey px-4 py-6 text-center text-[14px] text-yazi-sonuk">
                Kayıtlı cihaz yok. Kasada kullanacağın tableti veya telefonu
                kaydet.
              </p>
            ) : (
              <ul className="divide-y divide-cizgi border-y border-cizgi">
                {cihazlar.map((c) => (
                  <li
                    key={c.id}
                    className="flex items-center justify-between py-3.5"
                  >
                    <span className="text-[15px]">{c.label}</span>
                    <span className="font-data text-[11px] text-yazi-sonuk">
                      {c.created_at.toLocaleDateString("tr-TR", {
                        day: "numeric",
                        month: "long",
                      })}
                    </span>
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-6 rounded-2xl border border-cizgi bg-yuzey p-5">
              <h3 className="mb-1 text-[15px] font-semibold">
                Bu cihazı kaydet
              </h3>
              <p className="mb-4 text-[13px] text-yazi-sonuk">
                Kasada kullanacağın cihazdan bu sayfayı aç ve kaydet.
              </p>
              <CihazKaydiFormu />
            </div>
          </Bolum>
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
