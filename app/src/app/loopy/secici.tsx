"use client";

import { useCallback, useRef, useState, useTransition } from "react";
import { Avatar, type AvatarIfadesi } from "@/components/avatar";
import { Uyari } from "@/components/ui";
import {
  GOVDE_KUMELERI,
  SERIT_KUMELERI,
  VARSAYILAN_GOVDE,
  VARSAYILAN_SERIT,
  type RenkKumesi,
} from "@/components/avatar-renkleri";

/**
 * Loopy'nin renk seçicisi — Ü186.
 *
 * ── Ürün sahibinin isteği ───────────────────────────────────
 *
 * *"Çizgi rengi sabit, kahve bardağının kalan kısmı her renkte; kahve
 * bardağı sabit, çizgi her renkte; ve kahve bardağı ayrı çizgi ayrı,
 * her renkte seçeneklerimiz olmalı."*
 *
 * Üç istek ama tek bir arayüz: **iki eksen bağımsız**. Bardağı
 * değiştirip şeride dokunmamak birinci hâli, tersi ikinciyi, ikisini de
 * değiştirmek üçüncüyü veriyor. Üç ayrı kip koysaydık oyuncu önce
 * "hangi kipteyim" sorusunu çözmek zorunda kalırdı.
 *
 * ── 🔴 Önizleme YAPIŞKAN ────────────────────────────────────
 *
 * 88 örnek var ve hepsi tek ekrana sığmıyor. Önizleme sayfayla birlikte
 * kaysaydı oyuncu koyu tonlara indiğinde neyi seçtiğini göremezdi —
 * seçtiğini görmeden renk seçilmiyor.
 *
 * ── 🔴 Kayıt ekranı BEKLETMİYOR ─────────────────────────────
 *
 * Renge dokunan oyuncu sonucu anında görüyor, kayıt arka planda gidiyor.
 * Sunucuyu bekleseydik palette gezinmek her dokunuşta bir tur bekleme
 * olurdu.
 *
 * ⚠️ Ama sessizce de kaybolmuyor: kayıt başarısız olursa seçim
 * **geri alınıyor** ve bir uyarı çıkıyor. İyimser arayüzün bedeli budur
 * ve ödenmezse oyuncu kaydolduğunu sanır.
 */

/** Kayıt başarısız olursa dönülecek nokta. */
type Secim = { govde: string; serit: string };

export function Secici({
  baslangic,
  kaydet,
}: {
  baslangic: Secim;
  kaydet: (govde: string, serit: string) => Promise<{ ok: boolean }>;
}) {
  const [secim, setSecim] = useState<Secim>(baslangic);
  const [ifade, setIfade] = useState<AvatarIfadesi>("sakin");
  const [hata, setHata] = useState(false);
  const [, basla] = useTransition();

  /** Son BAŞARIYLA kaydedilen seçim — geri alma buraya dönüyor. */
  const sonKayitRef = useRef<Secim>(baslangic);
  const zamanRef = useRef(0);

  const sec = useCallback(
    (yeni: Secim) => {
      setSecim(yeni);
      setHata(false);

      // Her seçimde bir an seviniyor: dokunmanın karşılığı görünüyor.
      setIfade("mutlu");
      window.clearTimeout(zamanRef.current);
      zamanRef.current = window.setTimeout(() => setIfade("sakin"), 1200);

      basla(async () => {
        const { ok } = await kaydet(yeni.govde, yeni.serit);
        if (ok) {
          sonKayitRef.current = yeni;
        } else {
          setSecim(sonKayitRef.current);
          setHata(true);
        }
      });
    },
    [kaydet],
  );

  const varsayilanMi =
    secim.govde === VARSAYILAN_GOVDE && secim.serit === VARSAYILAN_SERIT;

  return (
    <div>
      {/*
        ⚠️ `top-0` ve zemin RENKLİ: saydam bırakılsaydı altından kayan
        örnekler önizlemenin içinden geçerdi.
      */}
      <div className="sticky top-0 z-10 -mx-5 mb-6 bg-zemin px-5 pt-1 pb-4">
        <div className="flex items-center gap-4">
          <Avatar
            ifade={ifade}
            boy={128}
            govde={secim.govde}
            serit={secim.serit}
            ad="Loopy"
          />
          <div className="min-w-0">
            <div className="etiket-caps text-yazi-sonuk">Şu anki hâli</div>
            <p className="mt-1 text-[15px] leading-snug font-semibold">
              {etiketi(GOVDE_KUMELERI, secim.govde)}
              <span className="text-yazi-sonuk"> bardak</span>
            </p>
            <p className="text-[15px] leading-snug font-semibold">
              {etiketi(SERIT_KUMELERI, secim.serit)}
              <span className="text-yazi-sonuk"> şerit</span>
            </p>

            {!varsayilanMi && (
              <button
                type="button"
                onClick={() =>
                  sec({ govde: VARSAYILAN_GOVDE, serit: VARSAYILAN_SERIT })
                }
                className="mt-2 text-[13px] font-semibold text-vurgu underline underline-offset-2"
              >
                Özgün hâline dön
              </button>
            )}
          </div>
        </div>

        {/*
          Uyarı önizlemenin İÇİNDE: seçim yukarıda geri alınıyor ve
          sebebini aynı yerde görmek gerekiyor. Sayfanın altında
          dursaydı, koyu tonlara inmiş oyuncu hiç görmezdi.
        */}
        {hata && (
          <div className="mt-3">
            <Uyari>Kaydedemedik, seçimin geri alındı. Tekrar dener misin?</Uyari>
          </div>
        )}
      </div>

      <Bolum
        baslik="Bardağın rengi"
        kumeler={GOVDE_KUMELERI}
        secili={secim.govde}
        sec={(ad) => sec({ ...secim, govde: ad })}
      />

      <div className="mt-8">
        <Bolum
          baslik="Şeridin rengi"
          kumeler={SERIT_KUMELERI}
          secili={secim.serit}
          sec={(ad) => sec({ ...secim, serit: ad })}
        />
      </div>
    </div>
  );
}

function etiketi(kumeler: RenkKumesi[], ad: string): string {
  for (const k of kumeler) {
    const r = k.renkler.find((x) => x.ad === ad);
    if (r) return r.etiket;
  }
  return "Bilinmeyen";
}

function Bolum({
  baslik,
  kumeler,
  secili,
  sec,
}: {
  baslik: string;
  kumeler: RenkKumesi[];
  secili: string;
  sec: (ad: string) => void;
}) {
  return (
    <section>
      <h2 className="text-[17px] font-bold">{baslik}</h2>

      {kumeler.map((k) => (
        <div key={k.baslik} className="mt-4">
          <div className="etiket-caps text-yazi-sonuk">{k.baslik}</div>
          {/*
            🔴 `radiogroup` değil düğme dizisi.

            Gerçek bir radyo grubu ok tuşlarıyla gezilir ve gezinirken
            **seçim değişir** — burada her değişiklik sunucuya bir kayıt
            demek. 88 örneğin üstünden ok tuşuyla geçen biri 88 kayıt
            tetiklerdi. Düğmelerde gezinmek seçmek değil; seçmek için
            basmak gerekiyor.
          */}
          <div className="mt-2 flex flex-wrap gap-2">
            {k.renkler.map((r) => (
              <button
                key={r.ad}
                type="button"
                onClick={() => sec(r.ad)}
                aria-label={r.etiket}
                aria-pressed={secili === r.ad}
                className={`size-9 rounded-full border transition-transform active:scale-90 ${
                  secili === r.ad
                    ? "border-yuzey ring-2 ring-vurgu"
                    : "border-black/10"
                }`}
                style={{ background: r.hex }}
              />
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}
