import Link from "next/link";
import { kafeYoneticisiGerekli } from "@/domain/yetki";
import * as katalog from "@/domain/katalog";
import * as ayar from "@/domain/ayar";
import * as carkKosul from "@/domain/cark-kosul";
import * as urun from "@/domain/urun";
import { KosulKutusu } from "./kosul-kutusu";
import * as carkAgirlik from "@/domain/cark-agirlik";
import { ARALIK_SAAT } from "@/domain/cark";
import {
  IsletmeSayfa,
  IsletmeBaslik,
  Bolum,
  IsletmeUyari,
} from "@/components/isletme";
import { SayiKarti, IKON } from "@/components/gosterge";
import { CarkSiniri } from "../oduller/kontroller";
import { CarkAgirlikKutusu } from "../oduller/cark-agirlik-kutusu";

export const dynamic = "force-dynamic";
export const metadata = { title: "Şans çarkı · Looply" };

/**
 * Şans çarkı — kendi sayfası (Ü123).
 *
 * ── Neden Ödüller'den ayrıldı ───────────────────────────────
 *
 * Çarkın iki ayarı (üst sınır ve olasılık tablosu) "Ödüller ve
 * kampanyalar" sayfasının sol kolonunda, yeni ödül formu ile gecikme
 * eşiğinin arasına sıkışmıştı. Ürün sahibi: *"Panelde çarkın ayarlarını
 * direkt bu soldaki menüden yönetebilmeliyim... ödüller ve kampanyalar
 * kısmının tasarımı çok karışık."*
 *
 * Haklı ve sebebi yapısal: o sayfa **üç ayrı şeyi** aynı anda soruyordu —
 * hangi ödüller var, ne zaman açılıyorlar, çarkta hangi sıklıkla
 * çıkıyorlar. Üçü farklı kararlar ve farklı zamanlarda veriliyor.
 * Çark kendi durağına taşındı.
 *
 * ── Sayfanın anlattığı tek şey ──────────────────────────────
 *
 * Çark **kendi ödülünü yaratmıyor.** Kafenin anlık ödül kataloğundan,
 * üst sınırın altında kalanları dağıtıyor; kupon normal yoldan üretiliyor
 * ve **günlük indirim bütçesinden düşüyor** (E10). Bu cümle sayfanın
 * başında duruyor çünkü kafe sahibinin en çok sorduğu şey bu.
 */
export default async function CarkSayfasi() {
  const o = await kafeYoneticisiGerekli();

  const [oduller, carkSinirKurus, agirlik, kosullar, urunler, turu] = await Promise.all([
    katalog.listele(o.cafeId),
    ayar.sayiOku(o.cafeId, ayar.ANAHTARLAR.carkUstSinir),
    // Liste çekilişin kullandığı aynı fonksiyondan geliyor — panel kendi
    // listesini kursaydı ekrandaki yüzdelerle gerçek olasılıklar sessizce
    // ayrışırdı.
    carkAgirlik.durum(o.cafeId),
    // Ü137: butik çarkını neyin tetiklediği. Kafede oyun tetikliyor ve
    // koşul kavramı hiç kullanılmıyor.
    carkKosul.listele(o.cafeId),
    urun.listele(o.cafeId, false),
    carkKosul.isletmeTuru(o.cafeId),
  ]);

  const uygun = oduller.filter(
    (od) => od.aktif && od.anlik && od.maliyetKurus <= carkSinirKurus,
  );
  const enPahali = uygun.reduce((t, od) => Math.max(t, od.maliyetKurus), 0);

  return (
    <IsletmeSayfa genis>
      <IsletmeBaslik
        ust="İşletme paneli"
        alt="Müşteri günde bir kez çeviriyor. Çıkan ödül senin kataloğundan gelir ve günlük bütçenden düşer."
      >
        Şans çarkı
      </IsletmeBaslik>

      {/*
        ── Ü137: çark koşulları — YALNIZCA butikte ─────────────

        Kafede çark hakkını **oyun** veriyor ve o yol hiç değişmedi.
        Butikte oyun yok: hakkı kasiyer veriyor, koşula bakarak.

        ⚠️ Kafede bu bölüm hiç çizilmiyor. Çizilseydi kafe sahibi
        "tutar eşiği" koyar ve hiçbir şeyin değişmediğini görürdü —
        kafede kasa tutar girmiyor.
      */}
      {turu === "butik" && (
        <div className="mb-8 rounded-2xl border-2 border-vurgu/30 bg-yuzey px-6 py-6">
          <p className="etiket-caps text-[10px] text-vurgu">Butik · çark koşulları</p>
          <p className="mt-2 mb-5 max-w-2xl text-[14px] leading-relaxed text-yazi-sonuk">
            Burada <strong className="text-yazi">kimin çark hakkı kazanacağını</strong>{" "}
            tanımlıyorsun. Kasiyer alışveriş tutarını giriyor; koşul tutarsa müşteriye
            okutacağı karekod çıkıyor.
          </p>
          <KosulKutusu
            kosullar={kosullar.map((k) => ({
              id: k.id,
              tur: k.tur,
              metin: carkKosul.kosulMetni(k),
              aktif: k.aktif,
            }))}
            urunler={urunler.map((u) => ({ id: u.id, ad: u.ad }))}
          />
        </div>
      )}

      <section className="mb-7 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <SayiKarti
          etiket="Çarkta dönen ödül"
          deger={String(uygun.length)}
          alt={uygun.length === 0 ? "çark dönmüyor" : "anlık ödül"}
          ikon={IKON.odul}
          alan="odul"
          vurgulu
        />
        <SayiKarti
          etiket="Üst sınır"
          deger={`${Math.round(carkSinirKurus / 100)} TL`}
          alt="bundan pahalısı çarka girmez"
          ikon={IKON.para}
          alan="para"
        />
        <SayiKarti
          etiket="Çıkabilecek en yüksek"
          deger={`${Math.round(enPahali / 100)} TL`}
          alt="tek çevirmede en fazla bu"
          ikon={IKON.kupon}
          alan="odul"
        />
        <SayiKarti
          etiket="Çevirme hakkı"
          deger={`${ARALIK_SAAT} saatte 1`}
          alt="müşteri başına"
          ikon={IKON.saat}
          alan="genel"
        />
      </section>

      {uygun.length === 0 && (
        <div className="mb-7">
          <IsletmeUyari tur="bekle">
            <strong>Çark şu an hiç dönmüyor.</strong> Üst sınırın altında
            yayında bir anlık ödülün yok. Ya sınırı yükselt ya da{" "}
            <Link href="/kafe/panel/oduller" className="underline">
              Ödüller
            </Link>{" "}
            sayfasından daha küçük değerli bir anlık ödül ekle.
          </IsletmeUyari>
        </div>
      )}

      <div className="grid items-start gap-x-8 lg:grid-cols-2">
        <div>
          <Bolum
            baslik="Çarka hangi ödüller girsin"
            alt="Anlık ödüllerinden bu tutarın altında kalanlar çarka girer. Üstündekiler katalogda kalır ve oyun içinde çıkmaya devam eder."
          >
            <CarkSiniri
              mevcutTl={Math.round(carkSinirKurus / 100)}
              uygunSayisi={uygun.length}
            />
          </Bolum>
        </div>

        <div>
          <Bolum
            baslik="Hangisi ne sıklıkla çıksın"
            alt="Yüzdeyi sen yazıyorsun. Bir ödülün yüzdesini değiştirdiğinde kalan pay diğerlerinin oranı korunarak bölüşülüyor — toplam her zaman 100. Sıfır yazmak ödülü çarktan çıkarır."
          >
            <CarkAgirlikKutusu
              satirlar={agirlik.satirlar.map((r) => ({
                odulId: r.odulId,
                baslik: r.baslik,
                agirlik: r.agirlik,
                etkin: r.etkin,
                yuzde: r.yuzde,
              }))}
              disarida={agirlik.disarida.map((d) => ({
                odulId: d.odulId,
                baslik: d.baslik,
                aciklama: carkAgirlik.sebepMetni(d.sebep, agirlik.ustSinirKurus),
              }))}
              toplam={agirlik.toplam}
              otomatikMi={agirlik.otomatikMi}
            />
          </Bolum>
        </div>
      </div>

      {/*
        ⚠️ Bütçe cümlesi sayfanın sonunda TEKRAR duruyor ve bu bilerek.
        Kafe sahibinin çarka bakarken aklına gelen soru "bu bana kaça mal
        olur" ve cevabı ayarların altında olmalı — başlıkta okuduğunu
        ayarları değiştirirken unutuyor.
      */}
      <div className="mt-2 rounded-2xl border border-cizgi bg-cukur px-5 py-4">
        <div className="etiket-caps text-yazi-sonuk">Bu sana ne kadara mal olur</div>
        <p className="mt-2 text-[14px] leading-relaxed text-yazi-sonuk">
          Çarktan çıkan her kupon <strong className="text-yazi">günlük
          indirim bütçenden</strong> düşer — ayrı bir havuzu yoktur. Bütçe
          o gün için dolduysa çark ödül veremez ve müşteriye hakkının
          yandığı söylenmez; hakkı ertesi güne kalır.{" "}
          <Link href="/kafe/panel/butce" className="underline">
            Bütçe
          </Link>
        </p>
      </div>
    </IsletmeSayfa>
  );
}
