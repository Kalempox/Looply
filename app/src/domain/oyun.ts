import { withBypass, type Db } from "@/db/context";
import { newId } from "@/lib/ids";
import { randomToken, identifierHash } from "@/lib/crypto";
import { isGunu } from "@/lib/tarih";
import { log } from "@/lib/log";
import { oyunBul, tekrarOyna, EN_FAZLA_GIRDI, saatTutarliMi } from "@/oyunlar";
import * as masaOturumu from "./masa";
import * as upsell from "./upsell";
import { K2 } from "./masa";
import * as acil from "./acil";
import * as davet from "./davet";
import * as taht from "./taht";
import * as seri from "./seri";
import * as challenge from "./challenge";
import * as oyunSecimi from "./oyun-secimi";
import {
  yazIle as puanYaz,
  OYUN_PUANI,
  BONUS_CARPANI,
  KATILIM_PUANI,
  esikBul,
  basariliMi,
  type PuanSonucu,
} from "./puan";
import { yazIle as xpYaz } from "./xp";
import * as xp from "./xp";
import { degerlendir, tanimlar as rozetTanimlari } from "./rozet";
import { anlikOdulVer, kampanyaKuponuVer } from "./kupon";

/**
 * Oyun oturumu — Faz 5'in çekirdeği.
 *
 * ── Değişmez kural #4 ───────────────────────────────────────
 *
 * *"Para değeri taşıyan hiçbir sayı istemciden kabul edilmez."*
 *
 * İstemcinin gönderdiği skor bu dosyada **hiçbir hesaba girmez**. Yalnızca
 * `claimed_score` sütununa yazılır; oradaki değerin tek işi, sunucunun
 * bulduğuyla karşılaştırıldığında hile denemesini görünür kılmaktır (S5).
 *
 * ── Neden tohum sunucuda üretiliyor ─────────────────────────
 *
 * Tohumu istemci seçseydi, oyuncu kolay parça dizisi veren tohumu arayıp
 * bulur ve her seferinde onu kullanırdı. Tohum sunucuda üretilip oturuma
 * yazılıyor; doğrulama da o tohumla yapılıyor.
 */

/** Açık bir oyun oturumunun en fazla yaşayabileceği süre. */
const OTURUM_OMRU_SAAT = 2;

/** Bir oyun tamamlandığında yazılan XP (docs/06 §2.1). */
const XP_OYUN = 50;

/**
 * Bölüm tamamlanmadığında yazılan XP (Ü48).
 *
 * Puanla aynı gerekçe: denemek de sayılıyor. XP tavansız ve hiçbir
 * bütçeye dokunmuyor, o yüzden buradaki tek risk seviye enflasyonu —
 * beşte bir tutarak onu da sınırlıyoruz.
 */
const XP_KATILIM = 10;

/**
 * Cihaz kimliği vekili.
 *
 * `play_sessions.device_id_hash` NOT NULL ve **nitelikli oturum** benzersizlik
 * indeksinin parçası: `(cafe_id, device_id_hash, business_date) WHERE is_qualified`
 * — yani "1 nitelikli oturum / cihaz / kafe / gün" kuralı (docs/06 §5, S3).
 *
 * Bu akışta gerçek cihaz parmak izi toplanmıyor. Sütunu boş geçmek felaket
 * olurdu: **bütün oyuncular aynı cihaz sayılır** ve kafedeki ilk oyuncudan
 * sonra kimse nitelikli oturum üretemezdi. Yerine oyuncu kimliğinin hash'i
 * konuyor; kural böylece "1 / oyuncu / kafe / gün" gibi davranıyor.
 *
 * Gerçek cihaz sinyali fraud motoruyla birlikte gelecek (Faz 9); o zaman
 * kural asıl amacına — aynı cihazdan çok hesapla gelmeyi görmeye — kavuşur.
 */
export function cihazVekili(playerId: string): Buffer {
  return identifierHash(playerId);
}

/* ── Ortak kazanım yolu ────────────────────────────────────────
 *
 * Aşağıdaki iki fonksiyonun **iki** çağıranı var:
 *
 *   · `bitir`            — normal oyun. Skoru az önce `tekrarOyna` hesapladı.
 *   · `misafir.bozdur`   — kayıt öncesi oynanan oyun. Skoru yine sunucu
 *                          hesapladı (oyun anında) ve imzalı talebe koydu.
 *
 * Ü35 "ürün kuralları gevşemiyor" diyor. Bu söz ancak iki yol AYNI koddan
 * geçerse tutulabilir: ayrı ayrı yazılsalardı günlük tavan, nitelikli oturum,
 * anlık ödül ve taht kurallarının bir kopyası er geç güncellenmeden kalırdı.
 * Faz 7'de tohum betiğinin kendi PIN hash kopyası yüzünden kasiyer hiç giriş
 * yapamamıştı — aynı hata iki kez yapılmıyor.
 */

/**
 * "Nitelikli oturum" mu? (docs/06 §5, S3)
 *
 * Bölümün tamamlanması değil, **kafeye yapılan sayılabilir ziyaret**: günde
 * bir kez, cihaz ve kafe başına. Sonraki oyunlar oynanır ve puan kazandırır
 * ama ziyaret tekrar sayılmaz.
 *
 * `current_date` DEĞİL: o, veritabanı sunucusunun (UTC) günü. `business_date`
 * İstanbul takvimiyle yazılıyor ve ikisi gece 00:00–03:00 arasında AYRIŞIYOR —
 * kontrol yanlış güne bakar, aynı gün ikinci kez nitelikli işaretlenir ve
 * benzersizlik kısıtı ihlal edilir.
 */
async function nitelikliMi(
  db: Db,
  opts: { playerId: string; cafeId: string | null; kazandirir: boolean; basarili: boolean },
): Promise<boolean> {
  if (!opts.kazandirir || !opts.basarili || !opts.cafeId) return false;

  const varMi = await db.one(
    `SELECT 1 FROM play_sessions
      WHERE cafe_id = $1 AND device_id_hash = $2 AND business_date = $3
        AND is_qualified
      LIMIT 1`,
    [opts.cafeId, cihazVekili(opts.playerId), isGunu()],
  );
  return !varMi;
}

/**
 * Oyun turunda düşen **ödül** kuponu — Ü141.
 *
 * ── 🔴 `baslik` neden null olabiliyor ───────────────────────
 *
 * Oyun ödülü artık **kapalı** doğuyor: oyuncu onu Ödüllerim ekranında
 * kazıyarak açıyor (göç 0041). Kapalıyken ödülün adı istemciye
 * **hiç gönderilmiyor** — gönderilseydi kazıma bir perde olurdu ve
 * sayfanın kaynağına bakan (ya da ağ isteğini açan) herkes ödülü
 * kazımadan görürdü. Sürprizi saklamanın tek dürüst yolu veriyi
 * göndermemek.
 *
 * `kod` gidiyor ve gitmeli: kupon kodu ödül hakkında hiçbir şey
 * söylemiyor, kapalı kuponun kasada okutulmasını da veritabanındaki
 * kısıt engelliyor (0041).
 */
export type DusenOdul = {
  kuponId: string;
  /** Kapalıyken `null` — ad ilk kez kazıma bitince öğreniliyor. */
  baslik: string | null;
  kod: string;
  ertelendi: boolean;
  aktiflesme: Date;
  /** Ü141: henüz kazınmadı. */
  kapali: boolean;
};

/**
 * Kafenin kampanya kuponu (Ö4 · Ü82) — **hep açık** doğuyor.
 *
 * Kazanılmış bir şey değil, kafenin pazarlaması; kazınacak bir merak
 * yok. O yüzden `baslik` burada her zaman dolu.
 */
export type DusenKampanya = {
  kuponId: string;
  baslik: string;
  kod: string;
  ertelendi: boolean;
  aktiflesme: Date;
};

/**
 * Bu turda seviye atlandıysa — Ü146.
 *
 * `onceki` de taşınıyor: ekran "3. seviyeye ulaştın" derken kaçıncıdan
 * geldiğini bilmek, atlanan seviye sayısını göstermeyi ileride mümkün
 * kılıyor (tek turda iki seviye atlamak, büyük bir görev bonusuyla
 * teorik olarak mümkün).
 */
export type SeviyeAtlama = { onceki: number; yeni: number };

export type Kazanim = {
  puan: PuanSonucu | null;
  xp: number;
  /** Ü146: bu tur seviye atlattıysa. Atlatmadıysa null. */
  seviye: SeviyeAtlama | null;
  kupon: DusenOdul | null;
  taht: taht.DevirmeSonucu | null;
  /**
   * Skor eşiği bonusu (Ü48) — ulaşıldıysa hangi eşik ve ne yazıldı.
   *
   * Taban puandan **ayrı defter satırı**: ekranda "300 puan + 150 skor
   * bonusu" diye ayrı görünüyor ve denetimde "bu puan neden yazıldı"
   * sorusunun cevabı satırın kendisinde duruyor.
   */
  esik: { skor: number; puan: PuanSonucu } | null;
  /** Ü54: günlük seri — kaçıncı gün ve bugün ne kadar bonus yazıldı. */
  seri: { gun: number; puan: PuanSonucu } | null;
  /**
   * Ü106: günün görevi bu turda tamamlandıysa.
   *
   * Yalnızca **tamamlandığı anda** doluyor; günün geri kalanında null
   * kalıyor. Her turda "görevi zaten yapmıştın" demek, tamamlama anını
   * sıradanlaştırırdı.
   */
  challenge: { baslik: string; xp: number } | null;
  /**
   * Ü82: kafenin yayındaki yüzde kampanyasından düşen kupon.
   *
   * `kupon`dan **ayrı alan**: o oynamanın ödülü, bu kafenin pazarlaması
   * (Ö4). Aynı turda ikisi birden çıkabilir ve ekranda ikisi ayrı ayrı
   * görünmeli — oyuncu "kazandığım ödül" ile "kafenin verdiği indirim"i
   * karıştırmasın.
   */
  kampanya: DusenKampanya | null;
  /**
   * Ü100: upsell teklifi — kupon DEĞİL.
   *
   * Oyuncu "Al" demeden kupon üretilmiyor: kupon üretmek kafenin
   * bütçesini bağlıyor (Ü7) ve teklifi görmezden geçecek kişiye kupon
   * basmak o bütçeyi kullanılmayacak sözlere harcar.
   */
  teklif: { teklifId: string; yuzde: number; urunAdi: string; gecerliSaat: number } | null;
};

/**
 * Puan, XP, anlık ödül ve taht — tek yerde.
 *
 * Ü3: kafe dışında hiçbir kazanım yok, puan da XP de. Kazanım ayrıca
 * **başarılı** bölüm ister: bölümü yarıda bırakıp yeniden başlamak puan
 * üretmemeli, yoksa en ucuz çiftlik yolu o olurdu.
 */
async function kazanimIsle(
  db: Db,
  opts: {
    playerId: string;
    cafeId: string | null;
    tableId: string | null;
    oyunId: string;
    oturumId: string;
    proofLevel: number;
    skor: number;
    basarili: boolean;
    kazandirir: boolean;
    bonusMu: boolean;
    /** Ü91: turda yakalanan ödül işareti sayısı — motorun şans girdisi. */
    odulIsareti?: number;
  },
): Promise<Kazanim> {
  const bos: Kazanim = {
    puan: null,
    xp: 0,
    seviye: null,
    kupon: null,
    teklif: null,
    taht: null,
    esik: null,
    seri: null,
    challenge: null,
    kampanya: null,
  };
  if (!opts.kazandirir || !opts.cafeId) return bos;

  const sonuc: Kazanim = { ...bos };

  /*
    Ü146: seviye atlama bu turda mı oldu?

    Seviye bir kolon değil, XP defterinin toplamından türeyen bir sayı —
    yani "atladı mı" sorusunun cevabı ancak **öncesi ile sonrası**
    karşılaştırılarak bulunuyor. Toplam burada, hiçbir şey yazılmadan
    önce okunuyor; turun sonunda yeniden okunup iki seviye
    karşılaştırılıyor.

    ⚠️ Aynı işlemin içinde: ayrı bir bağlantıdan okunsaydı bu turda
    yazılan XP henüz görünmez ve seviye atlama hiçbir zaman fark
    edilmezdi.
  */
  const xpOnce = await xp.kafeToplamiIle(db, opts.playerId, opts.cafeId);

  if (opts.basarili) {
    const kuponDurduruldu = await acil.durduruldu(acil.ANAHTARLAR.kupon);

    if (!kuponDurduruldu) {
      // E5: çarpanlar çarpışmaz. Şu an tek çarpan bonuslu oyun; fiş
      // çarpanı (K4) Faz 7'de gelince en yükseği seçilecek.
      const carpan = opts.bonusMu ? BONUS_CARPANI : 1;

      sonuc.puan = await puanYaz(db, {
        playerId: opts.playerId,
        cafeId: opts.cafeId,
        taban: OYUN_PUANI,
        carpan,
        sebep: "oyun",
        refTipi: "play_session",
        refId: opts.oturumId,
        kanitSeviyesi: opts.proofLevel,
      });

      // XP tavansız (docs/06 §2.1) — hiçbir bütçeye dokunmuyor.
      sonuc.xp = XP_OYUN * carpan;
      await xpYaz(db, {
        playerId: opts.playerId,
        cafeId: opts.cafeId,
        delta: sonuc.xp,
        kaynak: "GAME",
        kaynakId: opts.oturumId,
      });

      // E2: anlık ödül puan istemez ve günde bir kez düşer. İlk kez
      // oynayanın puanı sıfırdır; eli boş çıkarsa bir daha gelmez.
      // Ü27: hangi ödülün düşeceği kafenin sırasından, döngüsel.
      const anlik = await anlikOdulVer(db, {
        playerId: opts.playerId,
        cafeId: opts.cafeId,
        kanitSeviyesi: opts.proofLevel,
        // Ü77: motor skoru ve hangi oyun olduğunu bilmek zorunda.
        skor: opts.skor,
        oyunId: opts.oyunId,
        // Ü91: oyuncu ödülü ekranda yakaladıysa şans yükseliyor.
        odulIsareti: opts.odulIsareti,
        kaynakId: opts.oturumId,
        // Ü141: oyun ödülü kapalı doğuyor — adı kazınınca öğreniliyor.
        kapali: true,
      });
      if (anlik?.ok) {
        // Ü97: kimlik ve aktifleşme anı bekleme metni için taşınıyor —
        // metin kupona göre sabit kalmalı ve "yarın" derken doğru söylemeli.
        //
        // ⚠️ Ü141: `baslik` BİLEREK taşınmıyor. Kupon kapalı doğuyor ve
        // adı bu yanıtla gitseydi kazıma bir perdeye dönerdi — ağ
        // isteğine bakan oyuncu ödülü kazımadan görürdü. Ad yalnızca
        // kazıma bittiğinde, açma çağrısının yanıtında dönüyor.
        sonuc.kupon = {
          kuponId: anlik.kuponId,
          baslik: null,
          kapali: true,
          kod: anlik.kod,
          ertelendi: anlik.ertelendi,
          aktiflesme: anlik.aktiflesme,
        };
      }
    }
  } else {
    // Ü48: bölüm tamamlanmasa da katılım puanı yazılıyor — "kazanım yok"
    // ekranı, ilk kez oynayanı ilk denemede kaybettiriyordu. Çarpan
    // uygulanmıyor: bonus günü bitirmeyi ödüllendiriyor, denemeyi değil.
    sonuc.puan = await puanYaz(db, {
      playerId: opts.playerId,
      cafeId: opts.cafeId,
      taban: KATILIM_PUANI,
      carpan: 1,
      sebep: "oyun_katilim",
      refTipi: "play_session",
      refId: opts.oturumId,
      kanitSeviyesi: opts.proofLevel,
    });

    sonuc.xp = XP_KATILIM;
    await xpYaz(db, {
      playerId: opts.playerId,
      cafeId: opts.cafeId,
      delta: sonuc.xp,
      kaynak: "GAME",
      kaynakId: opts.oturumId,
    });
  }

  // ── Kampanya kuponu (Ö4, Ü82) ──────────────────────────
  //
  // **Başarı şartı yok** ve bu kasıtlı: anlık ödül oynamanın karşılığı,
  // kampanya kafenin pazarlaması. Oyunu bitirememiş müşteriye latte
  // indirimi vermemek için sebep yok — kafenin istediği şey o lattenin
  // satılması. Nitelikli oturum şartı (kafede olmak, K2) yine geçerli:
  // buraya `kazandirir` false ise zaten hiç gelinmiyor.
  //
  // Acil durdurma kupon dağıtımını kapatıyorsa kampanya da düşmüyor —
  // G18 "kupon dağıtımını durdur" düğmesi her yolu kapatmalı.
  if (!(await acil.durduruldu(acil.ANAHTARLAR.kupon))) {
    const kmp = await kampanyaKuponuVer(db, {
      playerId: opts.playerId,
      cafeId: opts.cafeId,
      kanitSeviyesi: opts.proofLevel,
    });
    /**
     * Ü100: upsell teklifi. Kampanya kuponundan **sonra** bakılıyor ve
     * ikisi birbirini dışlamıyor — biri kafenin ikramı, öbürü kafenin
     * satmak istediği ürün. Aynı ekranda ikisi de çıkabilir.
     */
    const t = await upsell.uygunTeklif(db, {
      cafeId: opts.cafeId,
      playerId: opts.playerId,
      oturumId: opts.oturumId,
    });
    if (t) {
      sonuc.teklif = {
        teklifId: t.teklifId,
        yuzde: t.yuzde,
        urunAdi: t.urunAdi,
        gecerliSaat: t.gecerliSaat,
      };
    }

    if (kmp?.ok) {
      sonuc.kampanya = {
        kuponId: kmp.kuponId,
        baslik: kmp.baslik,
        kod: kmp.kod,
        ertelendi: kmp.ertelendi,
        aktiflesme: kmp.aktiflesme,
      };
    }
  }

  // ── Skor eşiği (Ü48) ───────────────────────────────────
  //
  // Bölümü bitirmek tek başarı ölçüsü değil; iyi oynamanın da karşılığı
  // var. Bu yüzden başarılı/başarısız ayrımının DIŞINDA: 2500 skor yapıp
  // bölümü bitirememek de iyi oynamaktır.
  //
  // Ayrı `puanYaz` çağrısı, tavanı ikinci kez okuyor — taban puan yeni
  // yazıldığı için bu doğru olan: tavan doluysa bonus da yazılmıyor (E4).
  const esik = esikBul(opts.skor);
  if (esik) {
    const yazim = await puanYaz(db, {
      playerId: opts.playerId,
      cafeId: opts.cafeId,
      taban: esik.bonus,
      carpan: 1,
      sebep: "skor_esigi",
      refTipi: "play_session",
      refId: opts.oturumId,
      kanitSeviyesi: opts.proofLevel,
    });
    sonuc.esik = { skor: esik.skor, puan: yazim };
  }

  // ── Günlük seri (Ü54) ──────────────────────────────────
  //
  // Günde bir kez: defterde bugüne ait `seri` satırı varsa ikincisi
  // yazılmıyor. Kontrol AYNI İŞLEMDE — ayrı bağlantıdan sorulsaydı bu
  // oyunun satırı henüz commit edilmemiş olur ve aynı gün ikinci oyunda
  // bonus tekrar yazılırdı.
  //
  // Seri hesabı bu oturumu da sayıyor: satır yukarıda yazıldı ve aynı
  // işlemin içindeyiz, yani "bugün oynadı" doğru çıkıyor.
  if (!(await seri.bugunYazildiMi(db, { playerId: opts.playerId, cafeId: opts.cafeId }))) {
    const durum = await seri.hesapla(db, { playerId: opts.playerId, cafeId: opts.cafeId });
    const bonus = seri.bonusPuani(durum.gun);

    if (bonus > 0) {
      const yazim = await puanYaz(db, {
        playerId: opts.playerId,
        cafeId: opts.cafeId,
        taban: bonus,
        carpan: 1,
        sebep: "seri",
        refTipi: "play_session",
        refId: opts.oturumId,
        kanitSeviyesi: opts.proofLevel,
      });
      sonuc.seri = { gun: durum.gun, puan: yazim };
    }
  }

  // ── Günün görevi (Ü106) ────────────────────────────────
  //
  // AYNI İŞLEMDE: biten oturum yukarıda `completed` yazıldı ama henüz
  // commit edilmedi. Ayrı bağlantıdan sorulsaydı sorgu bu turu göremez
  // ve "3 tur oyna" görevi üçüncü turda değil dördüncüde tamamlanırdı.
  //
  // Başarı şartı yok: görev kendi hedefini kendisi tanımlıyor. "1.200
  // skor" zaten bir başarı ölçüsü; "2 tur oyna" ise bilerek başarıdan
  // bağımsız — ikinci turu oynayıp kaybetmek de görevi tamamlar.
  const gorev = await challenge.ilerleme(db, {
    playerId: opts.playerId,
    cafeId: opts.cafeId,
  });

  if (gorev.tamam && !gorev.yazildi) {
    const yazildi = await xpYaz(db, {
      playerId: opts.playerId,
      cafeId: opts.cafeId,
      delta: gorev.gorev.xp,
      kaynak: "CHALLENGE",
      kaynakId: opts.oturumId,
    });

    // `yazildi` false ise kanıt kapısı reddetmiştir (Ü3) — ekranda
    // kazanılmamış bir XP göstermiyoruz.
    if (yazildi) {
      sonuc.xp += gorev.gorev.xp;
      sonuc.challenge = { baslik: gorev.gorev.baslik, xp: gorev.gorev.xp };
    }
  }

  // ── Masa tahtı (Ö1) ────────────────────────────────────
  //
  // AYNI İŞLEMDE: biten oturumun yazımı henüz commit edilmedi; ayrı
  // bağlantıdan sorulsa sorgu bu oyunu göremez ve oyuncu tahtı devirdiği
  // hâlde "devirmedin" cevabı alırdı.
  //
  // Yalnızca **günün oyununda** anlamlı: taht tek oyun üzerinden tutuluyor
  // ki skorlar karşılaştırılabilir olsun (Ö1). Yalnızca okuyor — taht
  // hiçbir deftere yazmıyor, statüden ibaret.
  if (opts.bonusMu) {
    sonuc.taht = await taht.devirdiMiIle(db, {
      cafeId: opts.cafeId,
      tableId: opts.tableId,
      oyunId: opts.oyunId,
      playerId: opts.playerId,
      skor: opts.skor,
    });
  }

  /*
    Seviye atladıysa ekran bunu kutluyor (Ü146).

    ⚠️ Rozet değerlendirmesi bundan SONRA da XP yazabilir ama o yazım
    bu turun sonucuna girmiyor: rozet kendi kutlamasına sahip ve iki
    kutlamayı üst üste bindirmek ikisini de zayıflatırdı. Buradaki soru
    dar: *bu oyun turu seviye atlattı mı?*
  */
  const xpSonra = await xp.kafeToplamiIle(db, opts.playerId, opts.cafeId);
  const seviyeOnce = xp.seviye(xpOnce);
  const seviyeSonra = xp.seviye(xpSonra);
  if (seviyeSonra > seviyeOnce) {
    sonuc.seviye = { onceki: seviyeOnce, yeni: seviyeSonra };
  }

  return sonuc;
}

export type BaslatSonucu =
  | {
      ok: true;
      oturumId: string;
      tohum: string;
      /** Bu oturum puan/XP kazandırır mı? Kafe dışındaysa hayır (Ü3). */
      kazandirir: boolean;
      bonusMu: boolean;
    }
  | { ok: false; hata: string };

/**
 * Oyun oturumu açar ve tohumu döner.
 *
 * Kafe dışında da açılabiliyor — Ü3 oynamayı serbest bırakıyor, yalnızca
 * kazanımı kapatıyor. `kazandirir` alanı ekranın bunu dürüstçe söylemesi için.
 */
export async function basla(opts: {
  playerId: string;
  oyunId: string;
}): Promise<BaslatSonucu> {
  const oyun = oyunBul(opts.oyunId);
  if (!oyun) return { ok: false, hata: "Böyle bir oyun yok." };

  if (await acil.durduruldu(acil.ANAHTARLAR.oyun)) {
    return { ok: false, hata: "Oyunlar geçici olarak durduruldu. Birazdan tekrar dene." };
  }

  const masa = await masaOturumu.aktif(opts.playerId);
  const kazandirir = !!masa && (masa.kanitMaskesi & K2) !== 0;

  // ⚠️ Ü109: kafe bu oyunu kapattıysa oturum HİÇ açılmıyor. Süzgeç
  // yalnızca katalogda olsaydı adres çubuğuna `/oyna/<oyun>` yazan
  // oyuncu kapalı oyunu oynar ve kapatma bir dilek olarak kalırdı.
  if (!(await oyunSecimi.acikMi(masa?.cafeId ?? null, oyun.id))) {
    return { ok: false, hata: "Bu kafede bu oyun kapalı. Diğer oyunlardan birini seçebilirsin." };
  }

  const bonusMu = (await oyunSecimi.gununOyunuKafede(masa?.cafeId ?? null)).id === oyun.id;

  const oturumId = newId("oyn");
  const tohum = randomToken(16);

  await withBypass("oyun oturumu açma", (db) =>
    db.query(
      `INSERT INTO play_sessions
         (id, cafe_id, table_id, player_id, device_id_hash, game_id, seed,
          table_session_id, proof_mask, proof_level, business_date, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'open')`,
      [
        oturumId,
        masa?.cafeId ?? null,
        masa?.tableId ?? null,
        opts.playerId,
        cihazVekili(opts.playerId),
        oyun.id,
        tohum,
        masa?.id ?? null,
        masa?.kanitMaskesi ?? 0,
        masa?.kanitSeviyesi ?? 0,
        isGunu(),
      ],
    ),
  );

  // Davet zinciri: "oyunu gerçekten oynadı" şartının ilk yarısı.
  // Hata oyunu engellememeli — davet yan iş.
  try {
    await davet.ilerlet(opts.playerId, "game_started");
  } catch (err) {
    log.warn("davet ilerletme basarisiz", { hata: String(err) });
  }

  return { ok: true, oturumId, tohum, kazandirir, bonusMu };
}

export type BitirSonucu =
  | {
      ok: true;
      /** Sunucunun hesapladığı skor — istemcininki değil. */
      skor: number;
      basarili: boolean;
      /** Kafe dışıysa null; başarısız bölümde katılım puanı (Ü48). */
      puan: PuanSonucu | null;
      /** Ü48: skor eşiği bonusu — ulaşılmadıysa null. */
      esik: { skor: number; puan: PuanSonucu } | null;
      /** Ü54: günlük seri bonusu — bugün yazıldıysa. */
      seri: { gun: number; puan: PuanSonucu } | null;
      /** Ü106: günün görevi bu turda tamamlandıysa. XP toplamın içinde. */
      challenge: { baslik: string; xp: number } | null;
      xp: number;
      /** Ü146: bu tur seviye atlattıysa — ekran kutluyor. */
      seviye: SeviyeAtlama | null;
      kazandirir: boolean;
      bonusMu: boolean;
      /** Bu çağrıda kazanılan rozetler. */
      /**
       * Bu çağrıda kazanılan rozetler — **kod değil başlık** (Ü148).
       *
       * Ekran kutlamada rozetin adını söylüyor ("İlk oyun"); kod
       * gönderilseydi istemcinin kod→ad tablosunun ikinci bir kopyasını
       * taşıması gerekirdi ve rozet adı değiştiğinde ikisi ayrışırdı.
       */
      yeniRozetler: string[];
      /** E2: anlık ödül düştüyse. Oyuncuya TL değeri GÖSTERİLMEZ (E9). */
      kupon: DusenOdul | null;
      /** Ö4 · Ü82: kafenin kampanya kuponu düştüyse. Ödülden ayrı. */
      kampanya: DusenKampanya | null;
  /**
   * Ü100: upsell teklifi — kupon DEĞİL.
   *
   * Oyuncu "Al" demeden kupon üretilmiyor: kupon üretmek kafenin
   * bütçesini bağlıyor (Ü7) ve teklifi görmezden geçecek kişiye kupon
   * basmak o bütçeyi kullanılmayacak sözlere harcar.
   */
  teklif: { teklifId: string; yuzde: number; urunAdi: string; gecerliSaat: number } | null;
      /**
       * Bu oturum "kafeye yapılan sayılabilir ziyaret" olarak işaretlendi mi?
       *
       * Ekranda gösterilmiyor; davet zincirinin niteliklenme şartı bu (Faz 9,
       * Ü20). Değeri burada taşınıyor ki işlem kapandıktan sonra çağrılan
       * davet adımı oturumu ikinci kez okumak zorunda kalmasın.
       */
      nitelikliOldu: boolean;
      /** Oturumun kafesi — kafe dışında null. */
      cafeId: string | null;
      /**
       * Ö1: bu oyun masanın tahtını devirdi mi?
       *
       * Yalnızca günün oyununda anlamlı — taht tek oyun üzerinden tutuluyor
       * ki skorlar karşılaştırılabilir olsun. Başka oyunda her zaman null.
       */
      taht: taht.DevirmeSonucu | null;
    }
  | { ok: false; hata: string; reddedildi?: boolean };

/**
 * Oyunu bitirir: girdi kaydını yeniden oynatır, skoru hesaplar, kazanımı yazar.
 *
 * ── Tekrar gönderim koruması ────────────────────────────────
 *
 * Oturum satırı işlemin başında `FOR UPDATE` ile kilitleniyor. İki istek
 * aynı anda gelirse ikincisi birincinin bitmesini bekler ve durumu artık
 * 'open' olmadığı için reddedilir. Puan iki kez yazılamaz.
 */
export async function bitir(opts: {
  playerId: string;
  oturumId: string;
  girdiler: unknown;
  iddiaEdilenSkor: number;
}): Promise<BitirSonucu> {
  return withBypass("oyun bitirme ve doğrulama", async (db) => {
    // ── Oyuncu düzeyinde kilit ──────────────────────────────
    //
    // İki oyunu neredeyse aynı anda bitiren bir oyuncu, kilit olmadan iki
    // yarış koşulu üretirdi:
    //   · Günlük tavan: ikisi de "bugün 600" okur, ikisi de 300 yazar → 1200
    //   · Nitelikli oturum: ikisi de "bugün nitelikli yok" görür, ikisi de
    //     işaretlemeye çalışır → benzersizlik ihlali
    //
    // Oturum satırını kilitlemek yetmiyor çünkü satırlar farklı. Oyuncu
    // satırı ortak; onu kilitlemek aynı oyuncunun bitirmelerini sıraya sokuyor.
    await db.query(`SELECT id FROM players WHERE id = $1 FOR UPDATE`, [opts.playerId]);

    const oturum = await db.one<{
      id: string;
      cafe_id: string | null;
      table_id: string | null;
      game_id: string;
      level: number | null;
      seed: string;
      status: string;
      started_at: Date;
      proof_mask: number;
      proof_level: number;
      table_session_id: string | null;
    }>(
      `SELECT id, cafe_id, table_id, game_id, level, seed, status, started_at,
              proof_mask, proof_level, table_session_id
         FROM play_sessions
        WHERE id = $1 AND player_id = $2
        FOR UPDATE`,
      [opts.oturumId, opts.playerId],
    );

    if (!oturum) return { ok: false as const, hata: "Oturum bulunamadı." };
    if (oturum.status !== "open") {
      // Aynı oturumu iki kez bitirme denemesi — Faz 5 güvenlik kapısı.
      log.warn("oyun oturumu ikinci kez bitirilmeye calisildi", { durum: oturum.status });
      return { ok: false as const, hata: "Bu oyun zaten bitmişti." };
    }

    const yas = Date.now() - oturum.started_at.getTime();
    if (yas > OTURUM_OMRU_SAAT * 3_600_000) {
      await db.query(
        `UPDATE play_sessions SET status = 'abandoned', ended_at = now(),
                reject_reason = 'süre aşımı' WHERE id = $1`,
        [oturum.id],
      );
      return { ok: false as const, hata: "Bu oyunun süresi dolmuş." };
    }

    const oyun = oyunBul(oturum.game_id);
    if (!oyun) return { ok: false as const, hata: "Oyun tanımı bulunamadı." };

    // ── Sunucu skoru yeniden hesaplar (S5) ──────────────────
    const sonuc = tekrarOyna(oyun, oturum.seed, opts.girdiler);

    const girdiSayisi = Array.isArray(opts.girdiler) ? opts.girdiler.length : 0;
    const iddia = Number.isFinite(opts.iddiaEdilenSkor) ? Math.trunc(opts.iddiaEdilenSkor) : 0;

    if (!sonuc.gecerli) {
      await db.query(
        `UPDATE play_sessions
            SET status = 'rejected', ended_at = now(), duration_ms = $2,
                claimed_score = $3, input_log = $4, reject_reason = $5
          WHERE id = $1`,
        [oturum.id, yas, iddia, JSON.stringify(sanitize(opts.girdiler)), sonuc.sebep.slice(0, 200)],
      );
      log.warn("oyun reddedildi", { sebep: sonuc.sebep, girdiSayisi });
      return { ok: false as const, hata: "Oyun kaydı doğrulanamadı.", reddedildi: true };
    }

    // Bölüm bittikten sonra tek bir zaman işareti normal; fazlası istemcinin
    // beklenmedik davrandığını gösterir ve fraud analizine girdi olur (Faz 9).
    if (sonuc.kullanilmayan > 2) {
      log.warn("oyun kaydinda artik girdi var", {
        adet: sonuc.kullanilmayan,
        oyun: oturum.game_id,
      });
    }

    // İstemci farklı bir skor iddia ettiyse bu bir hile denemesi olabilir —
    // oyun geçerli olduğu için reddedilmiyor ama kayda geçiyor (Faz 9 fraud).
    if (iddia !== sonuc.skor) {
      log.warn("iddia edilen skor sunucununkinden farkli", {
        fark: iddia - sonuc.skor,
        oyun: oturum.game_id,
      });
    }

    // Ü84: bildirilen oyun saati gerçek süreyle tutarlı mı?
    //
    // Zaman tabanlı oyunlarda saat istemcide işliyor. On dakika oturup
    // "üç saniye geçti" diyen bir kayıt, Düşen'de yerçekimini neredeyse
    // durdurur ve tur sonsuza kadar sürer. Reddetme yolu geçersiz replay'inkiyle
    // aynı: oturum `rejected` yazılıyor, hiçbir kazanım işlenmiyor.
    if (!saatTutarliMi(sonuc.oyunMs, yas)) {
      await db.query(
        `UPDATE play_sessions
            SET status = 'rejected', ended_at = now(), duration_ms = $2,
                claimed_score = $3, input_log = $4, reject_reason = $5
          WHERE id = $1 AND status = 'open'`,
        [
          oturum.id,
          yas,
          iddia,
          JSON.stringify(sanitize(opts.girdiler)),
          `saat tutarsız: oyun ${sonuc.oyunMs}ms, gerçek ${yas}ms`,
        ],
      );
      log.warn("oyun saati tutarsiz", { oyunMs: sonuc.oyunMs, gercekMs: yas });
      return { ok: false as const, hata: "Oyun kaydı doğrulanamadı.", reddedildi: true };
    }

    const kazandirir = !!oturum.cafe_id && (oturum.proof_mask & K2) !== 0;

    // Ü83: "başarılı" artık oyunun değil ürünün kuralı — skor eşiği.
    // Ü91: oyun içi ödül işareti eşiği atlıyor.
    /* Ü234: işaret artık kapıyı açmıyor — tek ölçü skor. */
    const basarili = basariliMi(sonuc.skor);

    const nitelikli = await nitelikliMi(db, {
      playerId: opts.playerId,
      cafeId: oturum.cafe_id,
      kazandirir,
      basarili,
    });

    await db.query(
      `UPDATE play_sessions
          SET status = 'completed', ended_at = now(), duration_ms = $2,
              server_score = $3, claimed_score = $4, input_log = $5,
              is_qualified = $6
        WHERE id = $1 AND status = 'open'`,
      [
        oturum.id,
        yas,
        sonuc.skor,
        iddia,
        JSON.stringify(sanitize(opts.girdiler)),
        nitelikli,
      ],
    );

    // Ü109: bonuslu oyun kafeye göre. Aynı işlemin içinden okunuyor ki
    // az önce yazılmış bir ayar değişikliği de görülsün.
    const bonusMu = (await oyunSecimi.gununOyunuIle(db, oturum.cafe_id)).id === oyun.id;

    const kazanim = await kazanimIsle(db, {
      playerId: opts.playerId,
      cafeId: oturum.cafe_id,
      tableId: oturum.table_id,
      oyunId: oturum.game_id,
      oturumId: oturum.id,
      proofLevel: oturum.proof_level,
      skor: sonuc.skor,
      basarili,
      kazandirir,
      bonusMu,
      odulIsareti: sonuc.odulIsareti,
    });

    return {
      ok: true as const,
      skor: sonuc.skor,
      basarili,
      puan: kazanim.puan,
      esik: kazanim.esik,
      seri: kazanim.seri,
      challenge: kazanim.challenge,
      xp: kazanim.xp,
      seviye: kazanim.seviye,
      kazandirir,
      bonusMu,
      // Rozetler işlemin dışında değerlendiriliyor; burada boş başlıyor.
      yeniRozetler: [] as string[],
      kupon: kazanim.kupon,
      kampanya: kazanim.kampanya,
      teklif: kazanim.teklif,
      nitelikliOldu: nitelikli,
      cafeId: oturum.cafe_id,
      taht: kazanim.taht,
    };
  }).then(async (sonuc) => {
    // Rozet değerlendirmesi işlemin DIŞINDA: idempotent ve hiçbir deftere
    // dokunmuyor (Ü16), bu yüzden puan yazımıyla aynı işlemi uzatmasına
    // gerek yok. Hata verirse oyunun sonucu bozulmamalı.
    if (sonuc.ok && sonuc.kazandirir) {
      try {
        const masa = await masaOturumu.aktif(opts.playerId);
        const kodlar = await degerlendir(opts.playerId, masa?.cafeId);
        if (kodlar.length > 0) {
          // Ü148: kod yerine başlık taşınıyor — kutlama rozetin adını
          // söylüyor. Tanım listesi yalnızca rozet kazanıldığında
          // okunuyor; her turda okumak boşuna bir sorgu olurdu.
          const tanimlar = await rozetTanimlari();
          const adlar = new Map(tanimlar.map((t) => [t.code, t.baslik]));
          sonuc.yeniRozetler = kodlar.map((k) => adlar.get(k) ?? k);
        }
      } catch (err) {
        log.warn("rozet degerlendirmesi basarisiz", { hata: String(err) });
      }
    }

    // ── Davet zinciri (Faz 9, Ü20) ──────────────────────────
    //
    // İşlemin DIŞINDA: davet kendi satırlarını kilitliyor ve buradaki
    // `players FOR UPDATE` kilidiyle aynı işlemde çalışması gereksiz bir
    // kilit zinciri kurardı. Ayrıca hatası oyunun sonucunu bozmamalı —
    // oyuncu bölümü bitirdi, puanı yazıldı; davet ayrı bir hikâye.
    if (sonuc.ok) {
      try {
        await davet.ilerlet(opts.playerId, "game_completed");
        if (sonuc.nitelikliOldu && sonuc.cafeId) {
          await davet.niteliklendir({ inviteeId: opts.playerId, cafeId: sonuc.cafeId });
        }
      } catch (err) {
        log.warn("davet ilerletme basarisiz", { hata: String(err) });
      }
    }
    return sonuc;
  });
}

/* ── Misafir talebinin bozdurulması (Ü35) ───────────────────── */

export type MisafirYazSonucu =
  | {
      ok: true;
      oturumId: string;
      kazandirir: boolean;
      bonusMu: boolean;
      puan: PuanSonucu | null;
      esik: { skor: number; puan: PuanSonucu } | null;
      seri: { gun: number; puan: PuanSonucu } | null;
      xp: number;
      kupon: DusenOdul | null;
      /** Ö4 · Ü82: kayıt anında bozdurulan misafir turunda da düşebiliyor. */
      kampanya: DusenKampanya | null;
  /**
   * Ü100: upsell teklifi — kupon DEĞİL.
   *
   * Oyuncu "Al" demeden kupon üretilmiyor: kupon üretmek kafenin
   * bütçesini bağlıyor (Ü7) ve teklifi görmezden geçecek kişiye kupon
   * basmak o bütçeyi kullanılmayacak sözlere harcar.
   */
  teklif: { teklifId: string; yuzde: number; urunAdi: string; gecerliSaat: number } | null;
      taht: taht.DevirmeSonucu | null;
      nitelikliOldu: boolean;
    }
  | { ok: false; hata: string };

/**
 * Kayıt öncesi oynanan oyunu deftere yazar ve kazanımı işler.
 *
 * ── Skor neden yeniden oynatılmıyor ─────────────────────────
 *
 * Çünkü **zaten oynatıldı**. Misafir bölümü bitirdiğinde sunucu girdi
 * kaydını `tekrarOyna` ile doğruladı ve bulduğu skoru imzalı talebe koydu.
 * Buraya gelen sayı istemcinin iddiası değil, sunucunun kendi imzası —
 * güvenilmesinin sebebi bu.
 *
 * Girdi kaydı taşınmıyor: Ü35 "kayıt öncesi oynanan oyun hiçbir deftere
 * yazılmaz" diyor ve 5.000 hamlelik bir kaydı çereze sığdırmanın yolu da
 * yok. Bu yüzden `input_log` NULL kalıyor — tamamlanmış bir satırdaki boş
 * kayıt, o satırın misafir talebinden geldiğinin işareti.
 *
 * ── Kurallar gevşemiyor ─────────────────────────────────────
 *
 * Satır yazıldıktan sonrası normal oyunla **aynı fonksiyonlardan** geçiyor:
 * K2, günlük tavan, nitelikli oturum, anlık ödül, taht ve davet zinciri.
 * Yer değiştiren tek şey oynama anı ile kayıt anı.
 */
export async function misafirOyunuYaz(opts: {
  playerId: string;
  cafeId: string;
  tableId: string;
  oyunId: string;
  tohum: string;
  skor: number;
  basarili: boolean;
  iddia: number;
  sureMs: number;
}): Promise<MisafirYazSonucu> {
  const oyun = oyunBul(opts.oyunId);
  if (!oyun) return { ok: false, hata: "Oyun tanımı bulunamadı." };

  if (await acil.durduruldu(acil.ANAHTARLAR.oyun)) {
    return { ok: false, hata: "Oyunlar geçici olarak durduruldu." };
  }

  // Masa oturumu kayıt sırasında açıldı; kanıt oradan okunuyor. Talebin
  // kafesiyle eşleşmesi şart — A kafesinde oynanan oyun B kafesinin
  // bütçesinden ödül yazdıramaz.
  const masa = await masaOturumu.aktif(opts.playerId);
  if (!masa || masa.cafeId !== opts.cafeId || masa.tableId !== opts.tableId) {
    return { ok: false, hata: "Bu talep bu masaya ait değil." };
  }

  const sonuc = await withBypass("misafir talebi bozdurma", async (db) => {
    // `bitir` ile aynı gerekçe: aynı oyuncunun eşzamanlı yazımlarını sıraya
    // sokmak. Günlük tavan ve nitelikli oturum yarış koşuluna açık.
    await db.query(`SELECT id FROM players WHERE id = $1 FOR UPDATE`, [opts.playerId]);

    // ── Talep tek kullanımlık ───────────────────────────────
    //
    // Çerezi silmek yetmez: talep taşıyıcı bir jeton ve oyuncunun kendi
    // tarayıcısında duruyor. Değerini kaydedip girişten sonra geri koyan
    // biri, aynı oyunu ikinci kez bozdurabilirdi.
    //
    // Tohum bunu tek başına çözüyor: her misafir oyununun tohumu sunucuda
    // üretilen 16 baytlık rastgele bir değer ve `play_sessions.seed`'e
    // yazılıyor. Aynı tohumla ikinci bir satır varsa bu talep zaten
    // bozdurulmuş demektir — kimin bozdurduğundan bağımsız olarak.
    const bozduruldu = await db.one(`SELECT 1 FROM play_sessions WHERE seed = $1 LIMIT 1`, [
      opts.tohum,
    ]);
    if (bozduruldu) {
      log.warn("misafir talebi ikinci kez bozdurulmaya calisildi");
      return { ok: false as const, hata: "Bu oyun zaten hesabına işlenmiş." };
    }

    const kazandirir = (masa.kanitMaskesi & K2) !== 0;
    // Ü109: misafir yolu da kafenin açık listesinden geçiyor — Ü35,
    // "iki yol aynı kuraldan geçmeli".
    const bonusMu = (await oyunSecimi.gununOyunuIle(db, opts.cafeId)).id === oyun.id;

    const nitelikli = await nitelikliMi(db, {
      playerId: opts.playerId,
      cafeId: opts.cafeId,
      kazandirir,
      basarili: opts.basarili,
    });

    const oturumId = newId("oyn");
    await db.query(
      `INSERT INTO play_sessions
         (id, cafe_id, table_id, player_id, device_id_hash, game_id, seed,
          table_session_id, proof_mask, proof_level, business_date, status,
          ended_at, duration_ms, server_score, claimed_score, is_qualified)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'completed',
               now(),$12,$13,$14,$15)`,
      [
        oturumId,
        opts.cafeId,
        opts.tableId,
        opts.playerId,
        cihazVekili(opts.playerId),
        oyun.id,
        opts.tohum,
        masa.id,
        masa.kanitMaskesi,
        masa.kanitSeviyesi,
        isGunu(),
        Math.max(0, Math.trunc(opts.sureMs)),
        opts.skor,
        opts.iddia,
        nitelikli,
      ],
    );

    const kazanim = await kazanimIsle(db, {
      playerId: opts.playerId,
      cafeId: opts.cafeId,
      tableId: opts.tableId,
      oyunId: oyun.id,
      oturumId,
      proofLevel: masa.kanitSeviyesi,
      skor: opts.skor,
      basarili: opts.basarili,
      kazandirir,
      bonusMu,
    });

    return {
      ok: true as const,
      oturumId,
      kazandirir,
      bonusMu,
      puan: kazanim.puan,
      esik: kazanim.esik,
      seri: kazanim.seri,
      challenge: kazanim.challenge,
      xp: kazanim.xp,
      kupon: kazanim.kupon,
      kampanya: kazanim.kampanya,
      teklif: kazanim.teklif,
      taht: kazanim.taht,
      nitelikliOldu: nitelikli,
    };
  });

  if (!sonuc.ok) return sonuc;

  // İşlemin DIŞINDA — `bitir` ile aynı gerekçe: davet kendi satırlarını
  // kilitliyor ve hatası oyunun sonucunu bozmamalı.
  try {
    await davet.ilerlet(opts.playerId, "game_started");
    await davet.ilerlet(opts.playerId, "game_completed");
    if (sonuc.nitelikliOldu) {
      await davet.niteliklendir({ inviteeId: opts.playerId, cafeId: opts.cafeId });
    }
  } catch (err) {
    log.warn("davet ilerletme basarisiz", { hata: String(err) });
  }

  log.info("misafir talebi bozduruldu", { kazandirir: sonuc.kazandirir });
  return sonuc;
}

/**
 * Girdi kaydını saklamadan önce boyutunu sınırlar.
 *
 * Kayıt denetim ve fraud analizi için tutuluyor (Faz 9). Doğrulama zaten
 * geçtiyse kaydın kendisi güvenli, ama veritabanına sınırsız veri yazmak
 * için bir sebep yok.
 */
function sanitize(girdiler: unknown): unknown[] {
  if (!Array.isArray(girdiler)) return [];
  return girdiler.slice(0, EN_FAZLA_GIRDI);
}
