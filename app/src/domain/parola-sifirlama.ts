import { kodIste, kodDogrula } from "./otp";
import { telefonlaBul } from "./player";
import { belirle, gecerliMi } from "./parola";
import { tumunuIptalEt } from "./session";

/**
 * Parola sıfırlama — Ü270.
 *
 * Ürün sahibi: *"parolamı unuttum da doğru çalışmalı, maile kod gitmeli."*
 *
 * ── Önceki yol neden yetmedi ────────────────────────────────
 *
 * "Parolanı mı unuttun?" düğmesi **Hesap aç** sekmesini açıyordu. Kayıtlı
 * numarada o form gizlice girişe dönüyor ve parolayı yeniden yazıyordu —
 * çalışıyordu ama ad, soyad, doğum yılı ve aydınlatma onayını baştan
 * istiyordu; parolasını unutan birine "yeniden kaydol" demek gibiydi.
 *
 * Şimdi iki adım: **telefon → kod** (hesabın kendi e-postasına), sonra
 * **kod + yeni parola → içeri**.
 *
 * ── Güvenlik kararları ─────────────────────────────────────
 *
 * · Kod hesabın **kayıtlı** adresine gidiyor; formdan adres alınmıyor
 *   (`kodIste` "login" amacında formdaki adresi zaten yok sayıyor). Aksi,
 *   numarasını bilen herkese hesabı devretmek olurdu.
 * · Amaç `login`: kodu elinde tutan kişi zaten içeri girebiliyor; ayrı
 *   bir amaç yeni bir yetki doğurmuyor, yalnızca yeni bir göç doğururdu.
 * · Yeni parola kod **tüketilmeden** sınanıyor — kural ihlali kodu
 *   yakmasın (kayıt akışındaki aynı gerekçe).
 * · Parola değişince hesabın **bütün oturumları kapanıyor.** Parolasını
 *   sıfırlayan kişi çoğu zaman "biri hesabıma girdi" diye sıfırlıyor;
 *   eski oturum açık kalsaydı sıfırlama o kişiyi dışarı atmazdı.
 * · Numaranın kayıtlı olmadığı söyleniyor. Bu bir hesap sayımı sızıntısı
 *   ama yeni değil: kayıt akışı aynı bilgiyi zaten veriyor (Ü168'de kabul
 *   edildi) ve saklamak, numarasını yanlış yazan kişiyi hiç gelmeyecek
 *   bir kodu beklemeye bırakırdı.
 */

export type SifirlamaKoduSonucu =
  | { durum: "gonderildi"; adres: string | null; gelistirmeKodu?: string }
  | { durum: "hesap_yok" }
  | { durum: "eposta_yok" }
  | { durum: "cok_sik"; tekrarDene?: Date }
  | { durum: "kilitli" }
  | { durum: "gonderilemedi" };

/** "abdulkadir@ornek.com" → "a•••@ornek.com" — kodun nereye gittiğini söyler, adresi vermez. */
export function adresMaskele(eposta: string): string {
  const [ad, alan] = eposta.split("@");
  if (!alan) return "•••";
  return `${ad.slice(0, 1)}•••@${alan}`;
}

export async function sifirlamaKoduIste(opts: {
  telefon: string;
  ip?: string;
}): Promise<SifirlamaKoduSonucu> {
  const oyuncu = await telefonlaBul(opts.telefon);
  if (!oyuncu) return { durum: "hesap_yok" };

  const s = await kodIste({
    telefon: opts.telefon,
    amac: "login",
    ip: opts.ip,
    kaynak: "Parola sıfırlama",
  });

  switch (s.durum) {
    case "gonderildi":
      return {
        durum: "gonderildi",
        adres: oyuncu.eposta ? adresMaskele(oyuncu.eposta) : null,
        gelistirmeKodu: s.gelistirmeKodu,
      };
    case "eposta_yok":
      return { durum: "eposta_yok" };
    case "cok_sik":
      return { durum: "cok_sik", tekrarDene: s.tekrarDene };
    case "kilitli":
      return { durum: "kilitli" };
    default:
      return { durum: "gonderilemedi" };
  }
}

export type SifirlamaSonucu =
  | { ok: true; playerId: string; kapatilanOturum: number }
  | { ok: false; alan: "parola" | "kod" | "genel"; hata: string };

export async function sifirla(opts: {
  telefon: string;
  kod: string;
  yeniParola: string;
}): Promise<SifirlamaSonucu> {
  // Kod TÜKETİLMEDEN önce: kural ihlali kodu yakmasın.
  if (!gecerliMi(opts.yeniParola)) {
    return { ok: false, alan: "parola", hata: "Parola kuralları karşılanmadı" };
  }

  const d = await kodDogrula({ telefon: opts.telefon, kod: opts.kod, amac: "login" });
  switch (d.durum) {
    case "yanlis":
      return { ok: false, alan: "kod", hata: `Kod yanlış. ${d.kalanDeneme} deneme hakkın kaldı.` };
    case "kilitlendi":
      return { ok: false, alan: "genel", hata: "Çok fazla yanlış deneme. Bu numara 15 dakika kilitlendi." };
    case "sure_doldu":
      return { ok: false, alan: "genel", hata: "Kodun süresi doldu. Yeni kod iste." };
    case "yok":
      return { ok: false, alan: "genel", hata: "Önce doğrulama kodu iste." };
  }

  const oyuncu = await telefonlaBul(opts.telefon);
  if (!oyuncu) return { ok: false, alan: "genel", hata: "Önce doğrulama kodu iste." };

  const b = await belirle({ playerId: oyuncu.id, parola: opts.yeniParola });
  if (!b.ok) return { ok: false, alan: "parola", hata: b.hata };

  // 🔴 Eski oturumlar kapanıyor — hesabı ele geçiren kişi içeride kalmasın.
  const kapatilanOturum = await tumunuIptalEt(oyuncu.id, "parola_sifirlandi");
  return { ok: true, playerId: oyuncu.id, kapatilanOturum };
}
