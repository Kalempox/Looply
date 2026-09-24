"use server";

import * as oturum from "@/domain/session";
import * as masaOturumu from "@/domain/masa";
import * as cark from "@/domain/cark";
import * as carkHakki from "@/domain/cark-hakki";
import { carkOduluVer } from "@/domain/kupon";
import { log } from "@/lib/log";
import type { CevirmeCevabi } from "@/components/cark";

/**
 * Kayıtlı oyuncunun günlük çarkı (Ü49).
 *
 * ── Neden dilim numarasını sunucu söylüyor ──────────────────
 *
 * Ekran yalnızca **durması gereken yeri** öğreniyor. Seçimi `cark.ts`
 * yapıyor, kuponu `carkOduluVer` üretiyor; ikisi de sunucuda. Animasyonun
 * sonucu belirlediği bir tasarımda oyuncu, konsoldan istediği ödülü
 * yazdırırdı.
 *
 * ── Kafe formdan gelmiyor ───────────────────────────────────
 *
 * Masa oturumundan okunuyor. Parametre olarak alınsaydı oyuncu, bütçesi
 * dolu başka bir kafenin kimliğini geçebilirdi.
 */
export async function carkiCevir(): Promise<CevirmeCevabi> {
  const o = await oturum.oku();
  if (!o || o.rol !== "oyuncu") return { ok: false, hata: "Oturumun kapanmış. Tekrar gir." };

  /*
    ── İki yol, iki kanıt (Ü137) ─────────────────────────────

    **Kafe:** masa oturumu. Oyuncu karekodu okuttu (K1), konumu
    doğrulandı (K2), masada kaldı (K3).

    **Butik:** kasiyerin verdiği hak. Orada oyun yok; kanıt oyuncunun
    telefonundan değil **kasadaki insandan** geliyor.

    ⚠️ Sıra önemli: önce masa oturumu aranıyor. Butik hakkı olan biri
    aynı anda bir kafede oturuyorsa kafe yolu işliyor ve o doğru — masa
    oturumu daha dar bir bağlam.
  */
  const masa = await masaOturumu.aktif(o.ozneId);
  const hak = masa ? null : await carkHakki.acikHak(o.ozneId);

  if (!masa && !hak) {
    return {
      ok: false,
      hata: "Çark hakkın yok. Kafede masadaki karekodu okut, butikte kasadan çark hakkı iste.",
    };
  }

  const cafeId = masa ? masa.cafeId : hak!.cafeId;

  /*
    ⚠️ **Butikte kanıt seviyesi 3.** E6 ödül için kanıt istiyor ve
    butikte K1/K2/K3 zinciri hiç kurulmuyor: karekod yok, konum yok,
    masada bekleme yok. (Ü268'den beri her ödül K2 istiyor; 3 yine
    yetiyor ve düşürmenin bir kazancı yok.)

    Yerine geçen şey daha güçlü: **kasiyer müşteriyi gördü ve alışverişi
    kendi eliyle onayladı.** GPS "bu telefon şu yakınlıkta" diyor;
    kasiyer "bu insan karşımda durdu ve 3.000 TL harcadı" diyor. İkincisi
    taklit edilmesi çok daha zor bir kanıt.

    4 verilmiyor: K4 fiş/adisyon kodu ve o gerçekten yok.
  */
  const kanitSeviyesi = masa ? masa.kanitSeviyesi : 3;

  const durum = await cark.durum({ playerId: o.ozneId, cafeId });
  if (!durum.acik) {
    return { ok: false, hata: cark.durumMetni(durum) };
  }

  const secim = cark.sec(durum.dilimler);
  if (!secim) return { ok: false, hata: "Burada şu an dağıtılan ödül yok." };

  /*
    ⚠️ Hak **kupondan ÖNCE** harcanıyor. Sonra harcasaydık iki eşzamanlı
    istek ikisi de kuponu üretir, sonra biri hakkı harcayamaz ve ortada
    sahipsiz bir kupon kalırdı. Koşullu `UPDATE` yarışı burada kapatıyor:
    `false` dönerse kupon hiç üretilmiyor.

    Bunun bedeli: kupon üretimi düşerse hak yanmış oluyor. Aşağıda geri
    açılıyor.
  */
  if (hak) {
    const kilit = await carkHakki.harca(hak.hakId, o.ozneId, "");
    if (!kilit.ok) {
      return { ok: false, hata: "Bu çark hakkı az önce kullanıldı." };
    }
  }

  const kupon = await carkOduluVer({
    playerId: o.ozneId,
    cafeId,
    odulId: secim.dilim.odulId,
    kanitSeviyesi,
  });

  if (hak && kupon.ok) {
    // Kuponu hakka bağla — "bu alışveriş hangi kuponu doğurdu" izi.
    await carkHakki.kuponuBagla(hak.hakId, kupon.kuponId);
  }
  if (hak && !kupon.ok) {
    // Kupon çıkmadıysa hak yanmamalı: bütçe dolduğu için çıkmamış
    // olabilir ve müşteri alışverişini yapmış durumda.
    await carkHakki.geriAc(hak.hakId);
  }

  if (!kupon.ok) {
    // Kupon üretilemediyse çark dönmüş sayılmıyor: 24 saatlik kilit
    // kuponun kendisinden okunuyor, yani oyuncu hakkını kaybetmiyor.
    log.info("cark odulu verilemedi", { sebep: kupon.hata });
    return { ok: false, hata: kupon.hata };
  }

  /**
   * ⚠️ Burada `revalidatePath` ÇAĞRILMIYOR — bir tur çağrıldı ve çarkı
   * bozdu.
   *
   * Eylem `/cark` sayfasından tetikleniyor. `revalidatePath` yönlendirici
   * önbelleğini boşaltınca sayfa yeniden çiziliyor, `cark.durum()` bu kez
   * "24 saat kilidi" diyor ve çarkın yerine kapalı sürüm geçiyor. Sonuç:
   * animasyon daha başlamadan bileşen söküldü, oyuncu ne dönüşü ne de
   * kazandığı ödülü gördü — yalnızca "çarkı az önce çevirdin" yazısını.
   *
   * `/oyna` ve `/oduller` zaten `force-dynamic`; oraya gidildiğinde yeni
   * kupon görünüyor. Tazelenecek bir önbellek yok.
   */
  return {
    ok: true,
    dilim: secim.indeks,
    baslik: kupon.baslik,
    // Ü278: ekran "kasada gösterebilirsin" demesin — kupon kafenin
    // aktivasyon süresi kadar bekliyor (Ü269).
    kupon: {
      id: kupon.kuponId,
      aktiflesme: kupon.aktiflesme.toISOString(),
      ertelendi: kupon.ertelendi,
    },
  };
}
