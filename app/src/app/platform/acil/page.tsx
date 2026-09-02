import { platformGerekli } from "@/domain/yetki";
import { durum, kafeler, ANAHTARLAR } from "@/domain/acil";
import { IsletmeSayfa, IsletmeBaslik, IsletmeUyari, Bolum } from "@/components/isletme";
import { AnahtarDugmesi, KafeKontrolu, OturumKontrolu } from "./kontroller";

export const dynamic = "force-dynamic";
export const metadata = { title: "Acil durdurma · Looply" };

/**
 * Acil durdurma — G18.
 *
 * "Bir sorun anlaşıldığında ilk yapılacak şey hasarı durdurmaktır. Bunun
 * tasarlanmış bir yeteneği olmalı — o an kod yazılarak yapılamaz."
 *
 * Ekran bilerek sade ve tek sayfa: olay anında sekme aramak, menü gezmek
 * ya da doğru sayfayı hatırlamaya çalışmak istemiyoruz. Dört düğme, hepsi
 * burada, hepsi geri alınabilir, hepsi denetim izine düşüyor.
 */
export default async function AcilDurdurma() {
  const o = await platformGerekli();
  const admin = o.rol === "platform_admin";

  const [d, liste] = await Promise.all([durum(), kafeler()]);
  const acikDurdurma = d.kuponDurduruldu || d.smsDurduruldu || d.oyunDurduruldu;

  return (
    <IsletmeSayfa genis>
      <IsletmeBaslik
        ust="Platform · acil durdurma"
        alt="Dördü de geri alınabilir ve her kullanım denetim izine düşer."
      >
        Hasarı durdur
      </IsletmeBaslik>

      {!admin && (
        <div className="mb-7">
          <IsletmeUyari tur="bekle">
            Destek rolündesin: durumu görebilirsin ama durdurma yapamazsın. Acil durdurma yetkisi
            yalnızca yöneticidedir (G9).
          </IsletmeUyari>
        </div>
      )}

      {acikDurdurma && (
        <div className="mb-7">
          <IsletmeUyari>
            Şu an açık bir durdurma var. Sistem yarı kapalı çalışıyor — sorun çözüldüyse geri
            açmayı unutma.
          </IsletmeUyari>
        </div>
      )}

      {d.askidakiKafe > 0 && (
        <div className="mb-7">
          <IsletmeUyari tur="bekle">
            {d.askidakiKafe} kafe askıda. Askıdaki kafede karekod çözülmüyor, panel açılmıyor,
            kupon üretilmiyor.
          </IsletmeUyari>
        </div>
      )}

      <Bolum
        baslik="Akış durdurma"
        alt="Mevcut kayıtlara dokunmaz; yalnızca yeni işlem üretimini keser."
      >
        <div className="flex flex-col gap-3">
          <AnahtarDugmesi
            anahtar={ANAHTARLAR.kupon}
            baslik="Kupon dağıtımını durdur"
            aciklama="Dağıtılmış kuponlar kasada kullanılmaya devam eder, yenisi üretilmez. Bütçe sızıntısı şüphesinde ilk düğme bu."
            durduruldu={d.kuponDurduruldu}
          />
          <AnahtarDugmesi
            anahtar={ANAHTARLAR.sms}
            baslik="SMS'i durdur"
            aciklama="Kayıt ve giriş durur; maliyet saldırısı kesilir. G14'ün elle çekilen freni."
            durduruldu={d.smsDurduruldu}
          />
          <AnahtarDugmesi
            anahtar={ANAHTARLAR.oyun}
            baslik="Oyunu durdur"
            aciklama="Yeni oyun oturumu açılmaz. Skor doğrulamasında açık bulunduğunda kazanım üretimini keser."
            durduruldu={d.oyunDurduruldu}
          />
        </div>
      </Bolum>

      <Bolum
        baslik="Kafeyi askıya al"
        alt="O kafede karekod, kupon ve panel — hepsi durur. Diğer kafeler etkilenmez."
      >
        {admin ? (
          <KafeKontrolu kafeler={liste} />
        ) : (
          <p className="text-[13px] text-yazi-sonuk">Yönetici yetkisi gerekiyor.</p>
        )}
      </Bolum>

      <Bolum
        baslik="Tüm oturumları iptal et"
        alt="Çalınan cihaz, sızdırılmış çerez, ayrılan personel — herkes çıkar."
      >
        {admin ? (
          <OturumKontrolu acikOturum={d.acikOturum} />
        ) : (
          <p className="text-[13px] text-yazi-sonuk">Yönetici yetkisi gerekiyor.</p>
        )}
      </Bolum>

      <p className="mt-4 border-l-2 border-cizgi pl-4 text-[13px] leading-relaxed text-yazi-sonuk">
        Bu ekran hasarı durdurur, olayı çözmez. Durdurduktan sonraki adımlar{" "}
        <code className="font-data text-[12px]">docs/10-olay-mudahale-plani.md</code> içinde:
        kim haber alır, kapsam nasıl belirlenir, Kurul&apos;a bildirimi kim yapar. KVKK bildirim
        süresi 72 saat.
      </p>
    </IsletmeSayfa>
  );
}
