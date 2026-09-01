import { kafeYoneticisiGerekli } from "@/domain/yetki";
import * as rapor from "@/domain/rapor";
import * as ayar from "@/domain/ayar";
import { bakim } from "@/domain/bakim";
import {
  IsletmeSayfa,
  IsletmeBaslik,
  Bolum,
  Rozet,
} from "@/components/isletme";
import { SayiKarti, IKON } from "@/components/gosterge";
import { DisaAktarma, TarihAraligi, AdisyonAyari } from "./kontroller";

export const dynamic = "force-dynamic";
export const metadata = { title: "Rapor · CafePlay" };

/**
 * Kafe raporu — Faz 8.
 *
 * ── Kimin okuduğu ───────────────────────────────────────────
 *
 * Bu ekranı açan kişi rapor okumayı meslek edinmiş biri değil; kafeyi
 * işleten kişi ve çoğu zaman vardiya arasında bakıyor. İlk sürümde
 * "nitelikli oyuncu", "kanıt seviyesi", "mahremiyet eşiği" gibi terimler
 * açıklamasız duruyordu — bizim iç dilimiz, onun dili değil. Her terim
 * artık yanında düz cümlesiyle geçiyor; terimi tamamen atmıyoruz çünkü
 * fatura o birimden kesiliyor (Ü29) ve kafenin faturada gördüğü kelimeyi
 * raporda da görmesi gerekiyor.
 *
 * ── Sıralama ────────────────────────────────────────────────
 *
 * En üstte **getiri** var. Abonelik yenileme anında sorulan tek soru
 * "bu bana ne kazandırdı" ve cevabı ekranın en altında aramak zorunda
 * kalmamalı. Altındaki her bölüm o sayıyı açıklıyor: kim geldi, geri
 * geldi mi, ne kadar indirim gitti, hangi saat doldu.
 *
 * ── Neyi İDDİA ETMİYORUZ ────────────────────────────────────
 *
 * Getiri bir **tahmin** ve ekran bunu saklamıyor. Sayılan şey ziyaret;
 * paraya çevirmek için kafenin kendi girdiği ortalama adisyon
 * kullanılıyor. Ölçemediğimiz şeyi (bu müşteri zaten gelecek miydi)
 * ölçmüş gibi göstermek, ilk kasa karşılaştırmasında raporun tamamının
 * güvenilirliğini götürürdü.
 *
 * ── G1 · Kişisel veri yok ───────────────────────────────────
 *
 * Ekranın hiçbir yerinde ad, soyad, telefon yok. Müşteriler kafeye özel
 * anonim kodla görünüyor ve o kod her kafede farklı — iki kafe verisini
 * birleştirip aynı kişiyi izleyemiyor.
 */
export default async function RaporSayfasi({
  searchParams,
}: {
  searchParams: Promise<{ on?: string; bas?: string; bit?: string }>;
}) {
  const o = await kafeYoneticisiGerekli();
  await bakim();
  const sp = await searchParams;
  const secim = rapor.araligiCoz(sp);
  const aralik = secim.aralik;

  const adisyonKurus = await ayar.sayiOku(
    o.cafeId,
    ayar.ANAHTARLAR.ortalamaAdisyon,
  );

  const [
    ozet,
    ziyaretler,
    masalar,
    dagilim,
    kampanyalar,
    odul,
    kullanim,
    getiri,
  ] = await Promise.all([
    rapor.ozet(o.cafeId, aralik),
    rapor.ziyaretler(o.cafeId, aralik),
    rapor.masaHareketi(o.cafeId, aralik),
    rapor.saatlikDagilim(o.cafeId, aralik),
    rapor.kampanyaSonuclari(o.cafeId, aralik),
    rapor.odulDagilimi(o.cafeId, aralik),
    rapor.kuponKullanimi(o.cafeId, aralik),
    rapor.getiri(o.cafeId, aralik, adisyonKurus),
  ]);

  // Faz 8 güvenlik kapısı: her rapor görüntüleme denetim izine düşer.
  await rapor.goruntulemeyiKaydet({
    cafeId: o.cafeId,
    aktorId: o.ozneId,
    aralik,
  });

  const saatler = dagilim.saatler;
  const enYuksekOran = Math.max(0.01, ...saatler.map((s) => s.oran));

  /**
   * Ü30: eşiğin altındaki saat `null` dönüyor.
   *
   * Bu ayrım önemli — `null` "veri yok" demek değil, "var ama gizlendi"
   * demek. İkisi karıştırılırsa rapor, üç oyunun oynandığı bir haftada
   * "bu dönemde henüz oyun oynanmadı" der ve satılan şeyin kanıtı olmaktan
   * çıkıp yanlış beyan hâline gelir.
   */
  const gizliSaatVar = saatler.some((s) => s.oyuncu === null);

  const sonGun = rapor.HAZIR_ARALIKLAR.some((h) => h.ad === secim.hazir);

  return (
    <IsletmeSayfa genis>
      <IsletmeBaslik ust="İşletme paneli" alt={secim.etiket}>
        Rapor
      </IsletmeBaslik>

      <TarihAraligi
        hazir={secim.hazir}
        bas={aralik.baslangic}
        bit={geriGun(aralik.bitis)}
        secenekler={rapor.HAZIR_ARALIKLAR}
      />

      {/* ── Getiri ─────────────────────────────────────────
          Ekranın baş sayısı. Kesin olanla tahmin olan bilerek ayrı
          kutularda: kafe bu sayıyı kendi kasa raporuyla karşılaştıracak
          ve tutmadığında hangisine güveneceğini bilmesi gerekiyor. */}
      <Bolum baslik="Bu dönemde ne kazandırdı">
        <div className="rounded-2xl border border-cizgi bg-yuzey px-5 py-6">
          <div className="etiket-caps text-yazi-sonuk">Tahmini ciro</div>
          <div className="mt-1.5 font-data text-4xl leading-none font-bold text-vurgu tabular">
            {tl(getiri.tahminiCiroKurus)}{" "}
            <span className="text-[16px]">TL</span>
          </div>
          <p className="mt-3 text-[13px] leading-relaxed text-yazi-sonuk">
            <strong className="text-yazi">{getiri.ziyaret} ziyaret</strong> ×{" "}
            {tl(getiri.ortalamaAdisyonKurus)} TL ortalama hesap. Ziyaret sayısı
            defterden geliyor, ortalama hesabı sen giriyorsun —{" "}
            <strong className="text-yazi">bu yüzden sonuç bir tahmin</strong>.
          </p>
        </div>

        {/* Ü62: rapor da panelin gösterge diline geçti — aynı kart,
            aynı ikon kutusu. İki ekran arasında geçen kafe sahibi
            aynı şeyi iki farklı biçimde okumamalı. */}
        <div className="mt-2.5 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <SayiKarti
            etiket="Ziyaret"
            deger={String(getiri.ziyaret)}
            alt="sayıldı"
            ikon={IKON.kisi}
          />
          <SayiKarti
            etiket="Verilen ürün"
            deger={String(getiri.urun)}
            alt="sayıldı"
            ikon={IKON.urun}
          />
          <SayiKarti
            etiket="İndirim gideri"
            deger={`${tl(getiri.indirimKurus)} TL`}
            alt="sayıldı"
            ikon={IKON.para}
          />
          <SayiKarti
            etiket="Fark"
            deger={`${tl(getiri.netKurus)} TL`}
            alt="tahmin − gider"
            ikon={IKON.onay}
            vurgulu={getiri.netKurus > 0}
          />
        </div>

        <div className="mt-4 rounded-xl border border-cizgi bg-cukur px-4 py-3.5">
          <AdisyonAyari mevcutTl={Math.round(adisyonKurus / 100)} />
          <p className="mt-2 text-[12px] leading-relaxed text-yazi-sonuk">
            Bu müşterilerin bir kısmı zaten gelecekti; onu ölçmenin yolu yok.
            Rakam &ldquo;CafePlay üzerinden gelen müşterinin kafede bıraktığı
            tahmini tutar&rdquo; demek, &ldquo;CafePlay olmasa hiç
            gelmezdi&rdquo; demek değil.
          </p>
        </div>
      </Bolum>

      {/* ── Baş sayı ───────────────────────────────────── */}
      <Bolum baslik="Kafene gelen müşteri">
        <div className="rounded-2xl border border-cizgi bg-yuzey px-5 py-6">
          <div className="etiket-caps text-yazi-sonuk">Sayılan ziyaret</div>
          <div className="mt-1.5 font-data text-5xl leading-none font-bold tabular">
            {ozet.nitelikliOyuncu}
          </div>
          {/* Bu sayının ziyaret olduğunu açıkça yazmak zorundayız: eski
              metin "gelen kişi, ziyaret değil" diyordu ve YANLIŞTI. Kural
              "1 nitelikli oturum / cihaz / kafe / GÜN" (S3) — aynı müşteri
              ertesi gün geldiğinde yeniden sayılıyor. Fatura bu sayıdan
              kesildiği için yanlış tanım, yanlış faturaya dönüşür. */}
          <p className="mt-3 text-[13px] leading-relaxed text-yazi-sonuk">
            Kafeye gelip{" "}
            <strong className="text-yazi">konumu doğrulanan</strong> ve oyunu{" "}
            <strong className="text-yazi">tamamlayan</strong> müşteri. Aynı
            müşteri günde bir kez sayılır — ertesi gün yine gelirse yeniden
            sayılır.
          </p>
          {ozet.tekilOyuncu > 0 && (
            <p className="mt-2 text-[13px] leading-relaxed text-yazi-sonuk">
              Bu dönemde{" "}
              <strong className="text-yazi">
                {ozet.nitelikliOyuncu} ziyaret
              </strong>
              ,{" "}
              <strong className="text-yazi">
                {ozet.tekilOyuncu} farklı kişiden
              </strong>{" "}
              geldi.
            </p>
          )}
          <p className="mt-2 text-[12px] leading-relaxed text-yazi-sonuk">
            Faturada bu satır <em>nitelikli oyuncu</em> diye geçiyor; ikisi aynı
            sayı.
          </p>
        </div>

        <div className="mt-2.5 grid grid-cols-2 gap-3 lg:grid-cols-3">
          <SayiKarti
            etiket="Gelen kişi"
            deger={String(ozet.tekilOyuncu)}
            alt="oyunu tamamlayan herkes"
            ikon={IKON.kisi}
          />
          <SayiKarti
            etiket="Oynanan oyun"
            deger={String(ozet.toplamOyun)}
            alt="aynı kişi birden çok oynayabilir"
            ikon={IKON.masa}
          />
          <SayiKarti
            etiket="Verilen kupon"
            deger={String(ozet.kuponVerilen)}
            alt="kazanıldı, kullanılmamış olabilir"
            ikon={IKON.kupon}
          />
        </div>
      </Bolum>

      {/* ── Tekrar gelen müşteri ───────────────────────────
          Ü44: raporun en önemli iki sayısı. "Kaç oyun oynandı" bir
          etkinlik ölçüsü; kafenin parasını ilgilendiren soru ise
          "gelen bir daha geliyor mu". */}
      <Bolum baslik="Tekrar gelen müşteri">
        <div className="grid gap-5 sm:grid-cols-[auto_1fr] sm:items-center">
          <Halka
            dilimler={[
              {
                etiket: "Tekrar gelen",
                deger: ozet.tekrarGelenOyuncu ?? 0,
                renk: "var(--color-vurgu)",
              },
              {
                etiket: "İlk kez gelen",
                deger: ozet.yeniOyuncu ?? 0,
                renk: "var(--color-cizgi)",
              },
            ]}
            ortaUst={String(ozet.tekilOyuncu)}
            ortaAlt="kişi"
          />

          <div className="grid gap-px overflow-hidden rounded-2xl border border-cizgi bg-cizgi">
            <div className="bg-yuzey px-5 py-4">
              <div className="etiket-caps text-yazi-sonuk">Tekrar gelen</div>
              <div className="mt-1.5 font-data text-2xl leading-none font-bold text-vurgu tabular">
                {say(ozet.tekrarGelenOyuncu)}
              </div>
              <p className="mt-1.5 text-[12px] leading-relaxed text-yazi-sonuk">
                Bu dönemde geldi, daha önce de gelmişti
              </p>
            </div>

            <div className="bg-yuzey px-5 py-4">
              <div className="etiket-caps text-yazi-sonuk">İlk kez gelen</div>
              <div className="mt-1.5 font-data text-2xl leading-none font-bold text-yazi-sonuk tabular">
                {say(ozet.yeniOyuncu)}
              </div>
              <p className="mt-1.5 text-[12px] leading-relaxed text-yazi-sonuk">
                Bu kafede ilk oyununu bu dönemde oynadı
              </p>
            </div>
          </div>
        </div>
      </Bolum>

      {/* ── İndirim ────────────────────────────────────── */}
      <Bolum baslik="İndirim">
        <div className="grid gap-px overflow-hidden rounded-2xl border border-cizgi bg-cizgi sm:grid-cols-2">
          <div className="bg-yuzey px-5 py-5">
            <div className="etiket-caps text-yazi-sonuk">Kazanılan</div>
            <div className="mt-2 font-data text-2xl leading-none font-bold text-yazi-sonuk tabular">
              {tl(ozet.kazanilanIndirimKurus)}{" "}
              <span className="text-[11px]">TL</span>
            </div>
            <p className="mt-2 text-[12px] leading-relaxed text-yazi-sonuk">
              Dağıtılan {ozet.kuponVerilen} kuponun toplam değeri.
              Kullanılmayanın maliyeti yok.
            </p>
          </div>

          <div className="bg-yuzey px-5 py-5">
            <div className="etiket-caps text-yazi-sonuk">Kasada kullanılan</div>
            <div className="mt-2 font-data text-2xl leading-none font-bold tabular">
              {tl(ozet.kullanilanIndirimKurus)}{" "}
              <span className="text-[11px]">TL</span>
            </div>
            <p className="mt-2 text-[12px] leading-relaxed text-yazi-sonuk">
              {ozet.kuponKullanilan} kupon ·{" "}
              <strong className="text-yazi">gerçekten ödediğin tutar</strong>
            </p>
          </div>
        </div>

        {odul.length > 0 && (
          <div className="mt-5 grid gap-5 sm:grid-cols-[auto_1fr] sm:items-center">
            <Halka
              dilimler={odul.map((d, i) => ({
                etiket: d.etiket,
                deger: d.kurus,
                renk: PASTA_RENKLERI[i % PASTA_RENKLERI.length],
              }))}
              ortaUst={tl(ozet.kullanilanIndirimKurus)}
              ortaAlt="TL"
            />

            <ul className="space-y-2.5">
              {odul.map((d, i) => (
                <li key={d.etiket} className="flex items-center gap-2.5">
                  <span
                    aria-hidden
                    className="size-3 shrink-0 rounded-sm"
                    style={{
                      background: PASTA_RENKLERI[i % PASTA_RENKLERI.length],
                    }}
                  />
                  <span className="flex-1 text-[14px]">{d.etiket}</span>
                  <span className="font-data text-[13px] tabular">
                    {tl(d.kurus)} TL
                    <span className="ml-2 text-yazi-sonuk">{d.adet} adet</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </Bolum>

      {/* ── Saatlik ──────────────────────────────────────
          Sayı değil oran: "saat 15'te 4 oyuncu" cümlesi kafenin kaç
          masası olduğu bilinmeden bir şey söylemiyor. */}
      <Bolum baslik="Hangi saat doluyor">
        {rapor.donemBos(saatler) ? (
          <p className="text-[14px] text-yazi-sonuk">
            Bu dönemde henüz oyun oynanmadı.
          </p>
        ) : (
          <>
            <p className="mb-3.5 text-[13px] leading-relaxed text-yazi-sonuk">
              Doluluk oranı = o saatte CafePlay ile dolan masa ÷{" "}
              <strong className="text-yazi">
                {dagilim.masaSayisi} masa × {dagilim.gunSayisi} gün
              </strong>
              . Oyun oynamadan oturan müşteri bu orana girmiyor — bu, kafenin
              doluluğu değil, CafePlay üzerinden dolan masa oranı.
            </p>

            <ul className="flex flex-col gap-1">
              {saatler
                .filter((s) => s.oyuncu !== 0)
                .map((s) => (
                  <li key={s.saat} className="flex items-center gap-3">
                    <span className="w-12 font-data text-[11px] text-yazi-sonuk tabular">
                      {String(s.saat).padStart(2, "0")}:00
                    </span>
                    <span className="h-3.5 flex-1 overflow-hidden rounded-sm bg-cukur">
                      <span
                        className="block h-full rounded-sm bg-vurgu"
                        style={{ width: `${(s.oran / enYuksekOran) * 100}%` }}
                      />
                    </span>
                    <span className="w-11 text-right font-data text-[12px] font-semibold tabular">
                      %{Math.round(s.oran * 100)}
                    </span>
                    <span className="w-14 text-right font-data text-[11px] text-yazi-sonuk tabular">
                      {say(s.oyuncu)} kişi
                    </span>
                  </li>
                ))}
            </ul>

            {gizliSaatVar && (
              <p className="mt-3 text-[12px] leading-relaxed text-yazi-sonuk">
                {`<${rapor.GIZLEME_ESIGI}`} yazan saatlerde müşteri var ama
                sayısı gizlilik eşiğinin altında kaldığı için tam sayı
                gösterilmiyor. Doluluk oranı ve toplamlar bundan etkilenmiyor.
              </p>
            )}
          </>
        )}
      </Bolum>

      {/* ── Masa ───────────────────────────────────────── */}
      <Bolum baslik="Masa hareketi">
        {masalar.length === 0 ? (
          <p className="text-[14px] text-yazi-sonuk">
            Henüz masa hareketi yok.
          </p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {masalar.map((m) => (
              <li key={m.masa} className="flex items-center gap-3">
                <span className="w-20 shrink-0 truncate text-[14px] font-semibold">
                  {m.masa}
                </span>
                <span className="h-3.5 flex-1 overflow-hidden rounded-sm bg-cukur">
                  <span
                    className="block h-full rounded-sm bg-yazi"
                    style={{
                      width: `${(m.oyun / Math.max(1, masalar[0].oyun)) * 100}%`,
                    }}
                  />
                </span>
                <span className="w-28 text-right font-data text-[11px] text-yazi-sonuk tabular">
                  {say(m.oyuncu)} kişi · {m.oyun} oyun
                </span>
              </li>
            ))}
          </ul>
        )}
      </Bolum>

      {/* ── Kampanya ───────────────────────────────────── */}
      {kampanyalar.length > 0 && (
        <Bolum baslik="Kampanya sonuçları">
          <ul className="divide-y divide-cizgi border-y border-cizgi">
            {kampanyalar.map((k, i) => (
              <li key={`${k.urunAdi}-${i}`} className="py-3.5">
                <div className="flex items-center gap-3">
                  <span className="flex-1 text-[15px] font-semibold">
                    {k.urunAdi} · %{k.yuzde}
                  </span>
                  {k.durum === "active" ? (
                    <Rozet tur="onayli">yayında</Rozet>
                  ) : (
                    <Rozet tur="pasif">
                      {k.durum === "ended" ? "bitti" : k.durum}
                    </Rozet>
                  )}
                </div>
                <div className="mt-1 font-data text-[12px] text-yazi-sonuk tabular">
                  {k.verilen} verildi · {k.kullanilan} kullanıldı ·{" "}
                  {tl(k.kullanilanKurus)} TL
                </div>
              </li>
            ))}
          </ul>
        </Bolum>
      )}

      {/* ── Kim ne kullandı ────────────────────────────── */}
      {kullanim.length > 0 && (
        <Bolum baslik="Kim kaç kupon kullandı">
          <ul className="divide-y divide-cizgi border-y border-cizgi">
            {kullanim.map((k) => (
              <li key={k.kod} className="flex items-center gap-4 py-2.5">
                <span className="font-data text-[13px]">{k.kod}</span>
                <span className="flex-1 text-right font-data text-[12px] text-yazi-sonuk tabular">
                  son:{" "}
                  {k.sonKullanim.toLocaleDateString("tr-TR", {
                    day: "numeric",
                    month: "short",
                  })}
                </span>
                <span className="w-16 text-right font-data text-[13px] font-semibold tabular">
                  {k.adet} kupon
                </span>
                <span className="w-20 text-right font-data text-[13px] tabular">
                  {tl(k.kurus)} TL
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-[12px] leading-relaxed text-yazi-sonuk">
            En çok kullanandan aza doğru. Aynı kodun çok sayıda kuponu, sadık
            müşteri de olabilir suistimal de — kod üstünden doğrulama defterine
            bakabilirsin.
          </p>
        </Bolum>
      )}

      {/* ── Doğrulama defteri ──────────────────────────── */}
      <Bolum
        baslik="Doğrulama defteri"
        alt="Sayımızı satır satır denetleyebilirsin. Denetlenemeyen bir sayı, iddiadan ibarettir."
      >
        {ziyaretler.length === 0 ? (
          <p className="text-[14px] text-yazi-sonuk">Bu dönemde kayıt yok.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="etiket-caps border-b border-cizgi text-left text-[10px] text-yazi-sonuk">
                  <th className="py-2 pr-4">Müşteri</th>
                  <th className="py-2 pr-4">Zaman</th>
                  <th className="py-2 pr-4">Masa</th>
                  <th className="py-2 pr-4">Sayıldı mı</th>
                  <th className="py-2">Oyun</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cizgi">
                {ziyaretler.map((z, i) => (
                  <tr key={`${z.kod}-${i}`}>
                    <td className="py-2 pr-4 font-data">{z.kod}</td>
                    <td className="py-2 pr-4 text-yazi-sonuk tabular">
                      {z.zaman.toLocaleString("tr-TR", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="py-2 pr-4 text-yazi-sonuk">
                      {z.masa ?? "—"}
                    </td>
                    <td className="py-2 pr-4">
                      {z.nitelikli ? (
                        <Rozet tur="onayli">sayıldı</Rozet>
                      ) : (
                        <span className="text-[12px] text-yazi-sonuk">
                          {kanitCumlesi(z.kanitSeviyesi)}
                        </span>
                      )}
                    </td>
                    <td className="py-2 font-data tabular">{z.oyunSayisi}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <p className="mt-4 text-[12px] leading-relaxed text-yazi-sonuk">
          Müşteriler işletmene özel anonim kodla görünür. Ad, soyad ve telefon
          CafePlay&apos;de kalır, hiçbir ekranda gösterilmez.
        </p>
      </Bolum>

      <Bolum baslik="Dışa aktar">
        <DisaAktarma
          sorgu={sp}
          dosyaAdi={
            sonGun
              ? `${secim.hazir}-gun`
              : `${aralik.baslangic}_${geriGun(aralik.bitis)}`
          }
        />
      </Bolum>
    </IsletmeSayfa>
  );
}

/* ── Parçalar ──────────────────────────────────────────── */

/**
 * Daire grafiğin renkleri.
 *
 * Palet disiplini bozulmuyor: yeni renk tanımlanmadı, mevcut dört jeton
 * sırayla kullanılıyor. Beşinci dilim gelirse başa dönüyor — grafik
 * okunmaz olur ama uydurma renk üretmekten iyi; dört ödül tipi var ve
 * beşincisi olduğunda paleti bilerek genişletmemiz gerekecek.
 */
const PASTA_RENKLERI = [
  "var(--color-vurgu)",
  "var(--color-odul)",
  "var(--color-yazi)",
  "var(--color-yazi-sonuk)",
];

/**
 * Halka (donut) grafik.
 *
 * Kütüphane yok: tek bir SVG çemberi ve `stroke-dasharray` yetiyor. Grafik
 * için istemciye JavaScript göndermek, bu ekranın kazandıracağından fazlasını
 * götürürdü.
 *
 * Ekran okuyucu için grafik `aria-hidden`: aynı sayılar yanındaki listede
 * zaten metin olarak duruyor, ikinci kez okunması gürültü olur.
 */
function Halka({
  dilimler,
  ortaUst,
  ortaAlt,
}: {
  dilimler: { etiket: string; deger: number; renk: string }[];
  ortaUst: string;
  ortaAlt: string;
}) {
  const toplam = dilimler.reduce((t, d) => t + d.deger, 0);
  const R = 52;
  const CEVRE = 2 * Math.PI * R;

  let birikim = 0;

  return (
    <div className="relative mx-auto size-[136px] shrink-0 sm:mx-0">
      <svg viewBox="0 0 128 128" className="size-full -rotate-90" aria-hidden>
        <circle
          cx="64"
          cy="64"
          r={R}
          fill="none"
          stroke="var(--color-cukur)"
          strokeWidth="18"
        />
        {toplam > 0 &&
          dilimler.map((d) => {
            const pay = (d.deger / toplam) * CEVRE;
            const offset = birikim;
            birikim += pay;
            return (
              <circle
                key={d.etiket}
                cx="64"
                cy="64"
                r={R}
                fill="none"
                stroke={d.renk}
                strokeWidth="18"
                strokeDasharray={`${pay} ${CEVRE - pay}`}
                strokeDashoffset={-offset}
              />
            );
          })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-data text-xl leading-none font-bold tabular">
          {ortaUst}
        </span>
        <span className="etiket-caps mt-1 text-[10px] text-yazi-sonuk">
          {ortaAlt}
        </span>
      </div>
    </div>
  );
}

function tl(kurus: number): string {
  return (kurus / 100).toLocaleString("tr-TR", { maximumFractionDigits: 0 });
}

/** Ü30: gizlenen sayı `<5` olarak gösterilir. */
function say(n: number | null): string {
  return n === null ? `<${rapor.GIZLEME_ESIGI}` : String(n);
}

/** Yarı açık aralığın bitişini, ekranda gösterilecek son güne çevirir. */
function geriGun(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

/** E6'nın kademesini kafenin diliyle anlatır — "K2" kimseye bir şey söylemez. */
function kanitCumlesi(seviye: number): string {
  if (seviye >= 4) return "fiş kodu girdi";
  if (seviye === 3) return "masada 5 dk kaldı";
  if (seviye === 2) return "konumu doğrulandı";
  return "karekod okuttu";
}
