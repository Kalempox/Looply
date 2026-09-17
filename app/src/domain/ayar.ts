import { withCafe } from "@/db/context";
import { audit } from "@/lib/audit";

/**
 * Kafe ayarları — panelden değiştirilebilen değerler.
 *
 * ── Neden anahtar-değer ─────────────────────────────────────
 *
 * Her ayar için `cafes` tablosuna kolon açmak, on ayarda on göç demek ve
 * ayarların çoğu birkaç kafeyi ilgilendiriyor. `cafe_config` tablosu bu iş
 * için zaten vardı; bugüne kadar boştu.
 *
 * ── Buraya NE girmez ────────────────────────────────────────
 *
 * Platform kuralları. E6'nın kanıt kademesi (ödül değeri arttıkça daha
 * güçlü kanıt) ve E10'un bütçe tavanı kafenin seçimi değil: kafe kendi
 * ödülünün kanıt şartını gevşetebilseydi, en pahalı ödülü en zayıf kanıtla
 * vermenin yolu açılırdı. Buraya yalnızca kafenin **kendi ekonomisine**
 * ait tercihler giriyor.
 */

export const ANAHTARLAR = {
  /** Bu tutarın üstündeki ödül 24 saat sonra açılır (Ü28, kuruş). */
  ertelemeEsigi: "erteleme_esigi_kurus",
  /**
   * Kafenin bir günde dağıtmayı taahhüt ettiği ödül değeri (Ü45, kuruş).
   *
   * Her sabah yeniden bütçe girmek zorunda kalmasın diye burada duruyor:
   * o günün dönemi ilk ihtiyaç anında bu tutarla açılıyor. Kafe istediği
   * günü ayrıca değiştirebiliyor — "yarın maç var, havuzu artırayım".
   */
  gunlukButce: "gunluk_butce_kurus",
  /**
   * Bir müşterinin ortalama hesabı (kuruş).
   *
   * Yalnızca **raporun getiri tahmininde** kullanılıyor: "bu kadar ziyaret
   * geldi" sayısını kafenin anladığı birime, paraya çevirmek için. Ödül
   * dağıtımına, bütçeye, kupon tutarına hiç girmiyor — yanlış girilmesi
   * kimseye para kaybettirmez, yalnızca tahmini bozar.
   *
   * Varsayılanı biz uyduramayız; kafeden başka kimse bilmiyor. O yüzden
   * rapor, tahmini gösterirken hangi tutarı kullandığını da yazıyor.
   */
  ortalamaAdisyon: "ortalama_adisyon_kurus",
  /**
   * Çarkta çıkabilecek en büyük ödül (Ü49, kuruş).
   *
   * Çark ödülleri kafenin **günlük havuzundan** çıkıyor (E10) ama havuzun
   * kendisi tek bir ödülün büyüklüğünü sınırlamıyor: 1.500 TL'lik havuzdan
   * tek seferde 300 TL'lik bir ödül de çıkabilir. Ürün sahibinin tarifi
   * bunun tersi — *"çok da yüksek ödüller vermeyen bir çark."*
   *
   * Bu yüzden ayrı bir tavan: bu tutarın üstündeki anlık ödüller çarka
   * hiç girmiyor. Katalogda durmaya devam ediyorlar, oyun içi anlık ödül
   * olarak çıkabiliyorlar — yalnızca çarkın listesinde yoklar.
   */
  carkUstSinir: "cark_ust_sinir_kurus",
  /**
   * Kafenin açılış saati (Ü90, 0–23, İstanbul).
   *
   * İki iş birden yapıyor:
   *
   *   · **Tempo** (Ü87): günlük bütçe açılıştan kapanışa **kademeli**
   *     açılıyor, bütün gün tek seferde masada durmuyor. Yoksa sabahki
   *     kalabalık günün bütçesini bitiriyor ve akşam gelen müşteriye
   *     hiçbir şey çıkmıyor.
   *   · **Kapalıyken ödül yok** (Ü90): ürün sahibinin kararı — *"kafe 23'te
   *     kapanıyor, o saatten sonra müşteri gelmeyeceği için sistem ödül
   *     eklemesin."*
   */
  acilisSaati: "acilis_saat",
  /** Kafenin kapanış saati (Ü90, 1–23, İstanbul). */
  kapanisSaati: "kapanis_saat",
  /**
   * Ertelenen ödülün kaç saat sonra açılacağı (Ü129, saat).
   *
   * ── Neden ayar oldu ─────────────────────────────────────────
   *
   * `kupon.ts`te `ERTELEME_SAAT = 12` diye **sabit** yazılıydı. Sayı
   * Ü28'de 24, Ü97'de 12 olmuştu; ikisi de ürün sahibinin tercihiydi ve
   * her değişiklikte kod değişiyordu. Ürün sahibi şimdi kafeye verdi —
   * *"ödül aktivasyon saatini de panelden ayarlayabilmeli."*
   *
   * ⚠️ **Çark ve oyun ödülü aynı ayarı kullanıyor** ve kullanmalı: ikisi
   * de `kuponUret` yolundan geçiyor, yani kuponun aktifleşme anı tek bir
   * yerde hesaplanıyor. Ayrı ayarlar olsaydı aynı ödül, çarktan mı oyundan
   * mı çıktığına göre farklı saatte açılırdı — oyuncuya açıklaması olmayan
   * bir fark.
   *
   * ⚠️ Yalnızca **eşiğin üstündeki** ödülü ilgilendiriyor (`ertelemeEsigi`).
   * Eşiğin altındaki ödül zaten anında açılıyor ve bu ayar ona hiç
   * dokunmuyor.
   */
  ertelemeSaati: "erteleme_saat",
  /**
   * İki çark çevirmesi arasındaki en az süre — Ü158 (saat).
   *
   * ── Neden ayar oldu ─────────────────────────────────────────
   *
   * `cark.ts`te `ARALIK_SAAT = 24` diye **sabit** yazılıydı ve panelde
   * bir kart onu *"24 saatte 1 · müşteri başına"* diye gösteriyordu.
   * Gösterilen ama değiştirilemeyen bir sayı, kafe sahibini
   * *"demek ki değiştirebiliyorum"* diye düşündürüyordu — ürün sahibi
   * fark etti ve *"süreyi kafe sahibi panelden belirlemeli"* dedi.
   *
   * ⚠️ Sınırlar rastgele değil. **Alt sınır 1 saat:** daha kısası çarkı
   * bir ödül musluğuna çevirir; günlük bütçe yine tavan koyar ama
   * müşteri "çevirdikçe çıkıyor" alışkanlığı edinir ve ödülün değeri
   * düşer. **Üst sınır 168 saat (bir hafta):** daha uzunu, haftada bir
   * gelen müdavimin çarkı hiç görememesi demek — çark o zaman bir
   * özellik değil, bir hayal kırıklığı olur.
   *
   * ⚠️ Süre **kayan**, takvim günü değil: son çevirmenin üstünden bu
   * kadar saat geçmiş olmalı. "Günde bir" demiyoruz çünkü gece 23:50'de
   * çeviren biri on dakika sonra tekrar çevirebilirdi.
   */
  carkAralikSaat: "cark_aralik_saat",
  /**
   * K2'nin yarıçapı — kafeye kaç metre yakınlık "kafedeyim" sayılıyor
   * (Ü131, metre).
   *
   * ── Neden ayar oldu ─────────────────────────────────────────
   *
   * `masa.ts`te `GEOFENCE_METRE = 150` diye **sabit** yazılıydı ve her
   * kafeye aynı çember uyguluyordu. Ürün sahibi: *"konumdan kaç metre
   * uzakta olduğunu tanımlamak için yarıçap belirlesin kafe sahibi, 40
   * metre diyince 40 metre yarıçaptaki alanda doğru kabul etsin."*
   *
   * Mantıklı: bir AVM katındaki kafeyle sokak arası kafenin ihtiyacı
   * aynı değil. 150 metre, yan binadaki birinin de "kafedeyim" sayılması
   * demekti.
   *
   * ⚠️ **Alt sınır 20 metre.** GPS'in kendi hata payı şehir içinde
   * 10–30 metre; 5 metre yazan kafe kendi masasındaki müşteriyi bile
   * reddeder ve sebebini anlamaz. Dar çember, kafenin kendi ayağına
   * sıkması.
   *
   * ⚠️ **Üst sınır 500 metre.** Üstü K2'yi fiilen kapatır: çember
   * mahalleyi kapsarsa "kafede olmak" bir kanıt olmaktan çıkar ve ödül
   * ekonomisinin tek fiziksel dayanağı düşer.
   */
  konumYaricapi: "konum_yaricap_metre",
} as const;

export type Anahtar = (typeof ANAHTARLAR)[keyof typeof ANAHTARLAR];

/**
 * Sayısal ayarların sınırları.
 *
 * Sınırsız bırakılamaz: eşiği çok yükseğe çeken bir kafe ertelemeyi fiilen
 * kapatır ve Ü28'in getirdiği ertesi ziyaret döngüsü yok olur. Sıfıra
 * çekense her ödülü erteler — o da kafenin hakkı, ama kasada "kupon neden
 * açılmıyor" sorusunu çoğaltır. Aralık ikisini de görünür kılıyor.
 */
export const SINIRLAR: Record<Anahtar, { en_az: number; en_cok: number; varsayilan: number }> = {
  // Ü52: ödüller 25-50 TL arasında. Eşik 50 TL kalsaydı hiçbir ödül
  // ertelenmez ve Ü39'un getirdiği "ertesi ziyaret" döngüsü ölü kalırdı.
  // 35 TL: üst yarı (40/45/50) erteleniyor, alt yarı anında açılıyor.
  [ANAHTARLAR.ertelemeEsigi]: { en_az: 25_00, en_cok: 50_00, varsayilan: 35_00 },
  // Alt sınır Ü45'in günlük tabanı; üst sınır yok denecek kadar yüksek
  // tutuluyor — kafenin ne kadar dağıtacağı bizim kararımız değil.
  [ANAHTARLAR.gunlukButce]: { en_az: 1_500_00, en_cok: 100_000_00, varsayilan: 1_500_00 },
  // Bir kahveden ucuz olamaz, bir masanın toplam hesabından pahalı olmasın.
  [ANAHTARLAR.ortalamaAdisyon]: { en_az: 20_00, en_cok: 5_000_00, varsayilan: 150_00 },
  // Ü52: ödül aralığı 25-50 TL olduğu için çarkın tavanı da o aralıkta.
  // Varsayılan 35 TL — çark alt yarıyı dağıtıyor, büyük ödüller oyunun
  // kendisine kalıyor. 25 yazan kafede çark yalnızca en küçük ödülü
  // dağıtır; 50 yazan kafede her ödül çarka girer.
  [ANAHTARLAR.carkUstSinir]: { en_az: 25_00, en_cok: 50_00, varsayilan: 35_00 },
  // Varsayılan 09:00–23:00 — kafelerin çoğunun açık olduğu aralık, ama
  // artık yalnızca bir **varsayılan**: kafe kendi saatini panelden yazıyor
  // (Ü90). Ü87'de bu iki sayı "bir tahmin" diye işaretlenmişti; tahmin
  // olmaktan çıktılar.
  [ANAHTARLAR.acilisSaati]: { en_az: 0, en_cok: 22, varsayilan: 9 },
  [ANAHTARLAR.kapanisSaati]: { en_az: 1, en_cok: 23, varsayilan: 23 },
  // Ü129: varsayılan 12 — Ü97'de sabit olarak seçilen değer, ayar olunca
  // varsayılan oldu. Paneli hiç açmayan kafede hiçbir şey değişmiyor.
  //
  // ⚠️ Alt sınır 1, sıfır DEĞİL: sıfır "erteleme yok" demek olurdu ve o
  // kararın zaten bir yeri var — eşiği 50 TL'ye çekmek (Ü52 ile en pahalı
  // ödül 50 TL). İki ayrı yerden aynı şeyi kapatmak, kafenin "neden hâlâ
  // erteleniyor" sorusunu iki yere birden baktırırdı.
  //
  // ⚠️ Üst sınır 48: kupon `GECERLILIK_GUN` kadar geçerli ve erteleme
  // ondan uzun olursa kupon **açılmadan** ölürdü. 48 saat, geçerlilik
  // süresinin altında kalan güvenli bir tavan.
  [ANAHTARLAR.ertelemeSaati]: { en_az: 1, en_cok: 48, varsayilan: 12 },
  // Ü158: varsayılan 24 — sabitken kullanılan değer, ayar olunca
  // varsayılan oldu. Paneli hiç açmayan kafede hiçbir şey değişmiyor.
  // Sınırların gerekçesi `carkAralikSaat`in kendi notunda.
  [ANAHTARLAR.carkAralikSaat]: { en_az: 1, en_cok: 168, varsayilan: 24 },
  // Ü131: varsayılan 150 — sabitken kullanılan değer, ayar olunca
  // varsayılan oldu. Paneli hiç açmayan kafede hiçbir şey değişmiyor.
  // Sınırların gerekçesi `konumYaricapi`nin kendi notunda: altı GPS hata
  // payının içinde kalır, üstü K2'yi anlamsızlaştırır.
  [ANAHTARLAR.konumYaricapi]: { en_az: 20, en_cok: 500, varsayilan: 150 },
};

export async function sayiOku(cafeId: string, anahtar: Anahtar): Promise<number> {
  const sinir = SINIRLAR[anahtar];

  const r = await withCafe(cafeId, (db) =>
    db.one<{ value: string }>(`SELECT value FROM cafe_config WHERE key = $1`, [anahtar]),
  );
  if (!r) return sinir.varsayilan;

  const n = Number(r.value);
  // Bozuk değer varsayılana düşüyor: ayar tablosu yüzünden ödül dağıtımı
  // durmamalı. Kayıt bozuksa görülmesi gereken yer panel, kasa değil.
  if (!Number.isFinite(n) || !Number.isInteger(n)) return sinir.varsayilan;
  return Math.min(sinir.en_cok, Math.max(sinir.en_az, n));
}

export type AyarSonucu = { ok: true } | { ok: false; hata: string };

export async function sayiYaz(opts: {
  cafeId: string;
  anahtar: Anahtar;
  deger: number;
  aktorId: string;
}): Promise<AyarSonucu> {
  const sinir = SINIRLAR[opts.anahtar];

  if (!Number.isInteger(opts.deger) || opts.deger < sinir.en_az || opts.deger > sinir.en_cok) {
    return {
      ok: false,
      hata: `Değer ${sinir.en_az / 100} ile ${sinir.en_cok / 100} TL arasında olmalı.`,
    };
  }

  await withCafe(opts.cafeId, async (db) => {
    await db.query(
      `INSERT INTO cafe_config (cafe_id, key, value) VALUES ($1,$2,$3)
       ON CONFLICT (cafe_id, key) DO UPDATE SET value = EXCLUDED.value`,
      [opts.cafeId, opts.anahtar, String(opts.deger)],
    );

    // Ödül ekonomisini değiştiren her işlem denetim izine düşüyor: "kupon
    // neden bugün açılmadı" sorusunun cevabı burada aranacak.
    await audit(db, {
      actorType: "staff",
      actorId: opts.aktorId,
      cafeId: opts.cafeId,
      action: "cafe.config_update",
      targetType: "cafe",
      targetId: opts.cafeId,
      detail: { anahtar: opts.anahtar, deger: opts.deger },
    });
  });

  return { ok: true };
}
