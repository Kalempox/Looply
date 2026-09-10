"use client";

import { useActionState, useState } from "react";
import { IsletmeAlan, IsletmeUyari, isletmeGirdi } from "@/components/isletme";
import { sinirEylemi, type OdulDurumu } from "./actions";

/**
 * Günlük adet limiti ve kullanım penceresi kutusu (Ü103).
 *
 * ── Neden bu iki ayar birlikte ──────────────────────────────
 *
 * İkisi de aynı sorunun cevabı: **kafe neyi ne zaman dağıttığını
 * yönetebilmeli.** Bütçe (E10) ve tempo (Ü87) para sınırı koyuyor; adet
 * sınırı mutfağın kapasitesi, pencere ise boş saatleri doldurma aracı.
 *
 * ── ⚠️ Boş = sınırsız, sıfır değil ──────────────────────────
 *
 * Sıfır kabul etseydik "günde 0 kupon" diye bir ödül kurulabilir, ödül
 * sessizce ölür ve kafe neden hiç çıkmadığını aramakla uğraşırdı.
 * Sınırsızlık boş alanla anlatılıyor ve ipucu bunu söylüyor.
 *
 * ── ⚠️ Dolaşımdaki kuponlar etkileniyor ve bu YAZIYOR ───────
 *
 * Pencere kupon satırından değil ödül satırından okunuyor. Kafe pencereyi
 * daraltırsa elinde kupon olan oyuncu dünkü kuralla değil bugünkü kuralla
 * karşılaşır. Bu bilerek böyle — mutfak 17'de kapanıyorsa dün verilmiş
 * kupon o gerçeği değiştirmiyor — ama kafe sonucu **görmeden**
 * değiştirmemeli (Ü94'teki aynı kural).
 */

const GUNLER = [
  { no: 1, ad: "Pzt" },
  { no: 2, ad: "Sal" },
  { no: 3, ad: "Çar" },
  { no: 4, ad: "Per" },
  { no: 5, ad: "Cum" },
  { no: 6, ad: "Cmt" },
  { no: 0, ad: "Paz" },
];

export function SinirKutusu({
  odulId,
  gunlukLimit,
  bugunVerilen,
  gunler,
  baslangicSaati,
  bitisSaati,
  pencereMetni,
  acikKupon,
}: {
  odulId: string;
  gunlukLimit: number | null;
  bugunVerilen: number;
  gunler: number[] | null;
  baslangicSaati: number | null;
  bitisSaati: number | null;
  pencereMetni: string | null;
  acikKupon: number;
}) {
  const [durum, action, bekliyor] = useActionState(sinirEylemi, {} as OdulDurumu);

  /** Ü94'teki aynı desen: kutu, eylemin sıra numarasıyla kapanıyor. */
  const [acilisSirasi, setAcilisSirasi] = useState<number | null>(null);
  const acik = acilisSirasi !== null && (durum.sira ?? 0) === acilisSirasi;

  const ozet = [
    gunlukLimit == null ? null : `günde ${gunlukLimit}`,
    pencereMetni,
  ]
    .filter(Boolean)
    .join(" · ");

  if (!acik) {
    return (
      <span className="flex flex-col items-end gap-1">
        <button
          type="button"
          onClick={() => setAcilisSirasi(durum.sira ?? 0)}
          className="etiket-caps text-yazi-sonuk underline"
        >
          sınırlar
        </button>
        {ozet && (
          <span className="text-[11px] leading-tight text-odul-koyu">
            {ozet}
            {gunlukLimit != null && ` · bugün ${bugunVerilen}`}
          </span>
        )}
        {durum.bilgi && (
          <span className="text-[11px] leading-tight text-yazi-sonuk">{durum.bilgi}</span>
        )}
      </span>
    );
  }

  return (
    <form action={action} className="mt-2 w-full space-y-4 rounded-xl bg-cukur px-4 py-4">
      <input type="hidden" name="odulId" value={odulId} />

      {durum.hata && <IsletmeUyari>{durum.hata}</IsletmeUyari>}

      <IsletmeAlan
        etiket="Günde en fazla kaç adet"
        ipucu="Boş bırakırsan sınırsız. Bütçe zaten para sınırı koyuyor; bu, mutfağın kapasitesi için."
      >
        <input
          name="gunlukLimit"
          type="text"
          inputMode="numeric"
          defaultValue={gunlukLimit == null ? "" : String(gunlukLimit)}
          placeholder="sınırsız"
          className={isletmeGirdi}
        />
      </IsletmeAlan>

      <div>
        <div className="etiket-caps mb-2 text-yazi-sonuk">Hangi günler kullanılabilir</div>
        <div className="flex flex-wrap gap-1.5">
          {GUNLER.map((g) => (
            <label
              key={g.no}
              className="cursor-pointer rounded-lg border border-cizgi bg-yuzey px-3 py-1.5 text-[13px] has-checked:border-vurgu has-checked:font-bold has-checked:text-vurgu"
            >
              <input
                type="checkbox"
                name="gun"
                value={g.no}
                defaultChecked={gunler == null || gunler.includes(g.no)}
                className="sr-only"
              />
              {g.ad}
            </label>
          ))}
        </div>
        <p className="mt-1.5 text-[12px] leading-relaxed text-yazi-sonuk">
          Hepsi seçiliyse gün kısıtı yok. En az bir gün seçili kalmalı.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <IsletmeAlan etiket="Saat başlangıcı" ipucu="Boş = her saat">
          <input
            name="baslangicSaati"
            type="text"
            inputMode="numeric"
            defaultValue={baslangicSaati == null ? "" : String(baslangicSaati)}
            placeholder="14"
            className={isletmeGirdi}
          />
        </IsletmeAlan>
        <IsletmeAlan etiket="Saat bitişi">
          <input
            name="bitisSaati"
            type="text"
            inputMode="numeric"
            defaultValue={bitisSaati == null ? "" : String(bitisSaati)}
            placeholder="17"
            className={isletmeGirdi}
          />
        </IsletmeAlan>
      </div>

      {/* ⚠️ Sonucu önceden söyle — Ü94'teki aynı kural. */}
      {acikKupon > 0 && (
        <p className="text-[12px] leading-relaxed text-yazi-sonuk">
          Dolaşımda <strong className="text-odul-koyu">{acikKupon} açık kupon</strong> var;
          pencereyi daraltırsan onlar da yeni kurala göre kullanılacak.
        </p>
      )}

      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={bekliyor}
          className="etiket-caps rounded-lg bg-vurgu px-4 py-2 text-white disabled:opacity-50"
        >
          {bekliyor ? "…" : "Kaydet"}
        </button>
        <button
          type="button"
          onClick={() => setAcilisSirasi(null)}
          className="etiket-caps text-yazi-sonuk underline"
        >
          vazgeç
        </button>
      </div>
    </form>
  );
}
