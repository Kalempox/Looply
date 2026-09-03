"use client";

import Link from "next/link";
import { useCallback, useState, useTransition } from "react";
import { OyunEkrani } from "@/oyunlar/arayuz";
import {
  misafirBasla,
  misafirBitir,
  konumBildir,
  demoKafedeSay,
  type BitirCevabi,
  type KonumCevabi,
} from "./actions";

/**
 * Misafir kabuğu — oyun seç, oyna, sonucu gör, hesabına geç (Ü35).
 *
 * `/oyna` kabuğuyla aynı iskelet ve **aynı** `OyunEkrani`. Ayrıldığı tek yer
 * sonuç ekranı: burada kazanım gösterilmiyor çünkü henüz yazılmadı. Onun
 * yerine talebin ne olduğu dürüstçe söyleniyor — "sonucun saklandı, hesabına
 * geçince işlenecek."
 */

export type Oyun = { id: string; ad: string; ozet: string; emoji: string };

type Durum =
  | { tur: "secim" }
  | { tur: "oynuyor"; oyun: Oyun; tohum: string }
  | { tur: "sonuc"; oyun: Oyun; cevap: BitirCevabi };

export function MisafirKabugu({
  oyunlar,
  kafeAdi,
  kafeKonumuVar,
  konumBaslangic,
  demoKapisi,
}: {
  oyunlar: Oyun[];
  kafeAdi: string;
  /** Ü95: kafe konumunu işaretlemiş mi — yoksa doğrulama imkânsız. */
  kafeKonumuVar: boolean;
  /** Demo kısayolu görünsün mü — canlıda hep false. */
  demoKapisi?: boolean;
  /** Sunucunun çerezden okuduğu konum durumu — sayfa yenilense de kaybolmasın. */
  konumBaslangic: { dogrulandi: boolean; mesafeM: number | null } | null;
}) {
  const [durum, setDurum] = useState<Durum>({ tur: "secim" });
  const [hata, setHata] = useState<string | null>(null);
  const [bekliyor, basla] = useTransition();
  const [konum, setKonum] = useState(konumBaslangic);
  const [konumNotu, setKonumNotu] = useState<string | null>(null);

  const turBaslat = useCallback((oyun: Oyun) => {
    setHata(null);
    basla(async () => {
      const cevap = await misafirBasla(oyun.id);
      if (!cevap.ok) {
        setHata(cevap.hata);
        return;
      }
      setDurum({ tur: "oynuyor", oyun, tohum: cevap.tohum });
    });
  }, []);

  const oyunBitti = useCallback(
    (oyun: Oyun) => (girdiler: unknown[], istemciSkoru: number) => {
      basla(async () => {
        const cevap = await misafirBitir(girdiler, istemciSkoru);
        setDurum({ tur: "sonuc", oyun, cevap });
      });
    },
    [],
  );

  const konumIste = useCallback(() => {
    if (!navigator.geolocation) {
      setKonumNotu("Bu tarayıcı konum vermiyor");
      return;
    }
    setKonumNotu("Konum alınıyor…");
    navigator.geolocation.getCurrentPosition(
      (p) =>
        basla(async () => {
          const c: KonumCevabi = await konumBildir(p.coords.latitude, p.coords.longitude);
          if (c.durum === "dogrulandi") {
            setKonum({ dogrulandi: true, mesafeM: c.mesafeM });
            setKonumNotu(null);
          } else if (c.durum === "uzak") {
            setKonum({ dogrulandi: false, mesafeM: c.mesafeM });
            setKonumNotu(`Kafeden ${c.mesafeM} metre uzaktasın`);
          } else if (c.durum === "kafe_konumu_yok") {
            setKonumNotu("Bu kafe konumunu henüz işaretlememiş — ödül açılamıyor");
          } else {
            setKonumNotu("Konum doğrulanamadı");
          }
        }),
      () => setKonumNotu("Konum izni verilmedi — ödül kilitli kalır"),
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 60_000 },
    );
  }, []);

  if (durum.tur === "oynuyor") {
    return (
      <div>
        <div className="mb-4 flex items-baseline justify-between">
          <span className="etiket-caps text-yazi-sonuk">{durum.oyun.ad}</span>
          <span className="etiket-caps text-odul-koyu">Misafir</span>
        </div>

        <OyunEkrani
          key={durum.tohum}
          oyunId={durum.oyun.id}
          tohum={durum.tohum}
          demoKapisi={demoKapisi}
          bitti={oyunBitti(durum.oyun)}
        />

        {bekliyor && (
          <p className="mt-5 text-center font-data text-[11px] text-yazi-sonuk nabiz">
            Sunucu skorunu doğruluyor…
          </p>
        )}
      </div>
    );
  }

  if (durum.tur === "sonuc") {
    return (
      <SonucEkrani
        oyun={durum.oyun}
        cevap={durum.cevap}
        tekrar={() => turBaslat(durum.oyun)}
        geri={() => setDurum({ tur: "secim" })}
      />
    );
  }

  return (
    <div>
      {hata && (
        <div className="mb-6 rounded-lg border border-tehlike/60 bg-yuzey px-4 py-3 text-[14px] text-tehlike">
          {hata}
        </div>
      )}

      <KonumSeridi
        kafeAdi={kafeAdi}
        kafeKonumuVar={kafeKonumuVar}
        konum={konum}
        not={konumNotu}
        bekliyor={bekliyor}
        iste={konumIste}
        demo={
          demoKapisi
            ? () =>
                basla(async () => {
                  const c = await demoKafedeSay();
                  if (c.durum === "dogrulandi") {
                    setKonum({ dogrulandi: true, mesafeM: c.mesafeM });
                    setKonumNotu(null);
                  } else {
                    setKonumNotu("Demo konumu uygulanamadı");
                  }
                })
            : undefined
        }
      />

      <h2 className="mt-8 mb-3 etiket-caps text-yazi-sonuk">Bir oyun seç</h2>

      <ul className="flex flex-col gap-2.5">
        {oyunlar.map((oyun) => (
          <li key={oyun.id}>
            <button
              type="button"
              disabled={bekliyor}
              onClick={() => turBaslat(oyun)}
              className="flex w-full items-center gap-4 rounded-2xl border border-cizgi bg-yuzey px-5 py-4 text-left disabled:opacity-50"
            >
              <span aria-hidden className="text-2xl">
                {oyun.emoji}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-display text-lg font-bold">{oyun.ad}</span>
                <span className="mt-0.5 block text-[13px] text-yazi-sonuk">{oyun.ozet}</span>
              </span>
              <span className="font-data text-vurgu">→</span>
            </button>
          </li>
        ))}
      </ul>

      <p className="mt-8 text-[13px] leading-relaxed text-yazi-sonuk">
        Hesabın zaten var mı?{" "}
        <Link href="/giris" className="text-vurgu underline">
          Giriş yap
        </Link>
      </p>
    </div>
  );
}

/* ── Konum şeridi ─────────────────────────────────────────── */

/**
 * Konum kayıttan ÖNCE soruluyor.
 *
 * Ödülün açılma şartı K2 ve o kanıt oyunun oynandığı anda toplanmalı: sonradan
 * sorulan konum, oyunun kafede oynandığını söylemez. Reddetmek bir hata değil,
 * normal bir tercih — akış çökmüyor, yalnızca ödül kilitli kalıyor.
 */
function KonumSeridi({
  kafeAdi,
  kafeKonumuVar,
  konum,
  not,
  bekliyor,
  iste,
  demo,
}: {
  kafeAdi: string;
  kafeKonumuVar: boolean;
  konum: { dogrulandi: boolean; mesafeM: number | null } | null;
  not: string | null;
  bekliyor: boolean;
  iste: () => void;
  /** Demo kısayolu — kafenin kendi koordinatını kullanır. Canlıda yok. */
  demo?: () => void;
}) {
  const dogrulandi = !!konum?.dogrulandi;

  /**
   * ⚠️ Ü95: kafe konumunu hiç işaretlememişse doğrulama **hiçbir zaman**
   * başarılı olamaz — `konumDogrula` `kafe_konumu_yok` ile dönüyor.
   * Eskiden ekran yine de "Doğrula" düğmesi gösteriyordu; oyuncu basıyor,
   * geçici bir not çıkıyor, şerit değişmiyordu. Oyuncu kendini kafe
   * dışında sanılıyor zannediyordu, oysa eksik olan kafenin kurulumu.
   */
  const cikmaz = !dogrulandi && !kafeKonumuVar;

  return (
    <div
      className={`rounded-2xl border px-4 py-3.5 ${
        dogrulandi ? "border-vurgu bg-cukur" : cikmaz ? "border-cizgi bg-yuzey" : "border-odul/60 bg-yuzey"
      }`}
    >
      <div className="flex items-center gap-3">
        <span
          aria-hidden
          className={`size-2.5 shrink-0 rounded-full border ${
            dogrulandi ? "border-vurgu bg-vurgu" : cikmaz ? "border-cizgi" : "border-odul nabiz"
          }`}
        />
        <div className="min-w-0 flex-1">
          <div
            className={`etiket-caps ${
              dogrulandi ? "text-vurgu" : cikmaz ? "text-yazi-sonuk" : "text-odul-koyu"
            }`}
          >
            {dogrulandi
              ? "Konum doğrulandı"
              : cikmaz
                ? "Bu kafede ödül dağıtılmıyor"
                : "Ödül için konum gerekiyor"}
          </div>
          <div className="mt-0.5 text-[12px] leading-relaxed text-yazi-sonuk">
            {(cikmaz ? null : not) ??
              (dogrulandi
                ? `${kafeAdi}${konum?.mesafeM != null ? ` · ${konum.mesafeM} m` : ""} — kazandığın ödül hesabına işlenecek`
                : cikmaz
                  ? `${kafeAdi} konumunu henüz işaretlememiş. Oynayabilirsin ama ödül açılmıyor — senin yapabileceğin bir şey yok.`
                  : "Doğrulamazsan oynayabilirsin ama ödül açılmaz")}
          </div>
        </div>
        {/* Çıkmazda düğme yok: basılınca hiçbir şey olmayacak bir düğme,
            oyuncuyu kendi hatasını aramaya iter. */}
        {!dogrulandi && !cikmaz && (
          <div className="flex shrink-0 items-center gap-1.5">
            <button
              type="button"
              onClick={iste}
              disabled={bekliyor}
              className="etiket-caps rounded border border-current px-3 py-1.5 text-odul-koyu disabled:opacity-50"
            >
              {bekliyor ? "…" : "Doğrula"}
            </button>
            {demo && (
              <button
                type="button"
                onClick={demo}
                disabled={bekliyor}
                className="etiket-caps rounded border border-odul px-2.5 py-1.5 text-odul-koyu disabled:opacity-50"
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

/* ── Sonuç ────────────────────────────────────────────────── */

function SonucEkrani({
  oyun,
  cevap,
  tekrar,
  geri,
}: {
  oyun: Oyun;
  cevap: BitirCevabi;
  tekrar: () => void;
  geri: () => void;
}) {
  if (!cevap.ok) {
    return (
      <div>
        <div className="rounded-2xl border border-odul bg-yuzey px-6 py-7">
          <h2 className="font-display text-2xl font-extrabold">Kayıt doğrulanamadı</h2>
          <p className="mt-3 text-[14px] leading-relaxed text-yazi-sonuk">
            {cevap.hata}
            {cevap.reddedildi && " Bu oyunun sonucu geçersiz sayıldı. Yeniden dene."}
          </p>
        </div>
        <Dugmeler tekrar={tekrar} geri={geri} />
      </div>
    );
  }

  return (
    <div>
      <div
        className={`rounded-2xl border bg-yuzey px-6 py-7 ${
          cevap.basarili ? "border-vurgu" : "border-cizgi"
        }`}
      >
        <div className="etiket-caps text-yazi-sonuk">{oyun.ad}</div>
        <h2 className="mt-2 font-display text-3xl leading-none font-extrabold">
          {cevap.basarili ? "İyi tur" : "Tur bitti"}
        </h2>

        <div className="mt-6">
          <div className="etiket-caps text-yazi-sonuk">Skor</div>
          <div className="mt-1 font-data text-4xl leading-none font-bold text-vurgu tabular">
            {cevap.skor.toLocaleString("tr-TR")}
          </div>
          <div className="mt-1.5 font-data text-[9px] text-yazi-sonuk">sunucuda doğrulandı</div>
        </div>
      </div>

      {/*
        Buradaki söz dikkatle kuruluyor: ödül HENÜZ YOK. Sunucu yalnızca
        sonucu imzalayıp sakladı; gerçek satır ve gerçek ödül hesap açıldığı
        anda, normal kurallardan geçerek üretilecek. Fazlasını vaat etmek,
        oyuncuyu kaydolduktan sonra hayal kırıklığına uğratırdı.
      */}
      <div className="mt-4 rounded-2xl border border-odul bg-cukur px-5 py-5">
        <div className="etiket-caps text-odul-koyu">🎟️ Sonucun saklandı</div>
        <p className="mt-2 text-[14px] leading-relaxed text-yazi-sonuk">
          {cevap.basarili && cevap.k2
            ? "Hesabına girdiğin anda bu oyun hesabına işlenecek: puan, XP ve varsa ödül birlikte gelecek."
            : cevap.basarili
              ? "Hesabına girdiğin anda bu oyun hesabına işlenecek. Konumun doğrulanmadığı için puan ve ödül açılmayacak — istersen geri dönüp konumunu doğrula ve tekrar oyna."
              : "Hesabına girdiğin anda bu oyun hesabına işlenecek. Daha yüksek skor daha çok puan ve ödül demek; tekrar denersen sonucun yenisiyle değişir."}
        </p>
        <Link
          href="/giris"
          className="mt-4 block rounded-lg bg-vurgu px-5 py-4 text-center font-display text-[16px] font-bold text-white"
        >
          Ödülünü almak için hesabına gir
        </Link>
        <p className="mt-2.5 text-center font-data text-[10px] tracking-wide text-yazi-sonuk">
          Sonucun 30 dakika saklanıyor
        </p>
      </div>

      <Dugmeler tekrar={tekrar} geri={geri} />
    </div>
  );
}

function Dugmeler({ tekrar, geri }: { tekrar: () => void; geri: () => void }) {
  return (
    <div className="mt-6 flex flex-col gap-2.5">
      <button
        type="button"
        onClick={tekrar}
        className="rounded-lg border border-cizgi py-4 font-display text-[16px] text-yazi"
      >
        Tekrar oyna
      </button>
      <button type="button" onClick={geri} className="py-2 text-[14px] text-yazi-sonuk underline">
        Oyunlara dön
      </button>
    </div>
  );
}
