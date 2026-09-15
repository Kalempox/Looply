import { kafeYoneticisiGerekli } from "@/domain/yetki";
import { subeDurumlari } from "@/domain/cafe";
import { IsletmeSayfa, IsletmeBaslik, Bolum, Rozet, IkiKolon } from "@/components/isletme";
import { SubeBasvuruFormu } from "./kontroller";

export const dynamic = "force-dynamic";
export const metadata = { title: "Şubeler · Looply" };

/**
 * Şube yönetimi (Ü125).
 *
 * ── Neden ayrı bir sayfa ────────────────────────────────────
 *
 * Üst şeritteki şube seçici **tek şubeli işletmede hiç çizilmiyor** ve
 * çizilmemeli: tek seçenek gösteren bir menü, olmayan bir yetenek varmış
 * gibi hissettirir (`kabuk.tsx`). Ama ikinci şubeyi açma yolu tam da o
 * kullanıcıya lazım. Seçiciye koysaydık, ihtiyacı olan kişi onu hiç
 * göremezdi.
 *
 * ── Bekleyen şube neden listede ─────────────────────────────
 *
 * `subeler()` yalnızca onaylıları veriyor — oturum değiştirilebilecek
 * yerlerin listesi o. Burada onay bekleyenler de görünüyor: sahibi
 * başvurusunun nerede olduğunu göremezse formu ikinci kez doldurur.
 */
export default async function SubelerSayfasi() {
  const o = await kafeYoneticisiGerekli();
  const subeler = await subeDurumlari(o.ozneId, o.cafeId);

  const onayli = subeler.filter((s) => s.durum === "approved");
  const bekleyen = subeler.filter((s) => s.durum === "pending");

  return (
    <IsletmeSayfa genis>
      <IsletmeBaslik
        ust="İşletme paneli"
        alt="Aynı işletmenin ikinci adresi — ticari unvan ve vergi numarası ortak."
      >
        Şubeler
      </IsletmeBaslik>

      <IkiKolon
        sol={
          <Bolum
            baslik="Yeni şube"
            alt="Şubenin adı, şehri ve adresi. Gerisi bu şubeden devralınıyor."
          >
            <div className="rounded-2xl border border-cizgi bg-yuzey p-5">
              <SubeBasvuruFormu />
            </div>
          </Bolum>
        }
        sag={
          <Bolum baslik={`Şubelerin · ${onayli.length} açık`}>
            <ul className="divide-y divide-cizgi border-y border-cizgi">
              {subeler.map((s) => (
                <li key={s.cafeId} className="flex items-start justify-between gap-4 py-4">
                  <span className="min-w-0">
                    <span className="block text-[15px] font-semibold">
                      {s.kafeAdi}
                      {/* Boşluk `ml-2` ile değil metinle de veriliyor: kenar
                          boşluğu görsel, ekran okuyucu ikisini bitişik
                          okuyordu ("Kafe Aşu an açık"). */}
                      {s.acikOlan && (
                        <>
                          {" "}
                          <span className="ml-1 text-[12px] font-normal text-yazi-sonuk">
                            şu an açık
                          </span>
                        </>
                      )}
                    </span>
                    {s.sehir && (
                      <span className="mt-0.5 block text-[13px] text-yazi-sonuk">{s.sehir}</span>
                    )}
                    {s.durum === "rejected" && s.redSebebi && (
                      <span className="mt-1 block text-[13px] text-tehlike">{s.redSebebi}</span>
                    )}
                  </span>
                  <Rozet
                    tur={
                      s.durum === "approved"
                        ? "onayli"
                        : s.durum === "rejected"
                          ? "red"
                          : s.durum === "suspended"
                            ? "pasif"
                            : "bekliyor"
                    }
                  >
                    {s.durum === "approved"
                      ? "açık"
                      : s.durum === "rejected"
                        ? "reddedildi"
                        : s.durum === "suspended"
                          ? "askıda"
                          : "onay bekliyor"}
                  </Rozet>
                </li>
              ))}
            </ul>

            {bekleyen.length > 0 && (
              <p className="mt-4 text-[13px] leading-relaxed text-yazi-sonuk">
                Onay bekleyen şube henüz karekod üretemez ve kupon dağıtamaz. Onaylanınca üst
                şeritteki şube seçicide belirir ve oraya geçip konumunu ve günlük bütçeni
                kurarsın.
              </p>
            )}
          </Bolum>
        }
      />
    </IsletmeSayfa>
  );
}
