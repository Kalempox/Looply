import { kafeYoneticisiGerekli } from "@/domain/yetki";
import { personelListele, PIN_ROTASYON_GUNU } from "@/domain/staff";
import { withCafe } from "@/db/context";
import { IsletmeSayfa, IsletmeBaslik, Bolum, Rozet } from "@/components/isletme";
import { PersonelEkleFormu, PersonelSatiri, CihazKaydiFormu } from "./kontroller";

export const dynamic = "force-dynamic";
export const metadata = { title: "Personel · CafePlay" };

export default async function PersonelSayfasi() {
  const o = await kafeYoneticisiGerekli();

  const personel = await personelListele(o.cafeId);
  const cihazlar = await withCafe(o.cafeId, (db) =>
    db.all<{ id: string; label: string; created_at: Date }>(
      `SELECT id, label, created_at FROM cafe_devices WHERE active = true ORDER BY created_at`,
    ),
  );

  const kasiyerler = personel.filter((p) => p.rol === "cashier");
  const yoneticiler = personel.filter((p) => p.rol === "manager");

  return (
    <IsletmeSayfa genis>
      <IsletmeBaslik ust="İşletme paneli" alt="Kasada kupon onaylayacak kişileri ve cihazları buradan yönetirsin.">
        Personel ve cihazlar
      </IsletmeBaslik>

      <Bolum
        baslik="Kasiyerler"
        alt={`Kasiyer telefonla değil PIN'le giriyor — vardiya değişiminde SMS beklemek gerçekçi değil. PIN yalnızca aşağıda kayıtlı cihazlarda çalışır ve ${PIN_ROTASYON_GUNU} günde bir değiştirilmelidir.`}
      >
        {kasiyerler.length === 0 ? (
          <p className="rounded-2xl border border-cizgi bg-yuzey px-4 py-6 text-center text-[14px] text-yazi-sonuk">
            Henüz kasiyer eklenmedi. Kupon onaylanabilmesi için en az bir kasiyer gerekiyor.
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
        baslik="Kayıtlı cihazlar"
        alt="PIN yalnızca bu cihazlarda çalışır. Kayıtlı olmayan bir telefondan PIN denemek işe yaramaz."
      >
        {cihazlar.length === 0 ? (
          <p className="rounded-2xl border border-cizgi bg-yuzey px-4 py-6 text-center text-[14px] text-yazi-sonuk">
            Kayıtlı cihaz yok. Kasada kullanacağın tableti veya telefonu kaydet.
          </p>
        ) : (
          <ul className="divide-y divide-cizgi border-y border-cizgi">
            {cihazlar.map((c) => (
              <li key={c.id} className="flex items-center justify-between py-3.5">
                <span className="text-[15px]">{c.label}</span>
                <span className="font-data text-[11px] text-yazi-sonuk">
                  {c.created_at.toLocaleDateString("tr-TR", { day: "numeric", month: "long" })}
                </span>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-6 rounded-2xl border border-cizgi bg-yuzey p-5">
          <h3 className="mb-1 text-[15px] font-semibold">Bu cihazı kaydet</h3>
          <p className="mb-4 text-[13px] text-yazi-sonuk">
            Kasada kullanacağın cihazdan bu sayfayı aç ve kaydet.
          </p>
          <CihazKaydiFormu />
        </div>
      </Bolum>

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

      <nav className="mt-10 border-t border-cizgi pt-6 text-[14px]">
      </nav>
    </IsletmeSayfa>
  );
}
