import { redirect } from "next/navigation";
import * as oturum from "@/domain/session";
import * as avatar from "@/domain/avatar";
import { Sayfa, Baslik } from "@/components/ui";
import { OyuncuNav, NavBosluk } from "@/components/oyuncu-nav";
import { avatariKaydet } from "../profil/actions";
import { Secici } from "./secici";

export const dynamic = "force-dynamic";
export const metadata = { title: "Loopy'i özelleştir · Looply" };

/**
 * Loopy'nin özelleştirme ekranı — Ü186.
 *
 * ── 🔴 Neden ayrı bir sayfa ─────────────────────────────────
 *
 * Ürün sahibi *"Loopy karakterimizi özelleştirme kısmını da açmamız
 * gerekiyor, o kısım ayrı olacak"* dedi.
 *
 * Ü147'de özelleştirme profilin ortasındaydı ve Ü172'de oradan
 * kaldırıldı. Geri koymanın yolu yok: profil artık kimlik kartı,
 * döşemeler, rozetler ve kafe listesiyle dolu ve 88 renk örneği o
 * sayfayı ikiye bölerdi. Özelleştirme gündelik bir iş de değil —
 * bir kez yapılıp bırakılan bir şey, kendi adresini hak ediyor.
 *
 * ── Alt gezinme: üç durak kuralı bozulmuyor ─────────────────
 *
 * Şerit üç durak (kırmızı çizgi #7) ve bu sayfa oraya girmiyor. İki
 * kapısı var: yuvadaki *"Özelleştir"* düğmesi ve profildeki hesap
 * satırı. Şeritte `/profil` aktif duruyor, çünkü oyuncu oradan geldi.
 *
 * ── Kayıt: ayrı bir eylem yazılmadı ─────────────────────────
 *
 * `profil/actions.ts`teki `avatariKaydet` kullanılıyor. Aynı işi yapan
 * ikinci bir sunucu eylemi, ikinci bir doğrulama yolu demek olurdu ve
 * biri güncellenirken diğeri geride kalırdı.
 */
export default async function LoopySayfasi() {
  const o = await oturum.oku();
  if (!o || o.rol !== "oyuncu") redirect("/giris");

  const secim = await avatar.oku(o.ozneId);

  return (
    <Sayfa geri={{ href: "/oyna", etiket: "Ana ekran" }}>
      <Baslik ust="Arkadaşın">Loopy&apos;i özelleştir</Baslik>

      <p className="mb-6 text-[15px] leading-relaxed text-yazi-sonuk">
        Bardağının ve şeridinin rengini ayrı ayrı seçebilirsin. Seçtiğin an
        kaydediliyor — Loopy nerede görünürse o renkte görünüyor.
      </p>

      {/*
        🔴 `LoopyRenkleri` bu sayfada BİLEREK yok.

        Seçici her örneği kendi renginde çiziyor ve önizlemeye rengi
        doğrudan veriyor. Sayfaya ayrıca bir CSS değişkeni basılsaydı
        oyuncu bir renge dokunduğunda önizleme yeni renge, sayfadaki
        başka bir Loopy hâlâ kayıtlı renge bakardı.
      */}
      <Secici baslangic={{ govde: secim.govde, serit: secim.serit }} kaydet={avatariKaydet} />

      <NavBosluk />
      <OyuncuNav aktif="/profil" />
    </Sayfa>
  );
}
