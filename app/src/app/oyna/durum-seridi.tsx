"use client";

import Link from "next/link";
import { Avatar } from "@/components/avatar";
/* Ü222: kafenin kendi karekodunda masa adı kafe adına eşit — künye
   kuralı tek yerde (`masaKunyesi`), burada da o basılıyor. */
import { masaKunyesi } from "@/components/ui";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { konumBildir, konumReddedildi, demoKafedeSay, type KonumCevabi } from "./actions";
import { KonumTakibi } from "./konum-takibi";

/**
 * Durum şeridi — ekranın en üstünde, her zaman görünür.
 *
 * Oyuncunun tek merak ettiği şey burada: "kazanabiliyor muyum?"
 * Beş durumu var ve her biri farklı renkte; renk tek başına anlam taşımasın
 * diye metin de her durumda açıkça yazıyor.
 *
 * Konum reddi bir HATA gibi gösterilmiyor. Tarayıcıda konum kullanıcı
 * onayına bağlı; reddetmek normal bir tercih. Akış çökmüyor, yalnızca
 * büyük ödüller kilitli kalıyor (docs/07 §3).
 */

export type SeritDurumu =
  | { tur: "disarida" }
  | { tur: "konum_bekliyor"; kafe: string; masa: string }
  | { tur: "dogrulandi"; kafe: string; masa: string; mesafeM: number | null }
  | { tur: "uzak"; kafe: string; masa: string; mesafeM: number }
  | { tur: "konum_kapali"; kafe: string; masa: string }
  /**
   * Kafe konumunu hiç işaretlememiş (Ü95).
   *
   * ⚠️ Bu, oyuncunun düzeltebileceği bir şey DEĞİL. Eskiden bu durum
   * `konum_bekliyor` içine düşüyordu: ekran "kazanabilmek için konumunu
   * doğrula" diyor, oyuncu doğruluyor, sunucu `kafe_konumu_yok` dönüyor ve
   * şerit hiç değişmiyordu. Oyuncu kendini kafe dışında sanılıyor
   * zannediyor, oysa eksik olan kafenin kurulumu.
   */
  | { tur: "kafe_konumsuz"; kafe: string; masa: string }
  /**
   * Masa oturumu doldu (Ü95).
   *
   * ⚠️ Oturum 3 saat sürüyor ve dolduğunda oyuncu `disarida`ya düşüyordu:
   * ekran *"Kafe dışındasın"* diyor, ne olduğunu söylemiyor, ne yapılacağını
   * söylemiyor ve hiçbir düğme göstermiyordu. Oyuncu hâlâ masada oturuyor
   * olabilir. Veritabanında 245 dolmuş oturuma karşılık 1 aktif oturum
   * vardı — bu, kenar durum değil olağan durum.
   *
   * 🔴 Ü291: bugün dolan oturum kafede okunan konumla geri geliyor
   * (`masa.konumDogrula`). Şerit bu durumda da konumu sessizce okuyor ve
   * "Devam et" düğmesi gösteriyor — karekod yalnızca kafeden uzaksan.
   */
  | { tur: "oturum_doldu"; kafe: string; masa: string };

export function DurumSeridi({
  durum,
  demoKapisi,
}: {
  durum: SeritDurumu;
  /** Demo kısayolu görünsün mü — sunucu karar veriyor, canlıda hep false. */
  demoKapisi?: boolean;
}) {
  const [bekliyor, basla] = useTransition();
  const [gecici, setGecici] = useState<string | null>(null);
  const router = useRouter();

  /*
    Ü279: masa oturumu varken konum sayfa açık kaldıkça sessizce
    tazeleniyor. Sonuç şeritte görünenden farklıysa (kafeye dönüldü, ya da
    kafeden çıkıldı) sayfa tazeleniyor — şerit, kartlar ve "kazandırır"
    bilgisi birlikte değişsin.
  */
  const takip =
    durum.tur === "dogrulandi" ||
    durum.tur === "konum_bekliyor" ||
    durum.tur === "uzak" ||
    durum.tur === "konum_kapali" ||
    // Ü291: bugün dolan oturum kafede okunan konumla kendiliğinden döner.
    durum.tur === "oturum_doldu";
  const doldu = durum.tur === "oturum_doldu";
  const takipSonucu = (c: KonumCevabi) => {
    if (
      (c.durum === "dogrulandi" && durum.tur !== "dogrulandi") ||
      (c.durum === "uzak" && durum.tur !== "uzak")
    ) {
      router.refresh();
    }
  };

  function konumIste() {
    if (!navigator.geolocation) {
      basla(() => konumReddedildi());
      return;
    }
    setGecici("Konum alınıyor…");
    navigator.geolocation.getCurrentPosition(
      (p) =>
        basla(async () => {
          const c = await konumBildir(p.coords.latitude, p.coords.longitude, p.coords.accuracy);
          // Ü291: dolmuş oturumda konum tutmazsa tek yol karekod — söyle.
          const karekod = doldu ? " — karekodu okut" : "";
          setGecici(
            c.durum === "uzak"
              ? `Kafeden ${c.mesafeM} metre uzaktasın${karekod}`
              : c.durum === "belirsiz"
                ? "Konum net okunamadı — pencereye yakın bir yerde tekrar dene"
                : c.durum === "kafe_konumu_yok"
                  ? "Bu kafe konumunu henüz işaretlememiş — kazanım açılamıyor"
                  : c.durum === "olmadi"
                    ? `Konum doğrulanamadı${karekod}`
                    : null,
          );
        }),
      () => {
        setGecici(null);
        basla(() => konumReddedildi());
      },
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 60_000 },
    );
  }

  const stil = {
    disarida: "border-cizgi text-yazi-sonuk",
    konum_bekliyor: "border-odul/50 text-odul-koyu",
    dogrulandi: "border-vurgu/50 text-vurgu",
    uzak: "border-tehlike/60 text-tehlike",
    konum_kapali: "border-odul/50 text-odul-koyu",
    kafe_konumsuz: "border-cizgi text-yazi-sonuk",
    oturum_doldu: "border-odul/50 text-odul-koyu",
  }[durum.tur];

  return (
    /* Ü274: şerit inceldi — `py-3` → `py-1.5`, alt boşluk 8 → 5, ikinci
       satır 11 px, avatar ve düğmeler küçüldü. Bkz. `OyuncuNav` notu. */
    /* Ü275: düz renk (bulanık cam kaydırmayı takıltıyordu) ve aşağı
       kaydırınca yukarı çekiliyor — `.serit-ust`, bkz. `SeritGizleyici`. */
    <div className={`serit-ust sticky top-0 z-10 -mx-5 mb-5 border-b bg-yuzey px-5 py-1.5 ${stil}`}>
      {takip && <KonumTakibi degisti={takipSonucu} />}
      <div className="flex items-center gap-3">
        <Nokta tur={durum.tur} />

        <div className="min-w-0 flex-1">
          {durum.tur === "disarida" ? (
            <>
              <div className="etiket-caps">Kafe dışındasın</div>
              {/* ⚠️ Ü95: eskiden burada yalnızca "kazanamazsın" yazıyordu ve
                  ne yapılacağı söylenmiyordu. Kazanmanın tek yolu masadaki
                  karekodu okutmak; oyuncu bunu bilmezse uygulamayı bozuk
                  sanıyor. */}
              <div className="text-[11px] leading-tight text-yazi-sonuk">
                Kazanmak için masadaki karekodu okut
              </div>
            </>
          ) : durum.tur === "oturum_doldu" ? (
            <>
              <div className="etiket-caps truncate">Masa oturumun doldu</div>
              <div className="text-[11px] leading-tight text-yazi-sonuk">
                {gecici ??
                  `${masaKunyesi(durum.kafe, durum.masa)} — kafedeysen konumunla devam et`}
              </div>
            </>
          ) : (
            <>
              <div className="etiket-caps truncate">
                {masaKunyesi(durum.kafe, durum.masa)}
              </div>
              <div className="text-[11px] leading-tight text-yazi-sonuk">
                {gecici ??
                  {
                    konum_bekliyor: "Kazanabilmek için konumunu doğrula",
                    dogrulandi:
                      durum.tur === "dogrulandi" && durum.mesafeM != null
                        ? `Doğrulandı · ${durum.mesafeM} m`
                        : "Doğrulandı",
                    uzak: durum.tur === "uzak" ? `Kafeden ${durum.mesafeM} m uzaktasın` : "",
                    konum_kapali: "Konum kapalı — büyük ödüller kilitli",
                    // Sorumluluğu doğru yere koy: oyuncunun yapabileceği
                    // bir şey yok, doğrulama düğmesi de gösterilmiyor.
                    kafe_konumsuz: "Bu kafe konumunu işaretlememiş — burada ödül dağıtılamıyor",
                    // Bu dala hiç girmiyor (yukarıda ayrı çiziliyor); tip
                    // tamlığı için duruyor.
                    oturum_doldu: "",
                  }[durum.tur]}
              </div>
            </>
          )}
        </div>

        {/*
          🔴 Sağ üstte yuvarlak profil ikonu — Ü159.

          Ürün sahibi: *"ekranın sağ üstünde yuvarlak profil ikonu olmalı
          ve ordan isim koyup özelleştirilebilmeli."*

          ── Neden avatarın kendisi, soyut bir ikon değil ─────
          Oyuncunun profilde seçtiği Loopy burada duruyor. Genel bir
          "kişi" ikonu koysaydık özelleştirmenin karşılığı ekranda hiç
          görünmezdi; avatarı değiştiren oyuncu değişikliği yalnızca
          profil sayfasında görürdü.

          ⚠️ Şeridin en sağında ve **her durumda** çiziliyor: konum
          düğmeleri duruma göre gelip gidiyor, profil kapısı sabit
          kalmalı ki oyuncu onu aramasın.
        */}
        <Link
          href="/profil"
          aria-label="Profilin ve avatarın"
          className="ml-1 grid size-7 shrink-0 place-items-center overflow-hidden rounded-full border border-cizgi bg-yuzey"
        >
          <span aria-hidden className="block">
            <Avatar boy={20} ifade="sakin" />
          </span>
        </Link>

        {/* Masası olmayan oyuncunun tek yolu karekodu okutmak. Canlıda
            bunun ekranda bir düğmesi yok — kamera oyuncunun elinde. Demoda
            masa listesi başlangıç sayfasında duruyor, kısayolu oraya. */}
        {/* Ü291: dolmuş oturumda yerini "Devam et" aldı — şerit dar. */}
        {demoKapisi && durum.tur === "disarida" && (
          <Link
            href="/"
            className="etiket-caps shrink-0 rounded border border-odul px-2.5 py-1.5 text-odul-koyu"
            title="Yalnızca geliştirmede görünür"
          >
            Masa seç
          </Link>
        )}

        {(durum.tur === "konum_bekliyor" ||
          durum.tur === "konum_kapali" ||
          durum.tur === "uzak" ||
          doldu) && (
          <div className="flex shrink-0 items-center gap-1.5">
            <button
              type="button"
              onClick={konumIste}
              disabled={bekliyor}
              className="etiket-caps rounded border border-current px-2.5 py-1 disabled:opacity-50"
            >
              {bekliyor
                ? "…"
                : doldu
                  ? "Devam et"
                  : durum.tur === "konum_bekliyor"
                    ? "Doğrula"
                    : "Tekrar"}
            </button>

            {/* Demo kısayolu — kafenin kendi koordinatını kullanır, kural
                gevşemez. Canlıda hiç render edilmiyor. Dolmuş oturumda
                yok: kısayol açık oturumun kafesini okuyor (Ü291). */}
            {demoKapisi && !doldu && (
              <button
                type="button"
                onClick={() =>
                  basla(async () => {
                    const c = await demoKafedeSay();
                    setGecici(
                      c.durum === "dogrulandi" ? null : "Demo konumu uygulanamadı",
                    );
                  })
                }
                disabled={bekliyor}
                className="etiket-caps rounded border border-odul px-2 py-1 text-odul-koyu disabled:opacity-50"
                title="Yalnızca geliştirmede görünür"
              >
                Kafedeyim
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Nokta({ tur }: { tur: SeritDurumu["tur"] }) {
  const dolu = tur === "dogrulandi";
  const nabiz = tur === "konum_bekliyor";
  return (
    <span
      aria-hidden
      className={`size-2.5 shrink-0 rounded-full border border-current ${dolu ? "bg-current" : ""} ${nabiz ? "nabiz" : ""}`}
    />
  );
}
