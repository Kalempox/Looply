import { headers } from "next/headers";
import Link from "next/link";
import { kafeYoneticisiGerekli } from "@/domain/yetki";
import * as masaYonetim from "@/domain/masa-yonetim";
import { IsletmeSayfa, IsletmeBaslik, Bolum } from "@/components/isletme";
import { Karekod } from "@/components/karekod";
import { istektenTabanAdres } from "@/lib/karekod-adresi";

export const dynamic = "force-dynamic";
export const metadata = { title: "Karekod · Looply" };

/**
 * Kafenin karekodu — Ü127.
 *
 * ── Ne değişti ──────────────────────────────────────────────
 *
 * Burası "Masa karekodları" idi: kafe masa ekliyor, adlandırıyor, dört
 * türe ayırıyor (masa/kasa/menü/fiş), açıp kapatıyor ve hepsini toplu
 * basıyordu. Ürün sahibi kavramı kaldırdı — *"her kafe için 1 qr."*
 *
 * Geriye tek bir iş kaldı: **karekodu göster, bastır.** Ekle/sil/kapat
 * yok, tür yok, liste yok. Kafenin burada verebileceği hiçbir karar
 * kalmadığı için ekran da karar sormuyor.
 *
 * ── Kod niye gösteriliyor ───────────────────────────────────
 *
 * Karekodun altındaki 16 hane, kamerası çalışmayan telefon için yedek
 * yol. Gizli değil — okutmayı K2 (konum) koruyor, kodun kendisi değil.
 */
export default async function KarekodSayfasi() {
  const o = await kafeYoneticisiGerekli();
  const [karekod, h] = await Promise.all([masaYonetim.kafeKarekodu(o.cafeId), headers()]);

  // 🔴 Ü270: adres `localhost` taşımasın — telefonda "localhost"
  // telefonun kendisi. Kural `lib/karekod-adresi.ts`te.
  const adres = `${istektenTabanAdres(h)}/m/${karekod.kod}`;

  return (
    <IsletmeSayfa>
      <IsletmeBaslik
        ust="İşletme paneli"
        alt="Kafenin tek karekodu. Bastır, müşterinin göreceği bir yere as."
      >
        Karekod
      </IsletmeBaslik>

      <Bolum baslik={karekod.ad}>
        <div className="rounded-2xl border border-cizgi bg-yuzey p-6 text-center">
          {/* Karekodun kendi beyaz sessiz alanı — zemin beyaz olsa bile
              okuyucunun kenarı bulabilmesi için. */}
          <div className="mx-auto w-fit bg-white p-5">
            {/* Ü246: panel önizlemesi basılacak şeyin AYNISI olmalı —
                yoksa kafe ekranda başka, kâğıtta başka bir kod görür. */}
            <Karekod deger={adres} boyut={190} etiket={`${karekod.ad} karekodu`} isaret />
          </div>

          <p className="mt-5 text-[14px] leading-relaxed text-yazi-sonuk">
            Müşteri okutur, oynar, kazandığı indirimi kasanda kullanır.
          </p>

          <div className="mt-5 border-t border-cizgi pt-5">
            <div className="etiket-caps text-[10px] text-yazi-sonuk">Kamera çalışmazsa</div>
            <div className="mt-1 font-data text-[15px] tracking-wider tabular">{karekod.kod}</div>
          </div>

          <Link
            href="/kafe/panel/karekod/yazdir"
            className="mt-6 inline-block rounded-lg bg-vurgu px-5 py-3 font-display text-[15px] font-bold text-white"
          >
            Yazdır
          </Link>
        </div>

        <p className="mt-5 text-[13px] leading-relaxed text-yazi-sonuk">
          Karekod kafeye özel ve değişmiyor — bir kez bastırman yeterli. Okutan kişinin ödül
          kazanabilmesi için kafenin konumunun girili olması gerekiyor; konum yoksa panelin ana
          ekranında uyarı çıkar.
        </p>
      </Bolum>
    </IsletmeSayfa>
  );
}
