"use client";

import { useState } from "react";

/**
 * Çift yönlü müşteri değeri simülasyonu — Ü134.
 *
 * ── Neyi gösteriyor ─────────────────────────────────────────
 *
 * Bir müşterinin iki ayrı yoldan değer yaratmasını **aynı anda**:
 * kendisi tekrar gelerek, ve yanında yeni müşteri getirerek. Üç oran
 * sırayla uygulanıyor; işletmeci kendi rakamlarını yazıp senaryoyu
 * kendi kafesine göre görüyor.
 *
 * ── 🔴 Kupon değeri neden 5 TL DEĞİL ────────────────────────
 *
 * Gelen tasarımda varsayılan kupon 5 TL idi ve sonuç `+5.583 TL`
 * çıkıyordu. **Üründe 5 TL'lik kupon üretilemiyor:** Ü52 ödül aralığını
 * 25–50 TL'ye sabitledi ve kural hem uygulamada hem veritabanında
 * (`odul_degeri_basamakli`). Vitrinde ürünün veremeyeceği bir sayıyı
 * göstermek, sahada işletmenin güvenini bir kez kırıyor — "katılım
 * ücretsiz" cümlesi tam da bu yüzden kaldırılmıştı.
 *
 * Bu yüzden girdi ürünün kendi aralığına bağlandı (`ODUL_EN_AZ` …
 * `ODUL_EN_COK`) ve varsayılan **25 TL**.
 *
 * ── 🔴 Düzeltilen asimetri — DÖRDÜNCÜ oran ──────────────────
 *
 * İlk tasarımda net katkı, kupon maliyetini **bütün düzenli ziyaretlere**
 * yazıyor ama geliri yalnızca **yeni müşteriden** sayıyordu. Gerekçesi
 * *"mevcut müşteri zaten gelirdi"* idi — ama o zaman kuponu da almazdı.
 * Muhafazakârlık tek yönlü uygulanınca ürün olduğundan kötü görünüyordu:
 * gerçek kupon değerinde (25 TL) sonuç **negatife** dönüyordu.
 *
 * Ürün sahibinin kararı: *"mevcut müşteri gelirinin bir kısmını say."*
 * Bu yüzden dördüncü bir oran var — **artım oranı**: düzenli ziyaretlerin
 * ne kadarı Looply olmasa **gerçekleşmeyecekti**. Yalnızca o kısım gelire
 * yazılıyor; kalanı hâlâ sayılmıyor.
 *
 * ⚠️ Artım oranı bir tahmin ve öyle etiketleniyor. %100 yazılamaz:
 * "bütün ziyaretler bizim sayemizde" demek olurdu ve bu bir simülasyon
 * değil bir iddia olurdu. Üst sınır %50.
 *
 * ── Başa baş noktası neden en önemli sayı ───────────────────
 *
 * Ekranda net katkıdan **önce** başa baş oranı duruyor: "mevcut
 * ziyaretlerin yalnızca %4,7'si fazladan olsa bile masraf çıkıyor."
 * İşletmeci artım oranını bilemez — ama %4,7'nin düşük bir eşik olduğunu
 * bilir. Tahmini bir sayıyı savunmaktansa eşiğin ne kadar alçak olduğunu
 * göstermek hem daha dürüst hem daha ikna edici.
 */

/* ── Ürünün kendi sınırları ────────────────────────────────── */

/** Ü52: ödül 25–50 TL. Vitrin bu aralığın dışına çıkamaz. */
const KUPON_EN_AZ = 25;
const KUPON_EN_COK = 50;

/**
 * Bir ay kaç hafta — 52/12.
 *
 * "Haftada 1 ziyaret" hedefi aya çevrilirken 4 değil bu sayı
 * kullanılıyor: 4 alsaydık yılda 48 hafta sayardık ve bütün model
 * sistematik olarak %8 düşük çıkardı.
 */
const HAFTA_AY = 52 / 12;

/**
 * ⚠️ Aylık sistem maliyeti — **bu bir fiyat açıklamasıdır.**
 *
 * Vitrinde görünen her sayı bir taahhüt. Bu rakam değişecekse tek yer
 * burası; ama değiştirmek fiyat değiştirmek demek ve o bir iş kararı.
 */
const SISTEM_MALIYETI = 2000;

const ORANLAR_1 = [10, 20, 30, 40, 50];
const ORANLAR_2 = [50, 75, 100];
const ORANLAR_3 = [5, 10, 15, 20, 30];
const ORANLAR_4 = [10, 20, 30, 40];

/** Artım oranının tavanı — %100 "hepsi bizim sayemizde" iddiası olurdu. */
const ARTIM_EN_COK = 50;

function tl(n: number): string {
  return Math.round(n).toLocaleString("tr-TR");
}

function sayi(n: number): string {
  return Math.round(n).toLocaleString("tr-TR");
}

export function CiftYonluSimulasyon() {
  const [haftalik, setHaftalik] = useState(500);
  const [harcama, setHarcama] = useState(150);
  const [kupon, setKupon] = useState(KUPON_EN_AZ);

  const [gelmeOrani, setGelmeOrani] = useState(20);
  const [ziyaretOrani, setZiyaretOrani] = useState(100);
  const [arkadasOrani, setArkadasOrani] = useState(15);
  const [artimOrani, setArtimOrani] = useState(20);

  /*
    ⚠️ Hesap **tam duyarlıkla** yapılıyor, yuvarlama yalnızca ekranda.
    Ara adımda yuvarlasaydık 433,33 → 433 olur ve sonraki bütün satırlar
    kayardı: 433 × 150 = 64.950 ama 433,33 × 150 = 65.000. Ekranda
    "433 ziyaret × 150 TL = 65.000 TL" yazarken aritmetik tutmalı.
  */
  const duzenliZiyaret = haftalik * HAFTA_AY * (gelmeOrani / 100) * (ziyaretOrani / 100);
  const arkadasZiyaret = duzenliZiyaret * (arkadasOrani / 100);

  const mevcutSatis = duzenliZiyaret * harcama;
  const yeniSatis = arkadasZiyaret * harcama;
  const kuponMaliyeti = duzenliZiyaret * kupon;

  /*
    Artım: düzenli ziyaretlerin Looply olmasa gerçekleşmeyecek kısmı.
    Yalnızca bu kısım gelire yazılıyor — kalanı hâlâ sayılmıyor.
  */
  const artimZiyaret = duzenliZiyaret * (artimOrani / 100);
  const artimSatis = artimZiyaret * harcama;

  const netKatki = artimSatis + yeniSatis - kuponMaliyeti - SISTEM_MALIYETI;

  /*
    Başa baş: net katkı sıfırken artım oranı kaç olmalı?

      artım × mevcutSatış + yeniSatış − kupon − sistem = 0
      artım = (kupon + sistem − yeniSatış) / mevcutSatış

    ⚠️ Eksi çıkabilir: yeni müşteri satışı tek başına bütün masrafı
    karşılıyorsa mevcut müşteriden hiç artım gerekmiyor. O durumda
    ekran "artım olmasa bile kârda" diyor, eksi bir yüzde göstermiyor.

    ⚠️ Payda sıfır olabilir (oran %0 seçilirse) — `null` dönüyor ve
    ekran başa baş satırını hiç çizmiyor.
  */
  const basaBas =
    mevcutSatis > 0
      ? ((kuponMaliyeti + SISTEM_MALIYETI - yeniSatis) / mevcutSatis) * 100
      : null;

  const hedefKitle = haftalik * (gelmeOrani / 100);
  const aylikZiyaret = HAFTA_AY * (ziyaretOrani / 100);

  return (
    <div className="overflow-hidden rounded-3xl border border-cizgi bg-yuzey">
      {/* ── Başlık ──────────────────────────────── */}
      <div className="border-b border-cizgi bg-odul-zemin/50 px-6 py-8 sm:px-9">
        <p className="etiket-caps text-[10px] text-yazi-sonuk">Çift yönlü müşteri değeri</p>
        <h3 className="mt-3 max-w-2xl font-display text-[clamp(24px,3.6vw,38px)] leading-[1.08] font-extrabold tracking-[-0.03em]">
          Müşterin hem düzenli gelse hem arkadaşını getirse ne olur?
        </h3>
        <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-yazi-sonuk">
          Üç davranışı ayrı ayrı seç: müşterinin kendi gelme oranı, kuponun
          geçerli olduğu 7 gün içinde gelme oranı ve arkadaşını getirme oranı.
          Kendi rakamlarını yaz, senaryoyu kafende gör.
        </p>
      </div>

      <div className="px-6 py-8 sm:px-9">
        {/* ── İşletmenin verileri ───────────────── */}
        <p className="etiket-caps text-[10px] text-yazi-sonuk">İşletmenin verileri</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Girdi
            etiket="Haftalık benzersiz müşteri"
            alt="Haftada ortalama kaç farklı müşteri geliyor?"
            deger={haftalik}
            yaz={setHaftalik}
            enAz={10}
            enCok={100000}
          />
          <Girdi
            etiket="Ortalama harcama (TL)"
            alt="Müşteri başına ortalama ziyaret harcaması"
            deger={harcama}
            yaz={setHarcama}
            enAz={10}
            enCok={5000}
          />
        </div>

        {/* ── Üç oran ───────────────────────────── */}
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <OranKutusu
            sira="1"
            baslik="Kendi gelme oranı"
            soru="Haftalık müşteri kitlenin ne kadarı düzenli gelmeyi hedefliyor?"
            deger={gelmeOrani}
            yaz={setGelmeOrani}
            secenekler={ORANLAR_1}
            renk="para"
            hesap={`${sayi(haftalik)} × %${gelmeOrani} = ${sayi(hedefKitle)} müşteri`}
          />
          <OranKutusu
            sira="2"
            baslik="7 gün içinde ziyaret oranı"
            soru="Kuponun geçerli olduğu 7 günlük dönemde gerçekten gelme oranı."
            deger={ziyaretOrani}
            yaz={setZiyaretOrani}
            secenekler={ORANLAR_2}
            renk="vurgu"
            hesap={`1 kez / 7 gün × %${ziyaretOrani} ≈ ${aylikZiyaret.toLocaleString("tr-TR", { maximumFractionDigits: 2 })} ziyaret / ay`}
          />
          <OranKutusu
            sira="3"
            baslik="Arkadaşını getirme oranı"
            soru="Düzenli gelen müşterilerin ne kadarı yanında yeni müşteri getiriyor?"
            deger={arkadasOrani}
            yaz={setArkadasOrani}
            secenekler={ORANLAR_3}
            renk="urun"
            hesap={`${sayi(duzenliZiyaret)} × %${arkadasOrani} ≈ ${sayi(arkadasZiyaret)} yeni ziyaret`}
          />
          {/*
            4. oran — Ü134'ün düzelttiği asimetri.

            İlk üç oran "kaç ziyaret olur" sorusunu cevaplıyor; bu
            "bunların kaçı fazladan" sorusunu. Olmadığında kupon
            maliyeti bütün ziyaretlere yazılıp gelir hiç sayılmıyordu.
          */}
          <OranKutusu
            sira="4"
            baslik="Artım oranı"
            soru="Bu ziyaretlerin ne kadarı Looply olmasa gerçekleşmezdi?"
            deger={artimOrani}
            yaz={setArtimOrani}
            secenekler={ORANLAR_4}
            renk="kampanya"
            enCok={ARTIM_EN_COK}
            hesap={`${sayi(duzenliZiyaret)} × %${artimOrani} ≈ ${sayi(artimZiyaret)} fazladan ziyaret`}
          />
        </div>

        {/* ── Akış ──────────────────────────────── */}
        <div className="mt-5 rounded-2xl border border-cizgi bg-cukur px-5 py-5">
          <p className="text-[15px] font-semibold">Simülasyonun akışı</p>
          <p className="mt-1 text-[13px] leading-relaxed text-yazi-sonuk">
            Üç oran sırayla uygulanıyor. Arkadaşını getirme oranı yalnızca
            gerçekleşen düzenli ziyaretlerin üzerine biniyor.
          </p>
          <div className="mt-4 grid items-stretch gap-3 sm:grid-cols-[1fr_auto_1fr_auto_1fr]">
            <Adim buyuk={sayi(hedefKitle)} alt="Müşteri düzenli gelmeyi hedefliyor." />
            <Ok />
            <Adim buyuk={sayi(duzenliZiyaret)} alt="Aylık kuponlu ziyaret gerçekleşiyor." />
            <Ok />
            <Adim buyuk={`+${sayi(arkadasZiyaret)}`} alt="Yanında yeni müşteri getiriyor." vurgulu />
          </div>
        </div>

        {/* ── Sonuç ─────────────────────────────── */}
        <p className="mt-8 etiket-caps text-[10px] text-yazi-sonuk">Aylık simülasyon sonucu</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Sonuc ust="Mevcut müşteri" etiket="Düzenli ziyaret" deger={sayi(duzenliZiyaret)} alt="hedeflenen" renk="text-para" />
          <Sonuc ust="Yeni müşteri" etiket="Arkadaş ziyareti" deger={`+${sayi(arkadasZiyaret)}`} alt="gerçek ek ziyaret" renk="text-urun" />
          <Sonuc ust="Toplam" etiket="Ziyaret hacmi" deger={sayi(duzenliZiyaret + arkadasZiyaret)} alt="düzenli + yeni" />
          <Sonuc ust="Mevcut müşteri" etiket="Satış hacmi" deger={`${tl(mevcutSatis)} TL`} alt="hedeflenen ziyaretlerden" renk="text-para" />
          <Sonuc ust="Yeni müşteri" etiket="Ek satış" deger={`${tl(yeniSatis)} TL`} alt="gerçek ek satış" renk="text-urun" />
          <Sonuc ust="Toplam" etiket="Satış hacmi" deger={`${tl(mevcutSatis + yeniSatis)} TL`} alt="iki tarafın toplamı" renk="text-kampanya" />
        </div>

        {/*
          ── Net katkı + ANLATIM ──────────────────────

          Ürün sahibi: *"nasıl zarara girdik daha açıklayıcı olmalı."*
          Haklıydı — ekran sayıyı veriyor ama **nereden geldiğini**
          anlatmıyordu. İşletmeci "−3.083" görüp kapatıyordu.

          Şimdi üç kat var:
            1. Başa baş eşiği  — en alçak çıta, en ikna edici sayı
            2. Net katkı       — rakamın kendisi
            3. Altı adımlık anlatım — cümleyle, canlı sayılarla

          ⚠️ Anlatım **canlı**: kaydırıcı oynayınca cümledeki sayılar da
          değişiyor. Sabit örnek metin olsaydı kullanıcı kendi senaryosunu
          değil bizim senaryomuzu okurdu.
        */}
        <div
          className={`mt-4 rounded-2xl px-6 py-7 ${
            netKatki >= 0 ? "bg-kampanya-zemin" : "border border-tehlike/50 bg-tehlike/5"
          }`}
        >
          {/* Başa baş — net katkıdan ÖNCE, çünkü asıl soruyu o cevaplıyor. */}
          {basaBas !== null && (
            <div className="mb-5 border-b border-yazi/10 pb-5">
              <p className="etiket-caps text-[10px] text-yazi-sonuk">Başa baş noktası</p>
              {basaBas <= 0 ? (
                <p className="mt-1.5 text-[15px] leading-relaxed">
                  Yalnızca <strong>yeni müşteriden</strong> gelen satış bütün masrafı
                  karşılıyor. Mevcut müşterinin hiçbir ziyareti fazladan olmasa bile
                  bu kurgu <strong>kârda</strong>.
                </p>
              ) : (
                <p className="mt-1.5 text-[15px] leading-relaxed">
                  Mevcut müşterinin {sayi(duzenliZiyaret)} ziyaretinin yalnızca{" "}
                  <strong className="font-display text-[19px]">
                    %{basaBas.toLocaleString("tr-TR", { maximumFractionDigits: 1 })}
                  </strong>
                  &rsquo;i fazladan olsa bile masraf çıkıyor — yani{" "}
                  <strong>{sayi((duzenliZiyaret * basaBas) / 100)} ziyaret</strong>.
                  Üstü kâr.
                </p>
              )}
            </div>
          )}

          <p className="etiket-caps text-[10px] text-yazi-sonuk">Tahmini net katkı / ay</p>
          <p
            className={`mt-1.5 font-display text-[clamp(34px,6vw,54px)] leading-none font-extrabold tabular ${
              netKatki >= 0 ? "text-kampanya" : "text-tehlike"
            }`}
          >
            {netKatki >= 0 ? "+" : "−"}
            {tl(Math.abs(netKatki))} TL
          </p>

          {/* ── Zarardaysa: SEBEBİ ve çıkışı ───────── */}
          {netKatki < 0 && (
            <div className="mt-4 rounded-xl bg-yuzey/70 px-4 py-4">
              <p className="text-[14px] leading-relaxed">
                <strong>Neden eksi?</strong> Kupon {sayi(duzenliZiyaret)} ziyaretin
                hepsinde kullanılıyor ({tl(kuponMaliyeti)} TL) ama bu senaryoda gelire
                yalnızca {tl(artimSatis + yeniSatis)} TL yazılıyor — mevcut
                müşterinin {tl(mevcutSatis - artimSatis)} TL&rsquo;si &ldquo;o zaten
                gelirdi&rdquo; diye sayılmıyor.
              </p>
              <p className="mt-2.5 text-[14px] leading-relaxed">
                Pozitife geçmenin iki yolu var:{" "}
                <strong>artım oranını %{Math.ceil(basaBas ?? 0)}&rsquo;e çıkarmak</strong>{" "}
                (gerçekten o kadar fazladan ziyaret geliyorsa) ya da{" "}
                <strong>kupon değerini düşürmek</strong>.
              </p>
            </div>
          )}

          {/* ── Altı adımlık anlatım ───────────────── */}
          <div className="mt-5">
            <p className="text-[14px] font-semibold">Bu sayı nereden geliyor</p>
            <ol className="mt-3 space-y-2.5 text-[13px] leading-relaxed text-yazi-sonuk">
              <Anlat n="1">
                Haftada <b>{sayi(haftalik)}</b> müşterinin <b>%{gelmeOrani}</b>&rsquo;si
                düzenli gelmeyi hedefliyor → <b>{sayi(hedefKitle)} kişi</b>
              </Anlat>
              <Anlat n="2">
                Bu kişiler ayda <b>{HAFTA_AY.toLocaleString("tr-TR", { maximumFractionDigits: 2 })}</b>{" "}
                kez geliyor, <b>%{ziyaretOrani}</b>&rsquo;i gerçekleşiyor →{" "}
                <b>{sayi(duzenliZiyaret)} ziyaret</b>
              </Anlat>
              <Anlat n="3" isaret="+">
                Bunların <b>%{artimOrani}</b>&rsquo;si fazladan →{" "}
                <b>{sayi(artimZiyaret)} ziyaret × {sayi(harcama)} TL = {tl(artimSatis)} TL</b>
              </Anlat>
              <Anlat n="4" isaret="+">
                Düzenli gelenlerin <b>%{arkadasOrani}</b>&rsquo;i arkadaş getiriyor →{" "}
                <b>{sayi(arkadasZiyaret)} ziyaret × {sayi(harcama)} TL = {tl(yeniSatis)} TL</b>
              </Anlat>
              <Anlat n="5" isaret="−">
                <b>{sayi(duzenliZiyaret)}</b> ziyarette kupon kullanılıyor →{" "}
                <b>{sayi(duzenliZiyaret)} × {kupon} TL = {tl(kuponMaliyeti)} TL</b>
              </Anlat>
              <Anlat n="6" isaret="−">
                Aylık sistem maliyeti → <b>{tl(SISTEM_MALIYETI)} TL</b>
              </Anlat>
            </ol>
            <p className="mt-3 border-t border-yazi/10 pt-3 font-data text-[13px] leading-relaxed tabular">
              {tl(artimSatis)} + {tl(yeniSatis)} − {tl(kuponMaliyeti)} −{" "}
              {tl(SISTEM_MALIYETI)} ={" "}
              <strong className={netKatki >= 0 ? "text-kampanya" : "text-tehlike"}>
                {netKatki >= 0 ? "+" : "−"}
                {tl(Math.abs(netKatki))} TL
              </strong>
            </p>
          </div>

          <p className="mt-4 max-w-2xl text-[12px] leading-relaxed text-yazi-sonuk">
            ⚠️ Mevcut müşterinin toplam <b>{tl(mevcutSatis)} TL</b>&rsquo;lik satış
            hacminin yalnızca artım oranı kadarı bu hesaba giriyor. Kalanı &ldquo;o
            zaten gelirdi&rdquo; varsayımıyla dışarıda — yani rakam bilerek temkinli.
          </p>
        </div>

        {/* ── Hesabın dökümü ────────────────────── */}
        <div className="mt-4 rounded-2xl border border-cizgi px-5 py-5">
          <p className="text-[15px] font-semibold">Net katkının hesabı</p>
          <dl className="mt-3 divide-y divide-cizgi">
            <Satir
              k={`Mevcut müşteri artım satışı (${sayi(artimZiyaret)} fazladan ziyaret)`}
              v={`+${tl(artimSatis)} TL`}
            />
            <Satir k="Yeni müşteri ek satışı" v={`+${tl(yeniSatis)} TL`} />
            <Satir k={`Kullanılan kupon maliyeti (${sayi(duzenliZiyaret)} × ${kupon} TL)`} v={`−${tl(kuponMaliyeti)} TL`} />
            <Satir k="Aylık sistem maliyeti" v={`−${tl(SISTEM_MALIYETI)} TL`} />
            <Satir k="Tahmini net katkı" v={`${netKatki >= 0 ? "+" : "−"}${tl(Math.abs(netKatki))} TL`} kalin />
          </dl>

          <div className="mt-5 border-t border-cizgi pt-5">
            <label className="block">
              <span className="text-[14px] font-semibold">Kupon değeri (TL)</span>
              <span className="mt-1 block text-[12px] leading-relaxed text-yazi-sonuk">
                Düzenli ziyaret gerçekleştiğinde kullanılan kuponun değeri. Looply&rsquo;de
                ödüller <strong className="text-yazi">{KUPON_EN_AZ}–{KUPON_EN_COK} TL</strong>{" "}
                arasında tanımlanıyor; aralık dışına çıkılamıyor.
              </span>
              <input
                type="range"
                min={KUPON_EN_AZ}
                max={KUPON_EN_COK}
                step={5}
                value={kupon}
                onChange={(e) => setKupon(Number(e.target.value))}
                className="mt-3 w-full accent-[var(--color-vurgu)]"
              />
            </label>
            <p className="mt-2 font-data text-[15px] font-bold tabular">{kupon} TL</p>
          </div>
        </div>

        <p className="mt-6 text-[12px] leading-relaxed text-yazi-sonuk">
          <strong className="text-yazi">Modelleme notu:</strong> oranlar gerçekleşmiş
          performans değil, senin seçtiğin varsayımlar. &ldquo;1 kez / 7 gün&rdquo; referansı ayda{" "}
          {HAFTA_AY.toLocaleString("tr-TR", { maximumFractionDigits: 2 })} ziyarete
          çevriliyor (52 hafta / 12 ay). Gerçek sonucun kafenin menüsüne, konumuna ve
          ödül kurgusuna göre değişir.
        </p>
      </div>
    </div>
  );
}

/* ── Parçalar ──────────────────────────────────────────────── */

function Girdi({
  etiket,
  alt,
  deger,
  yaz,
  enAz,
  enCok,
}: {
  etiket: string;
  alt: string;
  deger: number;
  yaz: (n: number) => void;
  enAz: number;
  enCok: number;
}) {
  return (
    <label className="block rounded-2xl border border-cizgi bg-cukur px-5 py-5">
      <span className="text-[15px] font-semibold">{etiket}</span>
      <input
        type="number"
        inputMode="numeric"
        min={enAz}
        max={enCok}
        value={deger}
        /*
          ⚠️ Boş girdi 0'a düşürülmüyor, alt sınıra çekiliyor: 0 müşteri
          bütün tabloyu sıfırlar ve kullanıcı bir hane silerken ekranın
          çökmesini görür.
        */
        onChange={(e) => {
          const n = Number(e.target.value);
          yaz(Number.isFinite(n) ? Math.min(Math.max(n, enAz), enCok) : enAz);
        }}
        className="mt-3 w-full rounded-lg border border-cizgi bg-yuzey px-3.5 py-3 font-data text-[18px] font-bold tabular focus:border-vurgu focus:outline-none"
      />
      <span className="mt-2 block text-[12px] text-yazi-sonuk">{alt}</span>
    </label>
  );
}

const RENKLER = {
  para: { zemin: "bg-para-zemin", metin: "text-para", kenar: "border-para/25" },
  vurgu: { zemin: "bg-vurgu-zemin", metin: "text-vurgu", kenar: "border-vurgu/25" },
  urun: { zemin: "bg-urun-zemin", metin: "text-urun", kenar: "border-urun/25" },
  kampanya: {
    zemin: "bg-kampanya-zemin",
    metin: "text-kampanya",
    kenar: "border-kampanya/25",
  },
} as const;

/** Anlatım satırı — solda adım numarası, sağda cümle. */
function Anlat({
  n,
  isaret,
  children,
}: {
  n: string;
  /** Gelir mi gider mi — `+` / `−`. Yoksa yalnızca ara adım. */
  isaret?: "+" | "−";
  children: React.ReactNode;
}) {
  return (
    <li className="flex gap-3">
      <span
        aria-hidden
        className={`mt-[1px] flex size-[20px] shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
          isaret === "+"
            ? "bg-para/15 text-para"
            : isaret === "−"
              ? "bg-tehlike/12 text-tehlike"
              : "bg-yazi/8 text-yazi-sonuk"
        }`}
      >
        {isaret ?? n}
      </span>
      <span>{children}</span>
    </li>
  );
}

function OranKutusu({
  sira,
  baslik,
  soru,
  deger,
  yaz,
  secenekler,
  renk,
  hesap,
  enCok = 100,
}: {
  sira: string;
  baslik: string;
  soru: string;
  deger: number;
  yaz: (n: number) => void;
  secenekler: readonly number[];
  renk: keyof typeof RENKLER;
  hesap: string;
  /** Artım oranının tavanı %50 — %100 bir iddia olurdu (dosya başı). */
  enCok?: number;
}) {
  const r = RENKLER[renk];
  return (
    <div className={`rounded-2xl border ${r.kenar} ${r.zemin} px-5 py-5`}>
      <p className="text-[15px] font-semibold">
        {sira}. {baslik}
      </p>
      <p className="mt-1.5 text-[12px] leading-relaxed text-yazi-sonuk">{soru}</p>

      <p className={`mt-4 font-display text-[34px] leading-none font-extrabold tabular ${r.metin}`}>
        %{deger}
      </p>

      <input
        type="range"
        min={0}
        max={enCok}
        step={5}
        value={deger}
        onChange={(e) => yaz(Number(e.target.value))}
        aria-label={baslik}
        className="mt-3 w-full accent-[currentColor]"
      />

      {/* Hazır seçenekler: kaydırıcı ince ayar, düğmeler senaryo. */}
      <div className="mt-3 flex flex-wrap gap-1.5">
        {secenekler.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => yaz(s)}
            aria-pressed={deger === s}
            className={`rounded-lg border px-2.5 py-1.5 font-data text-[12px] font-bold tabular transition-colors ${
              deger === s
                ? `border-current bg-yuzey ${r.metin}`
                : "border-cizgi bg-yuzey/60 text-yazi-sonuk hover:text-yazi"
            }`}
          >
            %{s}
          </button>
        ))}
      </div>

      <p className="mt-4 rounded-lg border border-cizgi bg-yuzey px-3 py-2.5 font-data text-[12px] leading-relaxed tabular">
        {hesap}
      </p>
    </div>
  );
}

function Adim({ buyuk, alt, vurgulu }: { buyuk: string; alt: string; vurgulu?: boolean }) {
  return (
    <div
      className={`rounded-xl border px-4 py-4 ${
        vurgulu ? "border-urun/35 bg-urun-zemin" : "border-cizgi bg-yuzey"
      }`}
    >
      <p
        className={`font-display text-[26px] leading-none font-extrabold tabular ${
          vurgulu ? "text-urun" : ""
        }`}
      >
        {buyuk}
      </p>
      <p className="mt-1.5 text-[12px] leading-relaxed text-yazi-sonuk">{alt}</p>
    </div>
  );
}

function Ok() {
  return (
    <span
      aria-hidden
      className="hidden items-center justify-center text-[18px] text-yazi-sonuk sm:flex"
    >
      →
    </span>
  );
}

function Sonuc({
  ust,
  etiket,
  deger,
  alt,
  renk,
}: {
  ust: string;
  etiket: string;
  deger: string;
  alt: string;
  renk?: string;
}) {
  return (
    <div className="rounded-2xl border border-cizgi bg-yuzey px-5 py-5">
      <p className="etiket-caps text-[9px] text-yazi-sonuk">{ust}</p>
      <p className="mt-1 text-[14px] font-semibold">{etiket}</p>
      <p className={`mt-2 font-display text-[28px] leading-none font-extrabold tabular ${renk ?? ""}`}>
        {deger}
      </p>
      <p className="mt-1.5 text-[12px] text-yazi-sonuk">{alt}</p>
    </div>
  );
}

function Satir({ k, v, kalin }: { k: string; v: string; kalin?: boolean }) {
  return (
    <div className={`flex items-baseline justify-between gap-4 py-2.5 ${kalin ? "font-bold" : ""}`}>
      <dt className="text-[13px] leading-relaxed">{k}</dt>
      <dd className="shrink-0 font-data text-[14px] tabular">{v}</dd>
    </div>
  );
}
