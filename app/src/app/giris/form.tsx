"use client";

import { useActionState, useState } from "react";
import { parolaIleGir, kodGonder, kodDogrulaVeGir, type Durum, type Sekme } from "./actions";
import { kurallar } from "@/domain/parola-kurallari";
import { Alan, girdiSinifi, Dugme, Uyari } from "@/components/ui";

/**
 * Giriş ekranı — iki sekme, tek kimlik (Ü36).
 *
 * ── Parola neden burada, durumun içinde değil ───────────────
 *
 * "Hesap aç" iki adım: bilgiler → doğrulama kodu. Parola ikinci adımda da
 * gerekiyor ama sunucunun döndürdüğü `Durum` nesnesine **konmuyor** — o
 * nesne her eylem sonucunda ağdan geri geliyor ve React durumunda yaşıyor.
 * Parola bu bileşenin kendi durumunda kalıyor ve ikinci adımda form
 * gövdesiyle bir kez daha gönderiliyor.
 */

const GIRIS_BASLANGIC: Durum = { adim: "form", sekme: "giris" };
const KAYIT_BASLANGIC: Durum = { adim: "form", sekme: "kayit" };

export function GirisFormu({
  masadaMi,
  demoKapisi,
}: {
  masadaMi?: boolean;
  /** Google/Apple düğmeleri görünsün mü — sunucu karar veriyor (Ü36). */
  demoKapisi?: boolean;
}) {
  const [sekme, setSekme] = useState<Sekme>("giris");
  const [kayitDurumu, setKayitDurumu] = useState<Durum>(KAYIT_BASLANGIC);

  // Sekmeler ve adımlar arasında taşınan alanlar
  const [telefon, setTelefon] = useState("");
  const [parola, setParola] = useState("");
  const [hatirla, setHatirla] = useState(false);
  const [pazarlama, setPazarlama] = useState(false);

  if (kayitDurumu.adim === "kod") {
    return (
      <KodAdimi
        disDurum={kayitDurumu}
        telefon={telefon}
        parola={parola}
        hatirla={hatirla}
        pazarlama={pazarlama}
        masadaMi={masadaMi}
        geriDon={setKayitDurumu}
      />
    );
  }

  return (
    <div className="space-y-6">
      <Sekmeler aktif={sekme} sec={setSekme} />

      {sekme === "giris" ? (
        <div role="tabpanel" id="panel-giris" aria-labelledby="sekme-giris">
          <GirisSekmesi
            telefon={telefon}
            setTelefon={setTelefon}
            hatirla={hatirla}
            setHatirla={setHatirla}
            smsAkisi={() => setSekme("kayit")}
          />
        </div>
      ) : (
        <div role="tabpanel" id="panel-kayit" aria-labelledby="sekme-kayit">
          <KayitSekmesi
            disDurum={kayitDurumu}
            telefon={telefon}
            setTelefon={setTelefon}
            parola={parola}
            setParola={setParola}
            hatirla={hatirla}
            setHatirla={setHatirla}
            pazarlama={pazarlama}
            setPazarlama={setPazarlama}
            koda={setKayitDurumu}
          />
        </div>
      )}

      {demoKapisi && <SaglayiciDugmeleri smsAkisi={() => setSekme("kayit")} />}
    </div>
  );
}

/* ── Sekmeler ─────────────────────────────────────────────── */

function Sekmeler({ aktif, sec }: { aktif: Sekme; sec: (s: Sekme) => void }) {
  const sekmeler: { ad: Sekme; etiket: string }[] = [
    { ad: "giris", etiket: "Giriş yap" },
    { ad: "kayit", etiket: "Hesap aç" },
  ];

  return (
    <div
      role="tablist"
      aria-label="Giriş yöntemi"
      className="grid grid-cols-2 gap-1 rounded-lg border border-cizgi bg-cukur p-1"
    >
      {sekmeler.map((s) => (
        <button
          key={s.ad}
          type="button"
          role="tab"
          id={`sekme-${s.ad}`}
          aria-selected={aktif === s.ad}
          aria-controls={`panel-${s.ad}`}
          onClick={() => sec(s.ad)}
          className={`rounded-md px-4 py-2.5 font-display text-[15px] font-bold tracking-tight transition-colors ${
            aktif === s.ad ? "bg-yuzey text-yazi shadow-sm" : "text-yazi-sonuk hover:text-yazi"
          }`}
        >
          {s.etiket}
        </button>
      ))}
    </div>
  );
}

/* ── Adım 1a · Giriş yap: telefon + parola ───────────────── */

function GirisSekmesi({
  telefon,
  setTelefon,
  hatirla,
  setHatirla,
  smsAkisi,
}: {
  telefon: string;
  setTelefon: (v: string) => void;
  hatirla: boolean;
  setHatirla: (v: boolean) => void;
  smsAkisi: () => void;
}) {
  const [durum, action, bekliyor] = useActionState(parolaIleGir, GIRIS_BASLANGIC);

  return (
    <form action={action} className="space-y-5">
      {durum.genelHata && <Uyari>{durum.genelHata}</Uyari>}

      <Alan etiket="Cep telefonu" hata={durum.hatalar?.telefon}>
        <input
          name="telefon"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          value={telefon}
          onChange={(e) => setTelefon(e.target.value)}
          placeholder="0532 123 45 67"
          className={girdiSinifi}
          required
        />
      </Alan>

      <Alan etiket="Parola" hata={durum.hatalar?.parola}>
        <input
          name="parola"
          type="password"
          autoComplete="current-password"
          placeholder="••••••••"
          className={girdiSinifi}
          required
        />
      </Alan>

      <BeniHatirla isaretli={hatirla} degistir={setHatirla} />

      <Dugme type="submit" disabled={bekliyor}>
        {bekliyor ? "Giriliyor…" : "Gir"}
      </Dugme>

      {/*
        Ayrı bir "şifremi unuttum" akışı bilerek yok: numara zaten
        doğrulanmış ve SMS ile giriş açık. Parolasını unutan buradan girer,
        isterse yenisini belirler — ayrı bir sıfırlama jetonu, ayrı bir
        kanal ve ayrı bir saldırı yüzeyi doğmuyor.
      */}
      <button
        type="button"
        onClick={smsAkisi}
        className="w-full py-2 text-center text-[13px] text-yazi-sonuk underline"
      >
        Parolanı mı unuttun? SMS ile gir
      </button>
    </form>
  );
}

/* ── Adım 1b · Hesap aç: bilgiler + parola ───────────────── */

function KayitSekmesi({
  disDurum,
  telefon,
  setTelefon,
  parola,
  setParola,
  hatirla,
  setHatirla,
  pazarlama,
  setPazarlama,
  koda,
}: {
  disDurum: Durum;
  telefon: string;
  setTelefon: (v: string) => void;
  parola: string;
  setParola: (v: string) => void;
  hatirla: boolean;
  setHatirla: (v: boolean) => void;
  pazarlama: boolean;
  setPazarlama: (v: boolean) => void;
  koda: (d: Durum) => void;
}) {
  const [durum, action, bekliyor] = useActionState(async (o: Durum, f: FormData) => {
    const yeni = await kodGonder(o, f);
    if (yeni.adim === "kod") koda(yeni);
    return yeni;
  }, disDurum);

  const d = durum.degerler ?? {};

  return (
    <form action={action} className="space-y-5">
      {durum.genelHata && <Uyari>{durum.genelHata}</Uyari>}

      <Alan
        etiket="Cep telefonu"
        hata={durum.hatalar?.telefon}
        ipucu="Doğrulama kodu bu numaraya gelecek"
      >
        <input
          name="telefon"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          value={telefon}
          onChange={(e) => setTelefon(e.target.value)}
          placeholder="0532 123 45 67"
          className={girdiSinifi}
          required
        />
      </Alan>

      <div className="grid grid-cols-2 gap-3">
        <Alan etiket="Ad" hata={durum.hatalar?.ad}>
          <input
            name="ad"
            autoComplete="given-name"
            defaultValue={d.ad}
            className={girdiSinifi}
            required
          />
        </Alan>
        <Alan etiket="Soyad" hata={durum.hatalar?.soyad}>
          <input
            name="soyad"
            autoComplete="family-name"
            defaultValue={d.soyad}
            className={girdiSinifi}
            required
          />
        </Alan>
      </div>

      <Alan
        etiket="Doğum yılı"
        hata={durum.hatalar?.dogumYili}
        ipucu="Looply 18 yaş ve üzeri içindir"
      >
        <input
          name="dogumYili"
          type="number"
          inputMode="numeric"
          defaultValue={d.dogumYili}
          placeholder="1995"
          className={girdiSinifi}
          required
        />
      </Alan>

      <div>
        <Alan etiket="Parola" hata={durum.hatalar?.parola}>
          <input
            name="parola"
            type="password"
            autoComplete="new-password"
            value={parola}
            onChange={(e) => setParola(e.target.value)}
            className={girdiSinifi}
            required
          />
        </Alan>
        <ParolaKurallari parola={parola} />
      </div>

      <div className="space-y-3 border-t border-cizgi pt-5">
        <Onay
          ad="aydinlatma"
          hata={durum.hatalar?.aydinlatma}
          zorunlu
          metin={
            <>
              <a href="/aydinlatma" target="_blank" className="text-vurgu underline">
                Aydınlatma metnini
              </a>{" "}
              okudum, kişisel verilerimin işlenmesini kabul ediyorum.
            </>
          }
        />
        {/* G7: ticari ileti izni AYRI kutu ve işaretsiz gelir.
            Hizmet bu izne bağlanamaz — işaretlemeyen de kaydolabilir.
            Denetimli: seçim adım 2'ye taşınıyor, yoksa sessizce kaybolurdu. */}
        <Onay
          ad="pazarlama"
          isaretli={pazarlama}
          degistir={setPazarlama}
          metin="Looply'den kampanya ve fırsat bildirimleri almak istiyorum."
        />
      </div>

      <BeniHatirla isaretli={hatirla} degistir={setHatirla} />

      <Dugme type="submit" disabled={bekliyor}>
        {bekliyor ? "Gönderiliyor…" : "Doğrulama kodu gönder"}
      </Dugme>
    </form>
  );
}

/* ── Adım 2 · doğrulama kodu ─────────────────────────────── */

function KodAdimi({
  disDurum,
  telefon,
  parola,
  hatirla,
  pazarlama,
  masadaMi,
  geriDon,
}: {
  disDurum: Durum;
  telefon: string;
  parola: string;
  hatirla: boolean;
  pazarlama: boolean;
  masadaMi?: boolean;
  geriDon: (d: Durum) => void;
}) {
  const [durum, action, bekliyor] = useActionState(async (o: Durum, f: FormData) => {
    const yeni = await kodDogrulaVeGir(o, f);
    if (yeni.adim === "form") geriDon(yeni);
    return yeni;
  }, disDurum);

  const d = durum.degerler ?? disDurum.degerler ?? {};

  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="telefon" value={telefon} />
      <input type="hidden" name="ad" value={d.ad ?? ""} />
      <input type="hidden" name="soyad" value={d.soyad ?? ""} />
      <input type="hidden" name="dogumYili" value={d.dogumYili ?? ""} />
      <input type="hidden" name="aydinlatma" value="on" />
      {/* Parola sunucudan geri gelmiyor; istemci durumundan bir kez daha
          gönderiliyor. Kurallara uygunluğu adım 1'de zaten sınandı. */}
      <input type="hidden" name="parola" value={parola} />
      {hatirla && <input type="hidden" name="hatirla" value="on" />}
      {pazarlama && <input type="hidden" name="pazarlama" value="on" />}

      {disDurum.gelistirmeKodu && <GelistirmeKodu kod={disDurum.gelistirmeKodu} />}
      {disDurum.bilgi && !disDurum.gelistirmeKodu && <Uyari tur="bilgi">{disDurum.bilgi}</Uyari>}
      {durum.genelHata && <Uyari>{durum.genelHata}</Uyari>}

      <Alan
        etiket="Doğrulama kodu"
        hata={durum.hatalar?.kod}
        ipucu={`${telefon} numarasına gönderildi`}
      >
        <input
          name="kod"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          placeholder="——————"
          className={`${girdiSinifi} text-center font-data text-2xl tracking-[0.4em] tabular`}
          required
          autoFocus
        />
      </Alan>

      <Dugme type="submit" disabled={bekliyor}>
        {bekliyor ? "Doğrulanıyor…" : "Doğrula ve gir"}
      </Dugme>

      <button
        type="button"
        onClick={() => geriDon({ adim: "form", sekme: "kayit", degerler: d })}
        className="w-full py-2 text-center text-[13px] text-yazi-sonuk underline"
      >
        Bilgileri düzelt
      </button>

      {masadaMi && (
        <p className="text-center font-data text-[10px] tracking-wide text-yazi-sonuk">
          Masa bağlantın hazır — giriş yapınca oyunlar açılıyor
        </p>
      )}
    </form>
  );
}

/* ── Parola kuralları · canlı liste ──────────────────────── */

/**
 * Liste sunucununkiyle **aynı** fonksiyondan geliyor
 * (`domain/parola-kurallari.ts`). İki yerde yazılsaydı biri gevşer ve
 * kullanıcı "kurallara uydum ama kabul etmiyor" derdi.
 *
 * Renk tek başına anlam taşımıyor: geçen kural dolu daire, geçmeyen boş
 * halka — ayrıca ekran okuyucuya durumu söyleyen bir metin var.
 */
function ParolaKurallari({ parola }: { parola: string }) {
  return (
    <ul className="mt-2.5 space-y-1.5">
      {kurallar(parola).map((k) => (
        <li key={k.ad} className="flex items-center gap-2.5 text-[13px] text-yazi-sonuk">
          <span
            aria-hidden
            className={`inline-block size-2 shrink-0 rounded-full ${
              k.gecti ? "bg-vurgu" : "border border-cizgi"
            }`}
          />
          <span className={k.gecti ? "text-yazi" : undefined}>{k.metin}</span>
          <span className="sr-only">{k.gecti ? "tamam" : "eksik"}</span>
        </li>
      ))}
    </ul>
  );
}

/* ── Beni hatırla ────────────────────────────────────────── */

/**
 * İşaretlenmezse oturum 12 saat, işaretlenirse 90 gün (`oturum-omru.ts`).
 * Varsayılan **kapalı**: kafenin tableti ve arkadaşın telefonu da bu ekranı
 * görüyor ve orada üç ay açık kalan bir oturum, oturumun kendisi kadar
 * tehlikeli.
 */
function BeniHatirla({
  isaretli,
  degistir,
}: {
  isaretli: boolean;
  degistir: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3">
      <input
        type="checkbox"
        name="hatirla"
        checked={isaretli}
        onChange={(e) => degistir(e.target.checked)}
        className="mt-0.5 size-5 shrink-0 accent-vurgu"
      />
      <span className="text-[13px] leading-relaxed text-yazi-sonuk">
        Beni hatırla
        <span className="mt-0.5 block text-[12px] text-yazi-sonuk/80">
          Ortak bir cihazdaysan işaretleme — oturumun 12 saatte kapanır.
        </span>
      </span>
    </label>
  );
}

/* ── Google / Apple ──────────────────────────────────────── */

/**
 * Bugün **yalnızca düğme** (Ü36) — arkası SMS akışına düşüyor.
 *
 * Çalışmaları için Google tarafında bir Cloud projesi ve OAuth istemci
 * kimliği, Apple tarafında ücretli Developer Program üyeliği ve yayında bir
 * alan adı gerekiyor; ikisi de ürün sahibinin hesaplarıyla açılır.
 *
 * Bu yüzden düğmeler demo kapısının arkasında duruyor: çalışmayan bir giriş
 * düğmesinin canlıya sızması, demo kolaylığından pahalıya mal olur. Altındaki
 * satır da bilerek orada — düğme, yapmadığı şeyi vaat etmemeli.
 *
 * ── Neden altta ve neden ikon ───────────────────────────────
 *
 * Önce en üstteydiler ve tam genişlikte iki metin düğmesiydi: sayfayı açan
 * kişinin gördüğü ilk şey, **bu demoda çalışmayan** iki düğmeydi. Asıl akış
 * (telefon + kod) onların altında kalıyordu. Şimdi altta ve ikon: yer
 * kaplamıyor, tanıdık oldukları için etiket okumak gerekmiyor.
 *
 * İkon düğmesinin bedeli erişilebilirlik: içinde okunacak metin yok. O
 * yüzden `aria-label` zorunlu ve ikonların kendisi `aria-hidden` —
 * ekran okuyucu "Google ile devam et" duyuyor, "resim" değil.
 */
function SaglayiciDugmeleri({ smsAkisi }: { smsAkisi: () => void }) {
  const dugme =
    "flex size-14 items-center justify-center rounded-full border border-cizgi bg-yuzey " +
    "transition-colors hover:border-yazi-sonuk focus-visible:border-vurgu";

  return (
    <div className="space-y-3 pt-2">
      <div className="flex items-center gap-3">
        <span className="h-px flex-1 bg-cizgi" />
        <span className="etiket-caps text-yazi-sonuk">veya şununla devam et</span>
        <span className="h-px flex-1 bg-cizgi" />
      </div>

      <div className="flex justify-center gap-4">
        <button type="button" onClick={smsAkisi} className={dugme} aria-label="Google ile devam et">
          <GoogleIkonu />
        </button>
        <button type="button" onClick={smsAkisi} className={dugme} aria-label="Apple ile devam et">
          <AppleIkonu />
        </button>
      </div>

      <p className="text-center text-[12px] text-yazi-sonuk">
        Demoda bu düğmeler SMS akışına düşer — sağlayıcı bağlantısı henüz kurulmadı.
      </p>
    </div>
  );
}

/* ── Sağlayıcı ikonları ───────────────────────────────────────
 *
 * Satır içi SVG: giriş ekranında dış kaynaktan ikon çekmek, sayfanın en
 * kritik anında ağa bağımlılık demek. Marka renkleri palet dışında ama
 * bilerek — Google'ın G'si gri çizilirse tanınmıyor ve tanınmayan bir
 * giriş ikonu işe yaramıyor.
 */

function GoogleIkonu() {
  return (
    <svg width="22" height="22" viewBox="0 0 48 48" aria-hidden>
      <path
        fill="#4285F4"
        d="M45.1 24.5c0-1.6-.1-2.7-.4-3.9H24v7.1h12.1c-.2 1.8-1.6 4.5-4.5 6.3l6.9 5.4c4.1-3.8 6.6-9.4 6.6-15z"
      />
      <path
        fill="#34A853"
        d="M24 46c5.9 0 10.9-2 14.5-5.3l-6.9-5.4c-1.9 1.3-4.4 2.2-7.6 2.2-5.8 0-10.7-3.8-12.5-9.1l-7.1 5.5C8.1 41.1 15.4 46 24 46z"
      />
      <path
        fill="#FBBC05"
        d="M11.5 28.4c-.5-1.4-.7-2.9-.7-4.4s.3-3 .7-4.4l-7.1-5.5C2.9 17 2 20.4 2 24s.9 7 2.4 9.9l7.1-5.5z"
      />
      <path
        fill="#EA4335"
        d="M24 10.2c4.1 0 6.9 1.8 8.5 3.3l6.2-6C34.9 4 29.9 2 24 2 15.4 2 8.1 6.9 4.4 14.1l7.1 5.5c1.8-5.3 6.7-9.4 12.5-9.4z"
      />
    </svg>
  );
}

function AppleIkonu() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M17.05 12.54c-.02-2.2 1.79-3.25 1.87-3.3-1.02-1.49-2.6-1.7-3.17-1.72-1.35-.14-2.63.79-3.31.79-.68 0-1.73-.77-2.85-.75-1.47.02-2.82.85-3.58 2.16-1.53 2.65-.39 6.57 1.1 8.72.73 1.05 1.6 2.23 2.74 2.19 1.1-.05 1.51-.71 2.84-.71 1.32 0 1.7.71 2.86.69 1.18-.02 1.93-1.07 2.65-2.13.84-1.22 1.18-2.4 1.2-2.46-.03-.01-2.3-.88-2.32-3.49zM14.88 5.7c.6-.73 1.01-1.75.9-2.76-.87.04-1.92.58-2.55 1.31-.56.64-1.05 1.68-.92 2.67.97.08 1.96-.49 2.57-1.22z" />
    </svg>
  );
}

/* ── Geliştirme kolaylığı ─────────────────────────────────── */

/**
 * Sahte SMS sağlayıcısı kullanılırken kodu ekranda gösterir.
 *
 * Kodu görmek için sunucu logu okumak test etmeyi gereksiz zorlaştırıyordu.
 * Canlıda bu kutu hiçbir koşulda görünmez: sunucu `gelistirmeKodu` alanını
 * yalnızca sahte sağlayıcıda dolduruyor ve `env.ts` canlıda o sağlayıcıyı
 * zaten reddediyor.
 */
function GelistirmeKodu({ kod }: { kod: string }) {
  return (
    <div className="rounded-lg border border-odul/60 bg-cukur px-4 py-3.5">
      <div className="etiket-caps text-odul-koyu">Geliştirme · SMS gönderilmedi</div>
      <div className="mt-1.5 font-data text-2xl font-bold tracking-[0.3em] text-odul-koyu tabular">
        {kod}
      </div>
      <div className="mt-1 text-[12px] text-yazi-sonuk">
        Gerçek sağlayıcı bağlandığında bu kutu kaybolur.
      </div>
    </div>
  );
}

/* ── Onay kutusu ──────────────────────────────────────────── */

function Onay({
  ad,
  metin,
  hata,
  zorunlu,
  isaretli,
  degistir,
}: {
  ad: string;
  metin: React.ReactNode;
  hata?: string;
  zorunlu?: boolean;
  /** Verilirse kutu denetimli olur — seçim adımlar arasında korunur. */
  isaretli?: boolean;
  degistir?: (v: boolean) => void;
}) {
  return (
    <div>
      <label className="flex cursor-pointer items-start gap-3">
        <input
          type="checkbox"
          name={ad}
          className="mt-0.5 size-5 shrink-0 accent-vurgu"
          aria-required={zorunlu}
          {...(degistir
            ? { checked: !!isaretli, onChange: (e) => degistir(e.target.checked) }
            : {})}
        />
        <span className="text-[13px] leading-relaxed text-yazi-sonuk">{metin}</span>
      </label>
      {hata && <span className="mt-1.5 block pl-8 text-[13px] text-tehlike">{hata}</span>}
    </div>
  );
}
