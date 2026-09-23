import { randomBytes } from "node:crypto";
import { withBypass } from "@/db/context";
import { slugla } from "@/lib/slug";
import { sha256, randomToken, imzala, imzaGecerliMi } from "@/lib/crypto";
import { log } from "@/lib/log";
import { audit } from "@/lib/audit";

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
   Basılı kodun yönlendirmesi — Ü266
   ══════════════════════════════════════════════════════════ */

/**
 * Ürün sahibinin istediği "301 redirect" bu.
 *
 * ── Neden ayrı bir yönlendirme tablosu YOK ──────────────────
 *
 * Basılı karekod `…/m/<kod>` taşıyor ve `masaCoz` o kodu
 * `cafe_tables.print_code` üzerinden bir masaya bağlıyor. Yani
 * yönlendirmenin hedefi zaten bir satır: kodu başka bir masaya
 * bağlamak, karekodun gittiği yeri değiştirmek demek.
 *
 * Araya ikinci bir "kod → adres" tablosu koymak aynı bilgiyi iki yerde
 * tutardı ve ikisi ayrıştığı gün hangisinin doğru olduğu bilinmezdi.
 *
 * ⚠️ Bu **kiracı sınırını aşan** bir işlem: kod bir kafeden ötekine
 * geçiyor. Bu yüzden yalnızca platform tarafında ve denetim iziyle
 * yapılıyor; kafe yöneticisi kendi kodunu başka kafeye veremiyor.
 */
export type BasiliKodSatiri = {
  kod: string;
  cafeId: string;
  cafeAdi: string;
  tableId: string;
  masaAdi: string;
  aktif: boolean;
  sonTarama: Date | null;
};

/** Bağlı bütün basılı kodlar — platform ekranının listesi. */
export async function basiliKodlar(): Promise<BasiliKodSatiri[]> {
  return withBypass("platform: basılı kod listesi", async (db) => {
    const r = await db.all<{
      print_code: string;
      cafe_id: string;
      cafe_adi: string;
      table_id: string;
      masa_adi: string;
      active: boolean;
      son_tarama: Date | null;
    }>(
      `SELECT t.print_code, c.id AS cafe_id, c.name AS cafe_adi,
              t.id AS table_id, t.label AS masa_adi, t.active,
              (SELECT max(s.created_at) FROM qr_scans s WHERE s.table_id = t.id) AS son_tarama
         FROM cafe_tables t
         JOIN cafes c ON c.id = t.cafe_id
        WHERE t.print_code IS NOT NULL
        ORDER BY c.name, t.label`,
    );
    return r.map((x) => ({
      kod: x.print_code,
      cafeId: x.cafe_id,
      cafeAdi: x.cafe_adi,
      tableId: x.table_id,
      masaAdi: x.masa_adi,
      aktif: x.active,
      sonTarama: x.son_tarama,
    }));
  });
}

/** Kodu devralabilecek masalar — hedef seçicinin kaynağı. */
export async function kodsuzMasalar(): Promise<
  { cafeId: string; cafeAdi: string; tableId: string; masaAdi: string }[]
> {
  return withBypass("platform: kodsuz masa listesi", async (db) => {
    const r = await db.all<{
      cafe_id: string;
      cafe_adi: string;
      table_id: string;
      masa_adi: string;
    }>(
      `SELECT c.id AS cafe_id, c.name AS cafe_adi, t.id AS table_id, t.label AS masa_adi
         FROM cafe_tables t
         JOIN cafes c ON c.id = t.cafe_id
        WHERE t.print_code IS NULL AND t.active
        ORDER BY c.name, t.label`,
    );
    return r.map((x) => ({
      cafeId: x.cafe_id,
      cafeAdi: x.cafe_adi,
      tableId: x.table_id,
      masaAdi: x.masa_adi,
    }));
  });
}

export type TasimaSonucu = { ok: true } | { ok: false; hata: string };

/**
 * Basılı kodu başka bir masaya taşır — yönlendirmeyi değiştirir.
 *
 * ⚠️ Hedef masanın kodu **olmamalı**. Olsaydı iki kod tek masaya
 * bağlanır, eskisi sessizce kaybolur ve elindeki basılı kâğıt bir gün
 * çalışmamaya başlardı. Benzersizlik kısıtı zaten engelliyor; buradaki
 * kontrol hatayı kısıt patlamadan **anlaşılır** hâle getiriyor.
 *
 * ⚠️ Gerekçe zorunlu: bu işlem bir kafenin müşterisini ötekine
 * yönlendiriyor. "Neden" sorusunun cevabı kayıtta olmalı.
 */
export async function basiliKoduTasi(opts: {
  kod: string;
  hedefTableId: string;
  bakanId: string;
  gerekce: string;
}): Promise<TasimaSonucu> {
  const kod = opts.kod.toLowerCase();
  if (!kodGecerli(kod)) return { ok: false, hata: "Kod biçimi geçersiz." };
  if (opts.gerekce.trim().length < 3) return { ok: false, hata: "Gerekçe yazılmalı." };

  return withBypass("platform: basılı kod taşıma", async (db) => {
    const kaynak = await db.one<{ id: string; cafe_id: string }>(
      `SELECT id, cafe_id FROM cafe_tables WHERE print_code = $1`,
      [kod],
    );
    if (!kaynak) return { ok: false, hata: "Kod hiçbir masaya bağlı değil." };

    const hedef = await db.one<{ id: string; cafe_id: string; print_code: string | null }>(
      `SELECT id, cafe_id, print_code FROM cafe_tables WHERE id = $1 AND active`,
      [opts.hedefTableId],
    );
    if (!hedef) return { ok: false, hata: "Hedef masa bulunamadı." };
    if (hedef.id === kaynak.id) return { ok: false, hata: "Kod zaten bu masada." };
    if (hedef.print_code) {
      return { ok: false, hata: "Hedef masanın zaten bir basılı kodu var." };
    }

    /* Önce sök, sonra tak: benzersizlik kısıtı aynı anda iki satırda
       aynı kodu kabul etmiyor. */
    await db.query(`UPDATE cafe_tables SET print_code = NULL WHERE id = $1`, [kaynak.id]);
    await db.query(`UPDATE cafe_tables SET print_code = $1 WHERE id = $2`, [kod, hedef.id]);

    await audit(db, {
      actorType: "platform",
      actorId: opts.bakanId,
      action: "table.print_code_move",
      targetType: "table",
      targetId: hedef.id,
      detail: {
        kod,
        kaynakMasa: kaynak.id,
        kaynakKafe: kaynak.cafe_id,
        hedefKafe: hedef.cafe_id,
        gerekce: opts.gerekce.trim(),
      },
    });

    log.info("basili kod tasindi");
    return { ok: true };
  });
}
