import { platformGerekli } from "@/domain/yetki";
import { basiliKodlar, hedefKafeler } from "@/domain/qr";
import { IsletmeSayfa, IsletmeBaslik, IsletmeUyari, Rozet } from "@/components/isletme";
import { PlatformGezinme } from "../gezinme";
import { YonlendirmeDegistir } from "./kontroller";

export const dynamic = "force-dynamic";
export const metadata = { title: "Karekodlar · Looply" };

/**
 * Basılı karekodların yönlendirmesi — Ü266 (Ü267'de yeniden kuruldu).
 *
 * Ürün sahibi: *"301 redirect için admin paneline kısayol ekle, biz
 * oradan hangi kafenin karekodunun yönlendirmesini değiştireceğimize
 * tek tuşla bakabilelim."*
 *
 * ⚠️ **Basılı kâğıt değişmiyor.** Toptan basılan karekodlar aynen
 * kalıyor; değişen tek şey o kodun hangi kafeye düştüğü. Kural ve
 * gerekçesi `domain/qr.ts` içinde, "Basılı kodun yönlendirmesi".
 */
export default async function Karekodlar() {
  const o = await platformGerekli();
  const admin = o.rol === "platform_admin";
  const [kodlar, hedefler] = await Promise.all([basiliKodlar(), hedefKafeler()]);

  return (
    <IsletmeSayfa genis>
      <IsletmeBaslik
        ust={admin ? "Platform · yönetici" : "Platform · destek"}
        alt="Basılı kâğıt değişmez — değişen, kodun hangi kafeye gittiğidir."
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
          Henüz basılı koda bağlı masa yok. Kafe panelinden karekod açılınca burada
          görünür.
        </IsletmeUyari>
      ) : (
        <table className="w-full border-collapse text-[14px]">
          <thead>
            <tr className="border-b border-cizgi text-left text-yazi-sonuk">
              <th className="py-2 font-normal">Basılı kod</th>
              <th className="py-2 font-normal">Şu an gittiği kafe</th>
              <th className="py-2 font-normal">Kullanım</th>
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
                  {/*
                    Ü272 — ürün sahibi: "taşınınca eski ve yeni olarak ayrı
                    ayrı tutulsun." Taşınmış kodda iki satır: şu anki
                    kafedeki (yeni) ve önceki kafelerdeki (eski) okutmalar.
                    Hiç taşınmamış kodda tek satır, eskisi gibi.
                  */}
                  {k.eski.length === 0 ? (
                    k.kullanim === 0 ? (
                      "hiç okutulmadı"
                    ) : (
                      <>
                        {k.kullanim.toLocaleString("tr-TR")} oturum
                        {k.sonKullanim && (
                          <span className="block">
                            son:{" "}
                            {k.sonKullanim.toLocaleDateString("tr-TR", {
                              day: "numeric",
                              month: "short",
                            })}
                          </span>
                        )}
                      </>
                    )
                  ) : (
                    <>
                      <span className="block">
                        <strong className="text-yazi">Yeni</strong> ·{" "}
                        {k.yeni === 0 ? "henüz okutulmadı" : `${k.yeni.toLocaleString("tr-TR")} oturum`}
                        {k.gelis && (
                          <span className="block text-[12px]">
                            {k.cafeAdi}, {k.gelis.toLocaleString("tr-TR", {
                              day: "numeric",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                              // Canlı sunucu UTC'de koşabilir; saat kafenin saati olmalı.
                              timeZone: "Europe/Istanbul",
                            })}{" "}
                            itibarıyla
                          </span>
                        )}
                      </span>
                      <span className="mt-1.5 block">
                        <strong className="text-yazi">Eski</strong> ·{" "}
                        {k.eski
                          .map((d) => `${d.cafeAdi} ${d.oturum.toLocaleString("tr-TR")}`)
                          .join(" · ")}
                      </span>
                    </>
                  )}
                </td>
                <td className="py-3">
                  {admin && (
                    <YonlendirmeDegistir
                      kod={k.kod}
                      kaynakCafeId={k.cafeId}
                      hedefler={hedefler}
                    />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <p className="mt-6 text-[13px] text-yazi-sonuk">
        Hedef kafenin kendi kodu <strong>hiç okutulmamışsa</strong> basılı kod onun
        yerine geçer. Okutulmuşsa taşıma yapılmaz — o kod bir duvarda asılı, yerine
        başka kod geçerse o kâğıt sessizce çalışmaz olur. Taşınmış bir kodun{" "}
        <strong>önceki kafelerdeki</strong> okutmaları da sayılır.
      </p>
    </IsletmeSayfa>
  );
}
