"use server";

import { platformGerekli } from "@/domain/yetki";
import { pazarlamaKitlesi } from "@/domain/platform";
import { gonder } from "@/sms";
import { log } from "@/lib/log";
// ⚠️ Ayrı dosyada: "use server" dosyasından yalnızca async fonksiyon
// dışa aktarılabiliyor, sabit aktarılamıyor (`sinirlar.ts`).
import { EN_UZUN_METIN } from "./sinirlar";

export type MesajDurumu = {
  hata?: string;
  ozet?: { gonderildi: number; engellendi: number; basarisiz: number; toplam: number };
  metin?: string;
};

/**
 * Ticari ileti gönderimi — Ü130.
 *
 * ── 🔴 Üç kapı, üçü de burada ───────────────────────────────
 *
 * 1. **Yalnızca yönetici** (`platformGerekli(true)`). Destek rolü
 *    başvuru onaylayamıyor; binlerce kişiye mesaj atması hiç olmaz.
 * 2. **Yalnızca rıza verenler.** Kitle `pazarlamaKitlesi()`den geliyor
 *    ve süzgeç SQL'de — burada "hepsine gönder" diyebilecek bir yol yok.
 * 3. **Çıkma cümlesi şablonda** (`sms/index.ts` → `campaign`), bu
 *    dosyada değil. Buradan eklenseydi biri bir gün kaldırırdı.
 *
 * ── Neden tek tek gönderiliyor ──────────────────────────────
 *
 * Toplu bir "hepsine at" çağrısı yok: her gönderim `sms_outbox`a kendi
 * satırını yazıyor ve günlük tavana tek tek takılıyor. Tavan dolarsa
 * kalanlar **engellendi** olarak kaydediliyor ve özet bunu söylüyor —
 * sessizce yarısı gitmiş bir kampanya, hiç gitmemiş olandan kötüdür.
 *
 * ⚠️ `amac: "pazarlama"` en düşük öncelik: kampanya günlük SMS tavanını
 * yiyip kapıda bekleyen insanın **giriş kodunu** kilitlememeli.
 *
 * ⚠️ İYS (İleti Yönetim Sistemi) kaydı bu kodun kapsamı dışında ve yasal
 * olarak zorunlu. Rıza burada, kayıt işletmede.
 */
export async function mesajGonder(
  _onceki: MesajDurumu,
  form: FormData,
): Promise<MesajDurumu> {
  const o = await platformGerekli(true);

  const metin = String(form.get("metin") ?? "").trim();
  const gerekce = String(form.get("gerekce") ?? "").trim();

  if (metin.length < 10) return { hata: "Mesaj en az 10 karakter olmalı.", metin };
  if (metin.length > EN_UZUN_METIN) {
    return { hata: `Mesaj en fazla ${EN_UZUN_METIN} karakter olabilir.`, metin };
  }
  if (gerekce.length < 5) {
    // Gerekçe denetim izine yazılıyor. Zorunlu olmasaydı "neden bu
    // kampanya gitti" sorusunun cevabı kayıtta olmazdı.
    return { hata: "Gönderim gerekçesi yaz — denetim izine geçiyor.", metin };
  }

  const kitle = await pazarlamaKitlesi(o.ozneId, gerekce);
  if (kitle.length === 0) {
    return { hata: "Ticari ileti rızası olan kimse yok — gönderim yapılmadı.", metin };
  }

  let gonderildi = 0;
  let engellendi = 0;
  let basarisiz = 0;

  for (const alici of kitle) {
    const sonuc = await gonder(
      { telefon: alici.telefon, sablon: "campaign", degerler: { mesaj: metin } },
      "pazarlama",
    );
    if (sonuc.durum === "gonderildi") gonderildi++;
    else if (sonuc.durum === "engellendi") engellendi++;
    else basarisiz++;
  }

  log.info("pazarlama gonderimi", {
    toplam: kitle.length,
    gonderildi,
    engellendi,
    basarisiz,
  });

  return { ozet: { gonderildi, engellendi, basarisiz, toplam: kitle.length } };
}
