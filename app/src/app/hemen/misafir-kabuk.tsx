"use client";

import Link from "next/link";
import { useCallback, useState, useTransition } from "react";
import { OyunEkrani } from "@/oyunlar/arayuz";
import { OyunIkonu } from "@/components/oyuncu-ikon";
import { GecisKarti } from "@/components/gecis-karti";
import { oyunGorseli } from "@/components/oyuncu-gorsel";
import { sahneVarMi } from "@/components/oyun-sahnesi";
import { type KatalogKarti } from "@/oyunlar/katalog";
import { BiletYuzeyi } from "@/components/oyuncu";
import { RENK, oyunRengi } from "@/components/oyuncu-renk";
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

/**
 * ⚠️ Ü195: kendi tipi yok, katalogun tipi. Misafir ekranı `/oyunlar`
 * ile aynı kartı çiziyor ve kart kategori ile "bugünün oyunu"nu da
 * istiyor — ayrı bir tip tutmak o iki alanı burada eksik bırakırdı.
 */
export type Oyun = KatalogKarti;

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

  /*
    ⚠️ Kimlikle çağrılıyor, nesneyle değil — Ü195. Karusel kartı
    `calistir(oyunId)` diyor; kartın misafir ekranının nesne biçimini
    bilmesi gerekmiyor ve bilmemeli.
  */
  const turBaslat = useCallback(
    (oyunId: string) => {
      const oyun = oyunlar.find((o) => o.id === oyunId);
      if (!oyun) return;
      setHata(null);
      basla(async () => {
        const cevap = await misafirBasla(oyun.id);
        if (!cevap.ok) {
          setHata(cevap.hata);
          return;
        }
        setDurum({ tur: "oynuyor", oyun, tohum: cevap.tohum });
      });
    },
    [oyunlar],
  );

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
          /* `kazandirir` konumun doğrulanmış olmasına bağlı. Ü203'ten
             beri ödül paketi de buna bakıyor: doğrulanmadıysa paket
             hiç gösterilmiyor, çünkü kupon açılmayacak. */
          kazandirir={!!konum?.dogrulandi}
          /* Misafirde katalog sayfası yok; çıkış oyun seçimine dönüyor. */
          cik={() => setDurum({ tur: "secim" })}
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
        tekrar={() => turBaslat(durum.oyun.id)}
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

      {/*
        🔴 Ana ekranın YATAY GEÇİŞ KARTI — Ü196.

        Bu bölüm üç tur değişti ve üçüncüsü ürün sahibinin gösterdiği
        şey oldu:

          Ü194 → elle kurulmuş dört koyu satır. *"Birebir aynı olmalı."*
          Ü195 → katalogun karuseli. *"Hayır carousel şeklinde değil,
                 burdaki gibi olacak."* Ekran görüntüsünde `/oyna`daki
                 "Tüm oyunlar" ve "Buradaki fırsatlar" kartları vardı.
          Ü196 → tam o kart: `GecisKarti`.

        ⚠️ Karusel yanlış seçimdi ve sebebi ölçülebilir: 244×356'lık
        kart tek seferde **bir** oyun gösteriyor ve diğerlerine ulaşmak
        için sürüklemek gerekiyor. Masaya yeni oturmuş, karekodu daha
        yeni okutmuş bir misafir için "dört oyun var" bilgisi ilk
        bakışta görünmeli — burası katalog değil, ilk karar ekranı.

        ⚠️ Kart `/oyna`daki ile **aynı bileşen**, kopyası değil. Ü195'te
        `oyunlar/katalog.ts`e çıkarılan sıra ve kategoriler de yerinde
        duruyor: üst etiket kategoriyi, bugünün oyununda altın "×2"
        rozetini taşıyor.
      */}
      <div className="grid gap-2.5">
        {oyunlar.map((oyun) => (
          <GecisKarti
            key={oyun.id}
            oyna={() => turBaslat(oyun.id)}
            bekliyor={bekliyor}
            ust={oyun.bugunMu ? "Bugünün oyunu · ×2 puan" : oyun.kategori}
            ustVurgulu={oyun.bugunMu}
            baslik={oyun.ad}
            alt={oyun.ozet}
            renk={oyunRengi(oyun.id)}
            /* ⚠️ Sahnesi olmayan oyun eski soluk çizimde kalıyor —
                uydurma bir sahne koymaktansa (aynı kural katalog
                kartında da yazılı). */
            sahne={sahneVarMi(oyun.id) ? oyun.id : undefined}
            gorsel={sahneVarMi(oyun.id) ? undefined : oyunGorseli(oyun.id)}
          />
        ))}
      </div>

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
    /*
      🔴 Şerit TEK SÜTUNA indi — Ü194, ekrandan ölçüldü.

      Başlık, açıklama ve iki düğme aynı `flex` satırındaydı. 375
      piksellik telefonda düğmeler ("Doğrula" + "Kafedeyim") ~190
      piksel yiyor, nokta ve boşluklar ~30; metne kalan 110 piksel.
      Ekran görüntüsünde sonuç şu: *"ÖDÜL İÇİN KONUM GEREKİYOR"* iki
      satıra, altındaki cümle üç satıra bölünüyor ve kutu üç katına
      çıkıyor — hepsi yan yana duran iki düğme uğruna.

      Düğmeler alta inince metin tam genişliğe kavuşuyor ve dokunma
      hedefleri de büyüyor.
    */
    <div
      className={`rounded-2xl border px-4 py-3.5 ${
        dogrulandi ? "border-vurgu bg-cukur" : cikmaz ? "border-cizgi bg-yuzey" : "border-odul/60 bg-yuzey"
      }`}
    >
      <div className="flex items-start gap-3">
        <span
          aria-hidden
          className={`mt-1 size-2.5 shrink-0 rounded-full border ${
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
          <div className="mt-1 text-[13px] leading-relaxed text-yazi-sonuk">
            {(cikmaz ? null : not) ??
              (dogrulandi
                ? `${kafeAdi}${konum?.mesafeM != null ? ` · ${konum.mesafeM} m` : ""} — kazandığın ödül hesabına işlenecek`
                : cikmaz
                  ? `${kafeAdi} konumunu henüz işaretlememiş. Oynayabilirsin ama ödül açılmıyor — senin yapabileceğin bir şey yok.`
                  : "Doğrulamazsan oynayabilirsin ama ödül açılmaz")}
          </div>
        </div>
      </div>

      {/* Çıkmazda düğme yok: basılınca hiçbir şey olmayacak bir düğme,
          oyuncuyu kendi hatasını aramaya iter. */}
      {!dogrulandi && !cikmaz && (
        <div className="mt-3 flex items-center gap-2">
          {/* ⚠️ Yazı KOYU, beyaz değil — ölçüldü. İlk hâlinde altın
              zeminde (`--color-odul`, #d4af37) beyaz yazıyordu ve
              kontrast 2.1:1 çıkıyordu. Altın gradyan + koyu kahve yazı
              oyun kabuğundaki "▶ Oyna" düğmesinin aynısı (Ü191): ürünün
              tek altın düğme dili o. */}
          <button
            type="button"
            onClick={iste}
            disabled={bekliyor}
            className="flex-1 rounded-xl px-4 py-2.5 text-center font-display text-[14px] font-bold disabled:opacity-50"
            style={{
              background: "linear-gradient(180deg, #ffd45e 0%, #f7b02a 100%)",
              color: "#4a2708",
            }}
          >
            {bekliyor ? "…" : "Konumumu doğrula"}
          </button>
          {demo && (
            <button
              type="button"
              onClick={demo}
              disabled={bekliyor}
              className="etiket-caps shrink-0 rounded-xl border border-odul px-3 py-2.5 text-odul-koyu disabled:opacity-50"
              title="Yalnızca geliştirmede görünür"
            >
              Kafedeyim
            </button>
          )}
        </div>
      )}
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

  const r = RENK[oyunRengi(oyun.id)];

  return (
    <div>
      {/*
        🔴 Sonuç kartı koyu bilete geçti — Ü194.

        Ü191'de girişli oyuncunun sonuç kartı taşınmıştı; misafirinki
        aynı anın **aynı ekranı** ve geride kalmıştı. Aynı oyunu aynı
        masada oynayan iki kişi, sonucu iki farklı dilde görüyordu.

        Yerleşim de oradan birebir alındı: oyun adı üstte kuşağın canlı
        tonunda, başlık, skor ortada tek büyük sayı olarak.
      */}
      <BiletYuzeyi renk={oyunRengi(oyun.id)} className="px-6 py-7">
        <div className="relative flex items-center gap-2">
          <OyunIkonu oyunId={oyun.id} boy={18} />
          <span className="etiket-caps" style={{ color: r.canli }}>
            {oyun.ad}
          </span>
        </div>
        <h2 className="relative mt-1.5 font-display text-3xl leading-none font-extrabold tracking-tight text-white">
          {cevap.basarili ? "İyi tur" : "Tur bitti"}
        </h2>

        {/* Skor tek başına ortada: ekranın tek büyük sayısı o. */}
        <div className="relative mt-6 text-center">
          <div className="etiket-caps text-white/55">Skor</div>
          {/* ⚠️ Başarılı tur `canli` ile parlıyor, başarısız beyaz
              kalıyor — koyu zeminde `--color-vurgu` hiç okunmuyordu. */}
          <div
            className="patla mt-1 font-data text-6xl leading-none font-bold tabular"
            style={{ color: cevap.basarili ? r.canli : "#ffffff" }}
          >
            {cevap.skor.toLocaleString("tr-TR")}
          </div>
          <div className="mt-2 font-data text-[9px] text-white/45">sunucuda doğrulandı</div>
        </div>
      </BiletYuzeyi>

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
