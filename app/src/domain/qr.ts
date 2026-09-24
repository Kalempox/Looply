import { randomBytes } from "node:crypto";
import { withBypass } from "@/db/context";
import { slugla } from "@/lib/slug";
import { sha256, randomToken, imzala, imzaGecerliMi } from "@/lib/crypto";
import { log } from "@/lib/log";
import { audit } from "@/lib/audit";
import { newId } from "@/lib/ids";

/** İmza amacı — misafir talebiyle aynı anahtarı kullanıyor, aynı uzayı değil. */
const AMAC = "masa-bileti";

/**
 * Masa karekodu ve masa bileti — AL-2 / K1.
 *
 * İki parça var:
 *
 *   1. BASILI KAREKOD — masaya yapıştırılan sabit kod. Değeri masanın
 *      `qr_secret` alanından türüyor, tahmin edilemez. Kafe kodu yenilemek
 *      isterse `qr_secret` değiştirilir ve eski çıktılar ölür.
 *
 *   2. MASA BİLETİ — okutunca verilen imzalı, 30 dakikalık kimlik.
 *      HttpOnly çerezde taşınır: adres paylaşmakla geçmez, kurcalanamaz.
 *
 * Basılı karekodun fotoğrafını paylaşmayı bu katmanlar durdurmaz — onu
 * konum doğrulaması (K2) karşılıyor.
 */

/** Masa bileti çerezinin adı. */
export const MASA_COOKIE = "cp_masa";

export type MasaCozumu = {
  cafeId: string;
  cafeAdi: string;
  cafeSlug: string;
  tableId: string;
  masaAdi: string;
};

/**
 * Basılı kodun en uzun hâli — 29 karakter.
 *
 * 🔴 Sayı karekodun geometrisinden türüyor, seçilmiş değil. Adres
 * `https://looplybusiness.com/m/` ile başlıyor (29 karakter) ve
 * karekodun 6. sürümü `H` hata düzeltmede 58 bayt tutuyor: 58 − 29.
 *
 * 7. sürümde hizalama deseni sembolün **tam merkezine** geliyor ve
 * ortadaki Loopy rozeti onu kapatıyor. O desen hata düzeltmeyle
 * kurtarılmıyor, yani kod hiç okunmaz — ve bu, basıldıktan sonra
 * anlaşılır. `tests/karekod.test.ts` aynı sınırı öteki uçtan
 * bekçiliyor.
 */
export const EN_UZUN_KOD = 29;

/**
 * Bu uzunluğun altındaki kod karekodu 5. sürümde tutuyor.
 *
 * Zorunlu değil, **tercih edilir**: 5. sürüm 37×37, 6. sürüm 41×41.
 * Az modül = kalın modül = uzaktan ve hasarlıyken daha iyi okunma.
 */
export const SEYREK_KOD = 15;

/**
 * Rastgele ekin alfabesi — 32 harf, `i` ve `l` YOK.
 *
 * İkisi de `1` ile karışıyor ve bu kod karekodun altına insan için de
 * basılıyor (telefonda söylenebilsin, elle girilebilsin diye). `0` ve
 * `1` zaten yok; `o` kalabiliyor çünkü karışacağı `0` listede değil.
 *
 * ⚠️ Tam 32: rastgele baytlardan sapmasız harf çekmek için ikinin
 * kuvveti olmak zorunda. 31 harfle modulo bazı harfleri ötekilerden
 * sık üretirdi.
 */
const EK_ALFABE = "23456789abcdefghjkmnopqrstuvwxyz";

/** Rastgele ekin uzunluğu — 8 harf, 40 bit. */
const EK_UZUNLUK = 8;

/**
 * Kodun biçimi.
 *
 * 🔴 **En az bir tire ZORUNLU** ve bu bir süs değil: eski hex biçiminde
 * hiç tire yok, yani iki biçim birbirine asla karışamıyor. Tire
 * olmasaydı `masaCoz` bir kodun hangi kolonda aranacağını bilemez ve
 * her sorguyu iki kolonda birden yapmak zorunda kalırdı — bugün de
 * öyle yapıyor ama **güvenlik payıyla**, zorunluluktan değil.
 *
 * Ayrıca tire, ardışık iki tireyi ve uçtaki tireyi de eliyor:
 * `kafe--a`, `-kafe-a` ve `kafe-a-` geçmiyor.
 */
const KOD_BICIMI = /^[a-z0-9]+(?:-[a-z0-9]+)+$/;

/** Kod hem biçime hem uzunluğa uymalı. */
function kodGecerli(kod: string): boolean {
  return kod.length >= 3 && kod.length <= EN_UZUN_KOD && KOD_BICIMI.test(kod);
}

/**
 * Basılı kodu üretir: `<etiket>-<rastgele ek>`.
 *
 * ── 🔴 Rastgele ek KALDIRILAMAZ ────────────────────────────
 *
 * Salt `kafe-a` daha temiz görünüyor ve reddedildi. Basılı kod bu
 * sistemde bir bağlantı değil **kanıt**: `proof_mask`te K1 = "karekod
 * okutuldu" ve bütün AL-2 modeli kodun tahmin edilemezliğine
 * dayanıyor. Tahmin edilebilir bir adres, dünyanın herhangi bir
 * yerindeki birine "Kafe A'dayım" bileti verirdi.
 *
 * ⚠️ Etiket kafenin o anki adından türüyor ama koda **yapışmıyor**:
 * kod bir kez basıldıktan sonra kafe adını değiştirse de etiket öyle
 * kalır. Kodun işi tanımak, tanımlamak değil.
 *
 * @param etiket Kafenin adı ya da stok kod için seçilen etiket.
 */
export function kodUret(etiket: string): string {
  const bas = slugla(etiket, EN_UZUN_KOD - EK_UZUNLUK - 1);
  /* Etiket tamamen ASCII dışıysa (örn. yalnızca emoji) slug boş
     kalıyor; kodsuz bir karekod basmaktansa genel bir ön ek. */
  const on = bas.length >= 2 ? bas : "kod";

  const ham = randomBytes(EK_UZUNLUK);
  let ek = "";
  for (let i = 0; i < EK_UZUNLUK; i++) {
    ek += EK_ALFABE[ham[i] % EK_ALFABE.length];
  }

  const kod = `${on}-${ek}`;
  /* Kısıt yukarıda türetildi; yine de sınanıyor çünkü buradan dönen
     değer doğrudan mürekkebe gidiyor. */
  if (!kodGecerli(kod)) {
    throw new Error(`kodUret: geçersiz kod üretildi (${kod})`);
  }
  return kod;
}

/**
 * Karekoda basılacak değer.
 *
 * ⚠️ İmza satırın tamamını alıyor, yalnızca `qr_secret`i değil: iki
 * kaynak var (yeni `print_code`, eski hex) ve çağıranın hangisini
 * seçeceğine karar vermesi, iki yerin sessizce ayrışması demekti.
 */
export function basiliKod(satir: {
  print_code?: string | null;
  qr_secret: Buffer;
}): string {
  return satir.print_code ?? satir.qr_secret.subarray(0, 8).toString("hex");
}

/**
 * Basılı kodu masaya çözer.
 *
 * G5: kafe onaylanmamışsa hiçbir şey dönmez — onaysız kafe karekod üretemez,
 * ürettiyse de çalışmaz.
 */
export async function masaCoz(ham: string): Promise<MasaCozumu | null> {
  /* ⚠️ Küçük harfe indiriliyor: kod kâğıttan elle girilebiliyor ve
     büyük harfle yazmak kuraldışı bir hamle değil. Adres yolunda da
     büyük harf gelebiliyor. */
  const kod = ham.toLowerCase();
  if (!kodGecerli(kod) && !/^[0-9a-f]{16}$/.test(kod)) return null;

  const r = await withBypass("masa karekodu çözümleme", (db) =>
    db.one<{
      cafe_id: string;
      cafe_adi: string;
      cafe_slug: string;
      table_id: string;
      masa_adi: string;
    }>(
      `SELECT c.id AS cafe_id, c.name AS cafe_adi, c.slug AS cafe_slug,
              t.id AS table_id, t.label AS masa_adi
         FROM cafe_tables t
         JOIN cafes c ON c.id = t.cafe_id
        WHERE (t.print_code = $1
               OR encode(substring(t.qr_secret from 1 for 8), 'hex') = $1)
          AND t.active = true
          AND c.status = 'approved'`,
      [kod],
    ),
  );

  if (!r) return null;
  return {
    cafeId: r.cafe_id,
    cafeAdi: r.cafe_adi,
    cafeSlug: r.cafe_slug,
    tableId: r.table_id,
    masaAdi: r.masa_adi,
  };
}

/**
 * Karekod okutma kaydı.
 *
 * Kafenin doğrulama defterinde (Faz 8) "bu masa şu saatte okutuldu" satırı
 * olarak görünecek. Kimlik doğrulama görevi YOK — o işi masa bileti yapıyor.
 *
 * ⚠️ Burada önce 90 saniyelik tek kullanımlık bir jeton vardı ve adres
 * çubuğunda taşınıyordu. Tasarım hatasıydı: jeton sayfa yüklenirken
 * tüketiliyordu ve Next.js aynı sayfayı iki kez isteyebildiği için
 * (ön yükleme) kullanıcıya ulaşan ikinci istek jetonu "kullanılmış"
 * buluyordu. Bilet artık HttpOnly çerezde — adres paylaşmakla taşınmıyor,
 * yani jetonun sağladığı korumayı zaten fazlasıyla veriyor.
 */
export async function taramaKaydet(cafeId: string, tableId: string): Promise<void> {
  await withBypass("karekod tarama kaydı", (db) =>
    db.query(
      `INSERT INTO qr_tokens (token_hash, cafe_id, table_id, expires_at, consumed_at)
       VALUES ($1,$2,$3, now() + interval '90 seconds', now())`,
      [sha256(randomToken(24)), cafeId, tableId],
    ),
  );
}

/* ── Masa bileti ──────────────────────────────────────────────
 *
 * İçeriği açık ama imzası olmadan üretilemiyor: kurcalanmış bir bilet
 * (başka kafenin kimliği yazılmış) imzayı tutturamıyor. HttpOnly çerezde
 * taşınıyor, yani JavaScript'ten okunamıyor ve adresle paylaşılamıyor.
 */

export const BILET_OMRU_SN = 30 * 60;

export function biletUret(cafeId: string, tableId: string): string {
  const sonGecerlilik = Date.now() + BILET_OMRU_SN * 1000;
  const govde = `${cafeId}.${tableId}.${sonGecerlilik}`;
  return `${govde}.${imzala(AMAC, govde)}`;
}

export function biletCoz(bilet: string): { cafeId: string; tableId: string } | null {
  const parcalar = bilet.split(".");
  if (parcalar.length !== 4) return null;

  const [cafeId, tableId, sonStr, imza] = parcalar;
  const govde = `${cafeId}.${tableId}.${sonStr}`;

  if (!imzaGecerliMi(AMAC, govde, imza)) return null;
  if (Number(sonStr) < Date.now()) return null;
  return { cafeId, tableId };
}

/** Eski tarama kayıtlarını siler. Saatlik iş. */
export async function temizle(): Promise<number> {
  return withBypass("karekod tarama temizliği", async (db) => {
    const r = await db.query(
      `DELETE FROM qr_tokens WHERE expires_at < now() - interval '1 hour'`,
    );
    if (r.rowCount) log.debug("tarama kayitlari temizlendi", { adet: r.rowCount });
    return r.rowCount ?? 0;
  });
}

/* ══════════════════════════════════════════════════════════
   Basılı kodun yönlendirmesi — Ü266 (Ü267'de yeniden kuruldu)
   ══════════════════════════════════════════════════════════ */

/**
 * Ürün sahibinin istediği "301 redirect" bu.
 *
 * Basılı karekod `…/m/<kod>` taşıyor ve `masaCoz` o kodu
 * `cafe_tables.print_code` üzerinden bir masaya bağlıyor. Yönlendirmeyi
 * değiştirmek = kodu başka bir **kafenin** masasına bağlamak. Ayrı bir
 * "kod → adres" tablosu yok: aynı bilgi iki yerde dursaydı ayrıştıkları
 * gün hangisinin doğru olduğu bilinmezdi.
 *
 * ── 🔴 Ü266'nın ilk hâli ürün sahibinin akışına UYMUYORDU ─────
 *
 * Hedef **masa**ydı ve "hedef masanın kodu olmamalı" diye reddediyordu.
 * Oysa yeni masa açılırken kodu kendiliğinden alıyor (`masa-yonetim`,
 * `kodUret`) ve kafe başına **tek aktif masa** var (göç 0038,
 * `cafe_tables_tek_aktif`). Sonuç: yeni gelen hiçbir kafe hedef
 * listesine giremiyordu — "A/B/C/D için toptan bas, gerçek kafe gelince
 * oraya yönlendir" akışı hiç çalışmıyordu. Test bunu görmedi çünkü
 * hedef masanın kodunu testin içinde elle siliyordu.
 *
 * Ayrıca liste var olmayan bir tabloya (`qr_scans`) bakıyordu ve sayfa
 * açılınca çöküyordu. SQL tip denetiminden geçmiyor ve listeyi hiçbir
 * test çağırmıyordu.
 *
 * ── Şimdiki kural ────────────────────────────────────────────
 *
 * Hedef **kafe**. Kafenin tek aktif masası:
 *
 *   · **yoksa** → masa o kodla açılıyor
 *   · **var ve kodu hiç kullanılmamışsa** → kodu serbest bırakılıyor,
 *     basılı kod yerine geçiyor. Toptan baskı akışında tam olarak bu
 *     durum yaşanıyor: yeni kafenin kendi kodu hiç basılmamış.
 *   · **var ve kullanımdaysa** → REDDEDİLİYOR. O kod bir duvarda asılı;
 *     yerine başka kod geçerse o kâğıt sessizce ölür.
 *
 * "Kullanımda" = masada en az bir masa oturumu (`table_sessions`)
 * açılmış olması. ⚠️ `qr_tokens` bu iş için kullanılamaz: bir saat sonra
 * siliniyor (`qr_temizlik`), dayanıklı bir iz değil.
 */
export type BasiliKodSatiri = {
  kod: string;
  cafeId: string;
  cafeAdi: string;
  tableId: string;
  masaAdi: string;
  aktif: boolean;
  /**
   * Toplam kullanım = `yeni` + `eski` — Ü272. "Kullanımda" kararı bununla
   * veriliyor; taşınmış kodun eski kafedeki okutmaları da sayılıyor.
   */
  kullanim: number;
  /** Şu anki kafede, oraya geldiği andan beri açılan oturum. */
  yeni: number;
  /** Geçmiş duraklarındaki oturumlar, kafe kafe, eskiden yeniye. */
  eski: { cafeAdi: string; oturum: number }[];
  /** Şu anki durağa geldiği an; hiç taşınmadıysa `null`. */
  gelis: Date | null;
  sonKullanim: Date | null;
};

/** Bağlı bütün basılı kodlar — platform ekranının listesi. */
export async function basiliKodlar(): Promise<BasiliKodSatiri[]> {
  return withBypass("platform: basılı kod listesi", async (db) => {
    // Ü272: kullanım `basili_kod_kullanimi`ndan — hedef seçici ve taşıma
    // koruması da aynı fonksiyonu çağırıyor (göç 0050).
    const r = await db.all<{
      print_code: string;
      cafe_id: string;
      cafe_adi: string;
      table_id: string;
      masa_adi: string;
      active: boolean;
      yeni: string;
      eski: string;
      gelis: Date | null;
      son_kullanim: Date | null;
    }>(
      `SELECT t.print_code, c.id AS cafe_id, c.name AS cafe_adi,
              t.id AS table_id, t.label AS masa_adi, t.active,
              u.yeni, u.eski, u.gelis,
              (SELECT max(ts.last_seen_at) FROM table_sessions ts WHERE ts.table_id = t.id)
                AS son_kullanim
         FROM cafe_tables t
         JOIN cafes c ON c.id = t.cafe_id
        CROSS JOIN LATERAL basili_kod_kullanimi(t.print_code, t.id) u
        WHERE t.print_code IS NOT NULL
        ORDER BY c.name, t.label`,
    );

    const duraklar = await db.all<{ print_code: string; cafe_adi: string; oturum: string }>(
      `SELECT h.print_code, c.name AS cafe_adi, sum(s.n) AS oturum
         FROM print_code_history h
         JOIN cafes c ON c.id = h.cafe_id
        CROSS JOIN LATERAL (
              SELECT count(*) AS n FROM table_sessions ts
               WHERE ts.table_id = h.table_id
                 AND ts.started_at >= h.started_at AND ts.started_at < h.ended_at
        ) s
        WHERE h.print_code = ANY($1)
        GROUP BY h.print_code, c.id, c.name
        ORDER BY min(h.started_at)`,
      [r.map((x) => x.print_code)],
    );

    return r.map((x) => ({
      kod: x.print_code,
      cafeId: x.cafe_id,
      cafeAdi: x.cafe_adi,
      tableId: x.table_id,
      masaAdi: x.masa_adi,
      aktif: x.active,
      yeni: Number(x.yeni),
      eski: duraklar
        .filter((d) => d.print_code === x.print_code)
        .map((d) => ({ cafeAdi: d.cafe_adi, oturum: Number(d.oturum) })),
      kullanim: Number(x.yeni) + Number(x.eski),
      gelis: x.gelis,
      sonKullanim: x.son_kullanim,
    }));
  });
}

export type HedefKafe = {
  cafeId: string;
  cafeAdi: string;
  /** Kafenin aktif masasının adlı kodu; yoksa null. */
  mevcutKod: string | null;
  /** Kafenin aktif masası var mı (adlı kodu olmasa bile). */
  masaVar: boolean;
  /** Aktif masada oturum açılmış mı — açıldıysa kodu kullanımda. */
  kullanimda: boolean;
};

/** Kodu devralabilecek kafeler — hedef seçicinin kaynağı. */
export async function hedefKafeler(): Promise<HedefKafe[]> {
  return withBypass("platform: hedef kafe listesi", async (db) => {
    const r = await db.all<{
      cafe_id: string;
      cafe_adi: string;
      print_code: string | null;
      kullanim: string | null;
      masa_var: boolean;
    }>(
      `SELECT c.id AS cafe_id, c.name AS cafe_adi, t.print_code, (t.id IS NOT NULL) AS masa_var,
              (SELECT u.yeni + u.eski FROM basili_kod_kullanimi(t.print_code, t.id) u) AS kullanim
         FROM cafes c
    LEFT JOIN cafe_tables t ON t.cafe_id = c.id AND t.active
        WHERE c.status = 'approved'
        ORDER BY c.name`,
    );
    return r.map((x) => ({
      cafeId: x.cafe_id,
      cafeAdi: x.cafe_adi,
      mevcutKod: x.print_code,
      masaVar: x.masa_var,
      /* Ezilecek adlı kod yoksa kullanımda sayılmaz — `basiliKoduTasi`
         ile aynı kural, iki yerde ayrışmasın. */
      kullanimda: !!x.print_code && Number(x.kullanim ?? 0) > 0,
    }));
  });
}

export type TasimaSonucu =
  /**
   * `masaAcildi`: hedef kafenin aktif masası yoktu ve kodla yeni masa
   * açıldı. Ekrandaki cümle buna bakıyor — ilk hâli her kodsuz sonuçta
   * "masa açıldı" diyordu, oysa geri taşımada masa zaten vardı.
   */
  | { ok: true; birakilanKod: string | null; masaAcildi: boolean }
  | { ok: false; hata: string };

/**
 * Basılı kodu başka bir kafeye taşır — yönlendirmeyi değiştirir.
 *
 * ⚠️ Gerekçe zorunlu: bu işlem bir kafenin müşterisini ötekine
 * yönlendiriyor. "Neden" sorusunun cevabı kayıtta olmalı.
 */
export async function basiliKoduTasi(opts: {
  kod: string;
  hedefCafeId: string;
  bakanId: string;
  gerekce: string;
}): Promise<TasimaSonucu> {
  const kod = opts.kod.toLowerCase();
  if (!kodGecerli(kod)) return { ok: false, hata: "Kod biçimi geçersiz." };
  if (opts.gerekce.trim().length < 3) return { ok: false, hata: "Gerekçe yazılmalı." };

  return withBypass("platform: basılı kod taşıma", async (db) => {
    const kaynak = await db.one<{ id: string; cafe_id: string; label: string }>(
      `SELECT id, cafe_id, label FROM cafe_tables WHERE print_code = $1`,
      [kod],
    );
    if (!kaynak) return { ok: false, hata: "Kod hiçbir masaya bağlı değil." };
    if (kaynak.cafe_id === opts.hedefCafeId) return { ok: false, hata: "Kod zaten bu kafede." };

    const kafe = await db.one<{ status: string; name: string }>(
      `SELECT status, name FROM cafes WHERE id = $1`,
      [opts.hedefCafeId],
    );
    if (!kafe) return { ok: false, hata: "Hedef kafe bulunamadı." };
    if (kafe.status !== "approved") return { ok: false, hata: "Hedef kafe onaylı değil." };

    /* 🔴 Ü272: kullanım kodun BÜTÜN geçmişinden — taşınmış bir kodun
       eski kafedeki okutmaları da sayılıyor. Yalnızca şu anki masaya
       bakılsaydı taşınmış kod "hiç kullanılmamış" görünür ve üstüne
       gelen ikinci kod onu sessizce silerdi. */
    const hedef = await db.one<{ id: string; print_code: string | null; kullanim: string }>(
      `SELECT t.id, t.print_code,
              (SELECT u.yeni + u.eski FROM basili_kod_kullanimi(t.print_code, t.id) u) AS kullanim
         FROM cafe_tables t
        WHERE t.cafe_id = $1 AND t.active`,
      [opts.hedefCafeId],
    );

    /* ⚠️ Yalnızca ezilecek bir ADLI kod varsa. Masanın adlı kodu yoksa
       kaybedilecek bir şey yok: eski 16 haneli kod `qr_secret`ten
       türüyor ve `masaCoz` onu her zaman çözmeye devam ediyor. İlk
       yazımda oturum sayısına tek başına bakılıyordu ve bir kodu
       taşıyıp **geri almak** reddediliyordu — geri dönülecek masa adlı
       kodsuz kalmıştı ama oturumları duruyordu. */
    if (hedef && hedef.print_code && Number(hedef.kullanim) > 0) {
      return {
        ok: false,
        hata:
          `Hedef kafenin kendi karekodu kullanımda (${hedef.kullanim} oturum açılmış — ` +
          "önceki kafelerdeki okutmalar dahil). " +
          "Yerine başka kod geçerse o kâğıt çalışmaz.",
      };
    }

    /* Ü272: kodun ayrıldığı durak kapanıyor. Başı bir önceki durağın
       sonu — yoksa masanın açılışı (hiç taşınmamış kod). */
    const durakKapat = (kod: string, masaId: string, cafeId: string) =>
      db.query(
        `INSERT INTO print_code_history (print_code, table_id, cafe_id, started_at, ended_at)
         SELECT $1, t.id, $3,
                coalesce((SELECT max(ended_at) FROM print_code_history WHERE print_code = $1), t.created_at),
                now()
           FROM cafe_tables t WHERE t.id = $2`,
        [kod, masaId, cafeId],
      );
    await durakKapat(kod, kaynak.id, kaynak.cafe_id);

    /* Önce sök, sonra tak: benzersizlik kısıtı aynı anda iki satırda
       aynı kodu kabul etmiyor. */
    await db.query(`UPDATE cafe_tables SET print_code = NULL WHERE id = $1`, [kaynak.id]);

    let hedefMasa: string;
    const birakilanKod = hedef?.print_code ?? null;
    if (hedef) {
      // Bırakılan kodun durağı da kapanıyor — iz kaybolmasın.
      if (birakilanKod) await durakKapat(birakilanKod, hedef.id, opts.hedefCafeId);
      await db.query(`UPDATE cafe_tables SET print_code = $1 WHERE id = $2`, [kod, hedef.id]);
      hedefMasa = hedef.id;
    } else {
      /* Kafenin hiç aktif masası yok (yeni onaylanmış kafe): masa bu
         kodla açılıyor. Sütunlar `masa-yonetim`deki açılışla aynı.

         🔴 Masanın adı HEDEF kafenin adı — `kafeKarekodu` da kafenin
         masasını böyle adlandırıyor (göç 0038) ve oyuncunun "Buradasın"
         künyesi masa adı kafe adına eşitse yalnızca kafeyi yazıyor
         (Ü222). İlk yazımda kaynak masanın adı kopyalanıyordu: Kafe A'nın
         kodu başka kafeye taşınınca oyuncu *"Yonlendirme Test Hedefi ·
         Kafe A"* görüyordu. Ürün sahibinin elle testinde çıktı.

         🔴 Ad çakışması: `(cafe_id, label)` benzersiz ve kural **pasif
         masaları da** sayıyor. Hedef kafede aynı adlı pasif bir masa
         varsa (eski masasını kapatmış kafe) taşıma kısıt ihlaliyle
         çöküyordu; artık "(2)" ekleniyor. Testte önceki koşudan kalan
         pasif masa bunu yakaladı.

         ⚠️ Pasif masa DİRİLTİLMİYOR: kafe onu bilerek kapatmış olabilir
         ve geçmiş oturumları yeni kodun "kullanımda" sayılmasına yol
         açardı. Yeni masa boş bir adla açılıyor, kafe sonra yeniden
         adlandırabilir. */
      const adlar = await db.all<{ label: string }>(
        `SELECT label FROM cafe_tables WHERE cafe_id = $1`,
        [opts.hedefCafeId],
      );
      const alinmis = new Set(adlar.map((a) => a.label));
      let ad = kafe.name;
      for (let n = 2; alinmis.has(ad); n++) ad = `${kafe.name} (${n})`;

      hedefMasa = newId("tbl");
      await db.query(
        `INSERT INTO cafe_tables (id, cafe_id, label, sort_order, qr_secret, kind, print_code)
         VALUES ($1, $2, $3, 0, $4, 'masa', $5)`,
        [hedefMasa, opts.hedefCafeId, ad, randomBytes(16), kod],
      );
    }

    await audit(db, {
      actorType: "platform",
      actorId: opts.bakanId,
      action: "table.print_code_move",
      targetType: "table",
      targetId: hedefMasa,
      detail: {
        kod,
        kaynakMasa: kaynak.id,
        kaynakKafe: kaynak.cafe_id,
        hedefKafe: opts.hedefCafeId,
        birakilanKod,
        gerekce: opts.gerekce.trim(),
      },
    });

    log.info("basili kod tasindi");
    return { ok: true, birakilanKod, masaAcildi: !hedef };
  });
}
