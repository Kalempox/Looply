"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { subeDegistir } from "./sube-actions";
import type { PanelDurumu, Uyari } from "@/domain/panel-durum";
import { gunYaz, gunKaydir } from "@/lib/tarih";
import { GunSecici } from "./gun-secici";

/**
 * Panelin başlık kabuğu (Ü101).
 *
 * Görselin üst şeridi: şube seçici · gün gezinme · uyarı çanı.
 *
 * ── Neden istemci bileşeni ──────────────────────────────────
 *
 * Üçü de açılıp kapanan yüzeyler. Sunucuda tutulsalardı her açılış bir
 * gidiş dönüş olurdu; panelin en çok dokunulan yeri burası.
 */

export function PanelKabugu({
  kafeAdi,
  sehir,
  subeler,
  aktifCafeId,
  durum,
  gun,
  bugun,
}: {
  kafeAdi: string;
  sehir: string | null;
  subeler: { cafeId: string; kafeAdi: string }[];
  aktifCafeId: string;
  durum: PanelDurumu;
  /** Panelin baktığı gün (YYYY-MM-DD). */
  gun: string;
  bugun: string;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
      <SubeSecici
        kafeAdi={kafeAdi}
        sehir={sehir}
        subeler={subeler}
        aktifCafeId={aktifCafeId}
      />
      <div className="flex items-center gap-3">
        <GunGezinme gun={gun} bugun={bugun} />
        <UyariCani durum={durum} />
      </div>
    </div>
  );
}

/**
 * Gün gezinme (‹ dün ›).
 *
 * ⚠️ **İleri düğmesi bugünde kapanıyor.** Gelecek gün açılabilseydi panel
 * boş sayılarla "yarın hiç müşteri gelmedi" der gibi görünürdü; olmamış
 * bir günü "sıfır" diye göstermek, veriyi yanlış okutmanın en kolay yolu.
 *
 * Bağlantı `Link` — sunucu bileşeni yeniden çiziliyor ve tarih adreste
 * duruyor, böylece işletmeci belirli bir günü paylaşabiliyor.
 */
function GunGezinme({ gun, bugun }: { gun: string; bugun: string }) {
  const ileriAcik = gun < bugun;

  return (
    <div className="flex items-center gap-1 rounded-xl border border-cizgi bg-yuzey px-2 py-1.5">
      <Link
        href={`/kafe/panel?gun=${gunKaydir(gun, -1)}`}
        aria-label="Önceki gün"
        className="flex size-7 items-center justify-center rounded-lg text-yazi-sonuk hover:bg-cukur"
      >
        ‹
      </Link>
      {/* Ortadaki etiket artık düğme: tıklayınca takvim açılıyor ve
          geçmiş bir güne tek hamlede gidilebiliyor (Ü123). Önceden
          yalnızca ok tuşları vardı — bir ay öncesine otuz tık. */}
      <GunSecici
        gun={gun}
        bugun={bugun}
        etiket={gun === bugun ? "Bugün" : gunYaz(gun)}
      />
      {ileriAcik ? (
        <Link
          href={`/kafe/panel?gun=${gunKaydir(gun, 1)}`}
          aria-label="Sonraki gün"
          className="flex size-7 items-center justify-center rounded-lg text-yazi-sonuk hover:bg-cukur"
        >
          ›
        </Link>
      ) : (
        <span aria-hidden className="flex size-7 items-center justify-center opacity-25">
          ›
        </span>
      )}
    </div>
  );
}

/**
 * Şube seçici.
 *
 * ⚠️ Tek şubeli işletmede **açılır menü hiç çizilmiyor** — tıklanınca tek
 * seçenek gösteren bir menü, kullanıcıya olmayan bir yetenek varmış gibi
 * hissettirir ve her açtığında bir kez daha hayal kırıklığı yaratır.
 * Görselde menü var çünkü oradaki işletme çok şubeli.
 */
function SubeSecici({
  kafeAdi,
  sehir,
  subeler,
  aktifCafeId,
}: {
  kafeAdi: string;
  sehir: string | null;
  subeler: { cafeId: string; kafeAdi: string }[];
  aktifCafeId: string;
}) {
  const [acik, setAcik] = useState(false);
  const [bekliyor, basla] = useTransition();
  const cokSube = subeler.length > 1;

  const kunye = (
    <span className="min-w-0 text-left">
      <span className="block truncate font-display text-[15px] leading-tight font-bold">
        {kafeAdi}
      </span>
      {sehir && <span className="block text-[12px] text-yazi-sonuk">{sehir}</span>}
    </span>
  );

  if (!cokSube) {
    return <div className="flex min-w-0 items-center gap-3">{kunye}</div>;
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setAcik((v) => !v)}
        disabled={bekliyor}
        className="flex min-w-0 items-center gap-2 rounded-xl border border-cizgi bg-yuzey px-3 py-2 disabled:opacity-50"
      >
        {kunye}
        <span aria-hidden className="text-yazi-sonuk">
          ▾
        </span>
      </button>

      {acik && (
        <div className="absolute top-full left-0 z-20 mt-1 w-64 overflow-hidden rounded-xl border border-cizgi bg-yuzey shadow-lg">
          <div className="etiket-caps border-b border-cizgi px-4 py-2 text-yazi-sonuk">
            Şubeler · {subeler.length}
          </div>
          {subeler.map((s) => (
            <button
              key={s.cafeId}
              type="button"
              disabled={bekliyor || s.cafeId === aktifCafeId}
              onClick={() => {
                setAcik(false);
                basla(async () => void (await subeDegistir(s.cafeId)));
              }}
              className={`block w-full px-4 py-2.5 text-left text-[14px] transition-colors hover:bg-cukur ${
                s.cafeId === aktifCafeId ? "font-bold" : ""
              }`}
            >
              {s.kafeAdi}
              {s.cafeId === aktifCafeId && (
                <span className="ml-2 text-[11px] text-yazi-sonuk">açık</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Uyarı çanı.
 *
 * ⚠️ Rozet **engel ve dikkat** sayıyor, bilgi saymıyor: her bilgi satırı
 * rozeti şişirseydi çan sürekli dolu görünür ve işletmeci bakmayı
 * bırakırdı. Rozet "bir şey yapman gerekiyor" demeli.
 *
 * ⚠️ Okundu durumu yok — uyarılar türetiliyor (`domain/panel-durum.ts`).
 * Sorun çözülünce satır kendiliğinden kayboluyor.
 */
function UyariCani({ durum }: { durum: PanelDurumu }) {
  const [acik, setAcik] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setAcik((v) => !v)}
        aria-label={`Uyarılar${durum.bekleyen ? ` · ${durum.bekleyen} bekliyor` : ""}`}
        className="relative flex size-10 items-center justify-center rounded-xl border border-cizgi bg-yuzey"
      >
        <span aria-hidden className="text-[17px] leading-none">
          🔔
        </span>
        {durum.bekleyen > 0 && (
          <span className="absolute -top-1.5 -right-1.5 flex size-5 items-center justify-center rounded-full bg-tehlike font-data text-[11px] font-bold text-white">
            {durum.bekleyen}
          </span>
        )}
      </button>

      {acik && (
        <div className="absolute top-full right-0 z-20 mt-1 w-80 overflow-hidden rounded-xl border border-cizgi bg-yuzey shadow-lg">
          <div className="etiket-caps border-b border-cizgi px-4 py-2 text-yazi-sonuk">
            {durum.uyarilar.length > 0 ? "Dikkat isteyenler" : "Uyarı yok"}
          </div>

          {durum.uyarilar.length === 0 ? (
            <p className="px-4 py-4 text-[13px] leading-relaxed text-yazi-sonuk">
              Kurulumun tamam ve sistem çalışıyor.
            </p>
          ) : (
            <ul className="max-h-80 overflow-y-auto">
              {durum.uyarilar.map((u) => (
                <li key={u.baslik} className="border-b border-cizgi last:border-0">
                  <UyariSatiri uyari={u} onGit={() => setAcik(false)} />
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function UyariSatiri({ uyari, onGit }: { uyari: Uyari; onGit: () => void }) {
  const renk =
    uyari.onem === "engel"
      ? "text-tehlike"
      : uyari.onem === "dikkat"
        ? "text-odul-koyu"
        : "text-yazi-sonuk";

  const govde = (
    <>
      <span className={`block text-[13px] leading-tight font-semibold ${renk}`}>
        {uyari.baslik}
      </span>
      <span className="mt-0.5 block text-[12px] leading-relaxed text-yazi-sonuk">
        {uyari.aciklama}
      </span>
    </>
  );

  if (!uyari.yol) {
    return <div className="px-4 py-3">{govde}</div>;
  }

  return (
    <Link href={uyari.yol} onClick={onGit} className="block px-4 py-3 hover:bg-cukur">
      {govde}
    </Link>
  );
}

/**
 * Kurulum durumu ve öneri kartları (Ü101).
 *
 * ⚠️ Öneri **yoksa kart da yok**. Görselde her zaman dolu duruyor ama
 * dayanağı olmayan bir öneri yazmak, panelin güvenilirliğini bir kerede
 * harcar (`domain/panel-durum.ts`).
 */
export function DurumKartlari({ durum }: { durum: PanelDurumu }) {
  const engel = durum.uyarilar.filter((u) => u.onem === "engel");

  return (
    <div className="grid gap-3">
      <div
        className={`rounded-2xl border px-5 py-5 ${
          durum.iyiMi ? "border-vurgu/50 bg-cukur" : "border-tehlike/50 bg-yuzey"
        }`}
      >
        {/* ⚠️ "Bugünkü" değil "Kurulum": kart günün sayılarını değil
            **kurulumun sağlığını** anlatıyor (ödül var mı, konum girili
            mi, bütçe açık mı) ve o geçmiş bir güne bakarken de bugünün
            durumu. Takvim eklenince (Ü123) yanlışlığı görünür oldu —
            11 Eylül'e bakarken "bugünkü durum" yazıyordu. */}
        <div className="etiket-caps text-yazi-sonuk">Kurulum durumu</div>
        <div
          className={`mt-1 font-display text-[19px] leading-tight font-bold ${
            durum.iyiMi ? "text-vurgu" : "text-tehlike"
          }`}
        >
          {durum.iyiMi ? "İyi gidiyorsun" : "Dikkat gereken bir şey var"}
        </div>
        <p className="mt-1.5 text-[13px] leading-relaxed text-yazi-sonuk">
          {durum.iyiMi
            ? "Kurulumun tamam, sistem çalışıyor ve ödül dağıtımı açık."
            : engel.length > 0
              ? `${engel[0].baslik}. Bu sürerken oyuncular hiçbir şey kazanamıyor.`
              : durum.uyarilar[0].baslik}
        </p>
      </div>

      {durum.oneriler.map((o) => (
        <div key={o.metin} className="rounded-2xl border border-cizgi bg-yuzey px-5 py-5">
          <div className="etiket-caps text-yazi-sonuk">Önerimiz</div>
          <p className="mt-1.5 text-[13px] leading-relaxed">{o.metin}</p>
          {o.yol && (
            <Link
              href={o.yol}
              className="mt-2 inline-block text-[13px] font-semibold underline"
            >
              Git
            </Link>
          )}
        </div>
      ))}
    </div>
  );
}
