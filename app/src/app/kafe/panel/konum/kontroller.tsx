"use client";

import { useState, useTransition, useActionState } from "react";
import { konumKaydet, yaricapKaydet, type YaricapDurumu } from "./actions";
import {
  IsletmeDugme,
  IsletmeUyari,
  IsletmeAlan,
  isletmeGirdi,
} from "@/components/isletme";

/**
 * Konumu tarayıcıdan okuyup kaydeder.
 *
 * Kafe sahibi zaten kafede duruyor; en doğru koordinat onun telefonunda.
 * Adres yazdırıp geocoding servisine sormak yeni bir bağımlılık, yeni bir
 * maliyet ve yanlış eşleşme riski demekti.
 *
 * `enableHighAccuracy`: kapalı mekânda GPS zayıf, ama 150 metrelik geofence
 * için baz istasyonu doğruluğu bile çoğu zaman yetiyor. Yine de en iyisini
 * istiyoruz — kafenin komşusunda doğrulanan bir oyuncu, kafenin parasını
 * boşa harcatır.
 */
export function KonumOkuyucu({ kayitli }: { kayitli: boolean }) {
  const [durum, setDurum] = useState<{ hata?: string; bilgi?: string }>({});
  const [okuyor, setOkuyor] = useState(false);
  const [bekliyor, basla] = useTransition();

  function konumAl() {
    setDurum({});

    if (!navigator.geolocation) {
      setDurum({ hata: "Bu tarayıcı konum vermiyor. Telefondan dene." });
      return;
    }

    setOkuyor(true);
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setOkuyor(false);
        basla(async () => {
          setDurum(await konumKaydet(p.coords.latitude, p.coords.longitude));
        });
      },
      (hata) => {
        setOkuyor(false);
        // Üç ayrı sebep, üç ayrı çözüm. "Konum alınamadı" demek, kafe
        // sahibini hangi düğmeye basacağını bilmeden bırakırdı.
        setDurum({
          hata:
            hata.code === hata.PERMISSION_DENIED
              ? "Konum izni verilmedi. Tarayıcı ayarlarından bu siteye izin ver ve tekrar dene."
              : hata.code === hata.POSITION_UNAVAILABLE
                ? "Konum okunamadı. Pencereye yakın bir yerde tekrar dene."
                : "Konum okuma zaman aşımına uğradı. Tekrar dene.",
        });
      },
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 0 },
    );
  }

  const calisiyor = okuyor || bekliyor;

  return (
    <div className="space-y-3">
      {durum.hata && <IsletmeUyari>{durum.hata}</IsletmeUyari>}
      {durum.bilgi && <IsletmeUyari tur="bilgi">{durum.bilgi}</IsletmeUyari>}

      <IsletmeDugme type="button" onClick={konumAl} disabled={calisiyor}>
        {okuyor
          ? "Konum okunuyor…"
          : bekliyor
            ? "Kaydediliyor…"
            : kayitli
              ? "Konumu güncelle"
              : "Kafenin konumunu işaretle"}
      </IsletmeDugme>
    </div>
  );
}

/**
 * Yarıçap ayarı — Ü131.
 *
 * ── Neden hazır seçenekler de var ───────────────────────────
 *
 * Kafe sahibi "kaç metre" sorusuna sayı üretmekte zorlanıyor: 40 mı, 80
 * mi, 200 mü? Üç hazır seçenek bir ölçek veriyor ("içerisi" / "bahçe
 * dahil" / "geniş"), serbest alan yine duruyor. Yalnızca serbest alan
 * olsaydı çoğu kafe varsayılana dokunmazdı.
 */
export function YaricapAyari({ mevcut }: { mevcut: number }) {
  const [durum, action, bekliyor] = useActionState(yaricapKaydet, {} as YaricapDurumu);

  return (
    <form action={action} className="space-y-4">
      {durum.hata && <IsletmeUyari>{durum.hata}</IsletmeUyari>}
      {durum.bilgi && <IsletmeUyari tur="bilgi">{durum.bilgi}</IsletmeUyari>}

      <IsletmeAlan
        etiket="Yarıçap (metre)"
        ipucu="Bu mesafedeki oyuncu kafede sayılır. 20 ile 500 arası — altı GPS hatasına takılır, üstü doğrulamayı anlamsızlaştırır."
      >
        <input
          name="yaricap"
          type="number"
          min={20}
          max={500}
          defaultValue={String(mevcut)}
          className={isletmeGirdi}
        />
      </IsletmeAlan>

      <IsletmeDugme type="submit" disabled={bekliyor}>
        {bekliyor ? "Kaydediliyor…" : "Yarıçapı kaydet"}
      </IsletmeDugme>
    </form>
  );
}
