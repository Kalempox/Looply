"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import {
  Avatar,
  AVATAR_AKSESUARLARI,
  AVATAR_RENKLERI,
  COK_RENKLI,
  type AvatarAksesuari,
  type AvatarIfadesi,
} from "./avatar";
import { RENK, type OyuncuRengi } from "./oyuncu-renk";

/**
 * Profildeki avatar köşesi — okşanıyor ve özelleştiriliyor (Ü147).
 *
 * ── Ürün sahibinin isteği ───────────────────────────────────
 *
 * *"Profil kısmına tatlı avatarımızı ekleyelim ve avatarı parmağımızla
 * kaydırarak sevme falan olsun, avatar da ona göre tepki versin."*
 *
 * ── Tepki neye göre veriliyor ───────────────────────────────
 *
 * Tek dokunuş yetmiyor: **sürtmek** gerekiyor. Parmak avatarın üstünde
 * gezdikçe bir sayaç doluyor; eşiği geçince Loopy gözlerini kapatıp
 * yanaklarını pembeleştiriyor ve hafifçe eziliyor. Parmak kalkınca
 * birkaç saniye içinde olağan hâline dönüyor.
 *
 * Neden eşik var: dokunmayla tepki verseydi ekranı kaydırmak için
 * parmağını avatarın üstünden geçiren herkes "sevmiş" olurdu ve tepki
 * anlamını yitirirdi. Sevmek bir niyet, kaza değil.
 *
 * ── 🔴 Kaydırmayı yemiyor ───────────────────────────────────
 *
 * Avatar sayfanın ortasında ve altında içerik var. `touch-action`
 * kısıtlanmadı ve hiçbir yerde `preventDefault` çağrılmıyor: oyuncu
 * parmağını avatarın üstünden aşağı kaydırdığında sayfa **normal
 * kayıyor**, yalnızca yatay sürtme sevme sayılıyor. Karusel dersi
 * (Ü143) burada peşinen uygulandı.
 *
 * ── Hareketi kapatan kullanıcı ──────────────────────────────
 *
 * Sevme yine çalışıyor — ifade değişiyor, yalnızca eziliş animasyonu
 * yok (`globals.css` süreleri sıfırlıyor). Tepki bir animasyon değil,
 * bir **cevap**; kapatılması gereken şey hareketin kendisi.
 */

/** Kaç piksellik sürtme "sevme" sayılıyor. */
const SEVME_ESIGI = 90;

/** Parmak kalktıktan kaç ms sonra olağan hâline dönüyor. */
const DONUS_MS = 2600;

export function AvatarKosesi({
  baslangicRenk,
  baslangicAksesuar,
  kaydet,
}: {
  baslangicRenk: OyuncuRengi;
  baslangicAksesuar: AvatarAksesuari;
  kaydet: (renk: string, aksesuar: string) => Promise<{ ok: boolean }>;
}) {
  const [renk, setRenk] = useState<OyuncuRengi>(baslangicRenk);
  const [aksesuar, setAksesuar] = useState<AvatarAksesuari>(baslangicAksesuar);
  const [ifade, setIfade] = useState<AvatarIfadesi>("sakin");
  const [seviliyor, setSeviliyor] = useState(false);
  const [, basla] = useTransition();

  const kutuRef = useRef<HTMLDivElement>(null);
  const zamanlayiciRef = useRef(0);

  /* ── Okşama ───────────────────────────────────────────── */
  useEffect(() => {
    const kutu = kutuRef.current;
    if (!kutu) return;

    let basiliMi = false;
    let sonX = 0;
    let sonY = 0;
    let yol = 0;

    const bas = (e: PointerEvent) => {
      basiliMi = true;
      yol = 0;
      sonX = e.clientX;
      sonY = e.clientY;
      // Dokunur dokunmaz bakıyor: parmağın geldiğini fark etti.
      setIfade((i) => (i === "keyifli" ? i : "sasirdi"));
    };

    const kimilda = (e: PointerEvent) => {
      if (!basiliMi) return;
      yol += Math.abs(e.clientX - sonX) + Math.abs(e.clientY - sonY);
      sonX = e.clientX;
      sonY = e.clientY;

      if (yol > SEVME_ESIGI) {
        setIfade("keyifli");
        setSeviliyor(true);
      }
    };

    const birak = () => {
      if (!basiliMi) return;
      basiliMi = false;
      setSeviliyor(false);
      window.clearTimeout(zamanlayiciRef.current);
      zamanlayiciRef.current = window.setTimeout(() => setIfade("sakin"), DONUS_MS);
    };

    kutu.addEventListener("pointerdown", bas);
    kutu.addEventListener("pointermove", kimilda);
    kutu.addEventListener("pointerup", birak);
    kutu.addEventListener("pointercancel", birak);
    kutu.addEventListener("pointerleave", birak);

    return () => {
      kutu.removeEventListener("pointerdown", bas);
      kutu.removeEventListener("pointermove", kimilda);
      kutu.removeEventListener("pointerup", birak);
      kutu.removeEventListener("pointercancel", birak);
      kutu.removeEventListener("pointerleave", birak);
      window.clearTimeout(zamanlayiciRef.current);
    };
  }, []);

  /**
   * Seçim değişince kaydet.
   *
   * ⚠️ Ekran **beklemeden** değişiyor: renge dokunan oyuncu sonucu
   * anında görüyor, kayıt arka planda gidiyor. Sunucuyu bekleseydik
   * altı renk arasında gezinmek altı tur bekleme olurdu.
   */
  const sec = useCallback(
    (yeniRenk: OyuncuRengi, yeniAksesuar: AvatarAksesuari) => {
      setRenk(yeniRenk);
      setAksesuar(yeniAksesuar);
      setIfade("mutlu");
      window.clearTimeout(zamanlayiciRef.current);
      zamanlayiciRef.current = window.setTimeout(() => setIfade("sakin"), 1400);
      basla(async () => {
        await kaydet(yeniRenk, yeniAksesuar);
      });
    },
    [kaydet],
  );

  return (
    /*
      🔴 Kutu YOK — bilerek.

      İlk sürümde Loopy çerçeveli beyaz bir kartın içindeydi ve ürün
      sahibi *"bu bir pencerenin içinde gibi"* dedi. Haklı: çerçeve
      karakteri sayfanın bir parçası olmaktan çıkarıp bir **öge**
      yapıyordu. Maskot sayfanın üstünde durmalı, içinde değil —
      altındaki karta hafifçe binmesi de o yüzden (bkz. `profil/page`).
    */
    <div className="flex flex-col items-center">
      {/*
        İpucu avatarın ÜSTÜNDE.

        Altındayken, karakter alttaki kafe kartına bindiği için yazı da
        onunla birlikte iniyor ve "KAFELERİN" satırının üstüne
        oturuyordu. Üstte durunca hem çakışma bitiyor hem de okunacak
        şey karakterden önce görülüyor.
      */}
      <p className="mb-1 text-[13px] text-yazi-sonuk">
        {ifade === "keyifli" ? "Loopy keyiflendi 💙" : "Loopy'i parmağınla sev"}
      </p>

      <div
        ref={kutuRef}
        className="flex select-none justify-center"
        style={{ touchAction: "pan-y" }}
      >
        <div
          className={seviliyor ? "avatar-seviliyor" : "avatar-duruyor"}
          // Ekran okuyucuya: burada okşanacak bir şey olduğu söylenmiyor,
          // çünkü jest klavyeyle yapılamıyor. Altındaki seçimler ise
          // gerçek düğmeler ve onlar erişilebilir.
        >
          <Avatar renk={renk} aksesuar={aksesuar} ifade={ifade} boy={140} ad="Loopy" />
        </div>
      </div>

      {/*
        🔴 Renk ve aksesuar seçicileri tek render varken GİZLİ.

        Elde ürün sahibinin tek 3B karesi var; renk değiştirilemiyor ve
        3B bir gövdeye düz vektör bir bere takmak ikisini de bozardı.
        Seçicilerin kodu, kaydı ve doğrulaması **duruyor** — diğer
        renkler üretilince `COK_RENKLI` açılıyor ve buradaki her şey
        geri geliyor (bkz. `components/avatar.tsx`).

        Gizlenen bir arayüzü silmemek bilinçli: silinseydi renkler
        geldiğinde yeniden yazılması gerekirdi ve yazarken bugünkü
        gerekçeler unutulurdu.
      */}
      {COK_RENKLI && (
        <>
          <div className="mt-6">
            <div className="etiket-caps text-yazi-sonuk">Rengi</div>
            <div className="mt-2 flex flex-wrap gap-2">
              {AVATAR_RENKLERI.map((sec2) => (
                <button
                  key={sec2}
                  type="button"
                  onClick={() => sec(sec2, aksesuar)}
                  aria-label={`Rengi ${sec2} yap`}
                  aria-pressed={renk === sec2}
                  className={`size-9 rounded-full transition-transform active:scale-95 ${
                    renk === sec2 ? "ring-2 ring-vurgu ring-offset-2" : ""
                  }`}
                  style={{ background: RENK[sec2].ana }}
                />
              ))}
            </div>
          </div>

          <div className="mt-5">
            <div className="etiket-caps text-yazi-sonuk">Aksesuarı</div>
            <div className="mt-2 flex flex-wrap gap-2">
              {AVATAR_AKSESUARLARI.map((a) => (
                <button
                  key={a.deger}
                  type="button"
                  onClick={() => sec(renk, a.deger)}
                  aria-pressed={aksesuar === a.deger}
                  className={`rounded-full border px-3.5 py-1.5 text-[13px] font-semibold transition-colors ${
                    aksesuar === a.deger
                      ? "border-vurgu bg-vurgu-zemin text-vurgu"
                      : "border-cizgi text-yazi-sonuk hover:border-yazi-sonuk/50"
                  }`}
                >
                  {a.ad}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

    </div>
  );
}
