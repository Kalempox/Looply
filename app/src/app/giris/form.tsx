"use client";

import { useActionState, useState } from "react";
import {
  parolaIleGir,
  kodGonder,
  kodDogrulaVeGir,
  sifirlamaKoduGonder,
  parolaSifirlaVeGir,
  type Durum,
  type Sekme,
  type SifirlamaDurumu,
} from "./actions";
import { kurallar } from "@/domain/parola-kurallari";
import { Alan, girdiSinifi, Dugme, Uyari } from "@/components/ui";
import { KAYIT_ALANLARI } from "./alanlar";

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

export function GirisFormu({ masadaMi }: { masadaMi?: boolean }) {
  const [sekme, setSekme] = useState<Sekme>("giris");
  const [kayitDurumu, setKayitDurumu] = useState<Durum>(KAYIT_BASLANGIC);

  // Sekmeler ve adımlar arasında taşınan alanlar
  const [telefon, setTelefon] = useState("");
  const [parola, setParola] = useState("");
  const [hatirla, setHatirla] = useState(false);
  const [pazarlama, setPazarlama] = useState(false);
  // Ü270: "Parolamı unuttum" kendi ekranı — kayıt formuna gönderilmiyor.
  const [sifirlama, setSifirlama] = useState(false);

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

  if (sifirlama) {
    return (
      <ParolaSifirlama
        telefon={telefon}
        setTelefon={setTelefon}
        hatirla={hatirla}
        setHatirla={setHatirla}
        vazgec={() => setSifirlama(false)}
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
            parolaUnuttum={() => setSifirlama(true)}
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

      {/* 🔴 Ü270: "Google ile devam et" / "Apple ile devam et" KALKTI.
          Ürün sahibi: "Google ve Apple hesaplarını kaldıralım, e-postayı
          kendileri girsinler." Düğmeler zaten sağlayıcıya bağlı değildi —
          yalnızca kayıt sekmesini açıyordu (Ü36). */}
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
  parolaUnuttum,
}: {
  telefon: string;
  setTelefon: (v: string) => void;
  hatirla: boolean;
  setHatirla: (v: boolean) => void;
  parolaUnuttum: () => void;
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
        🔴 Ü270: kendi ekranı var. Önce "Hesap aç" sekmesini açıyordu —
        kayıtlı numarada o form parolayı yeniden yazıyordu ama ad, soyad
        ve doğum yılını baştan istiyordu. Ayrı bir jeton yine yok: kod
        hesabın kayıtlı e-postasına gidiyor (`domain/parola-sifirlama.ts`).
      */}
      <button
        type="button"
        onClick={parolaUnuttum}
        className="w-full py-2 text-center text-[13px] text-yazi-sonuk underline"
      >
        Parolanı mı unuttun?
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

      {/*
        ⚠️ İpucu Ü170'te değişti. Önce "Doğrulama kodu bu numaraya
        gelecek" yazıyordu ve kod e-postaya taşınınca **yalan oldu**.
        Ekranın söylediği şeyle sistemin yaptığı şey ayrılınca, hata
        kodda değil güvende olur: kullanıcı SMS bekler, gelmez, ürün
        bozuk sanılır.
      */}
      <Alan
        etiket="Cep telefonu"
        hata={durum.hatalar?.telefon}
        ipucu="Hesabının kimliği — kasada bununla tanınıyorsun"
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

      {/*
        E-posta — Ü168'de eklendi, Ü170'te kodu taşımaya başladı.

        İpucu Ü169'da bilerek boş bırakılmıştı: o gün adres yalnızca
        toplanıyordu ve "kod buraya gelecek" demek, verilmemiş bir söz
        olurdu. Artık gerçekten buraya geliyor, söz de yerine geldi.

        `type="email"` telefonlarda @ tuşlu klavyeyi açıyor;
        `autoComplete="email"` tarayıcının kayıtlı adresini öneriyor.
      */}
      <Alan
        etiket="E-posta"
        hata={durum.hatalar?.eposta}
        ipucu="Doğrulama kodu bu adrese gelecek"
      >
        <input
          name="eposta"
          type="email"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="none"
          spellCheck={false}
          defaultValue={d.eposta}
          placeholder="ornek@eposta.com"
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
      {/* 🔴 Ü270: gizli girdiler TEK LİSTEDEN (`alanlar.ts`). Elle
          yazılıyorlardı ve e-posta unutulmuştu — kodu doğru giren herkes
          "E-posta adresi eksik" hatasıyla forma geri atılıyordu. */}
      {KAYIT_ALANLARI.map((alan) => (
        <input
          key={alan}
          type="hidden"
          name={alan}
          value={alan === "telefon" ? telefon : (d[alan] ?? "")}
        />
      ))}
      <input type="hidden" name="aydinlatma" value="on" />
      {/* Parola sunucudan geri gelmiyor; istemci durumundan bir kez daha
          gönderiliyor. Kurallara uygunluğu adım 1'de zaten sınandı. */}
      <input type="hidden" name="parola" value={parola} />
      {hatirla && <input type="hidden" name="hatirla" value="on" />}
      {pazarlama && <input type="hidden" name="pazarlama" value="on" />}

      {disDurum.gelistirmeKodu && <GelistirmeKodu kod={disDurum.gelistirmeKodu} />}
      {disDurum.bilgi && !disDurum.gelistirmeKodu && <Uyari tur="bilgi">{disDurum.bilgi}</Uyari>}
      {durum.genelHata && <Uyari>{durum.genelHata}</Uyari>}

      {/*
        ⚠️ Ü170: burada NUMARA değil ADRES yazıyor.

        Önce "{telefon} numarasına gönderildi" diyordu ve kod
        e-postaya taşınınca insanı telefonuna bakmaya gönderiyordu —
        orada hiçbir şey yok. Kullanıcının gideceği yeri yanlış
        söylemek, koda hiç ulaşamaması demek.

        `d.eposta` sunucudan geri gelen form değerlerinden; adım 2'de
        alan ekranda görünmediği için tek kaynak o.
      */}
      <Alan
        etiket="Doğrulama kodu"
        hata={durum.hatalar?.kod}
        ipucu={d.eposta ? `${d.eposta} adresine gönderildi` : "E-posta adresine gönderildi"}
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

/* ── Parolamı unuttum (Ü270) ─────────────────────────────── */

const SIFIRLAMA_BASLANGIC: SifirlamaDurumu = { adim: "telefon" };

/**
 * İki adım: telefon → kod hesabın e-postasına; kod + yeni parola → içeri.
 * Kural ve güvenlik kararları `domain/parola-sifirlama.ts`te.
 */
function ParolaSifirlama(props: {
  telefon: string;
  setTelefon: (v: string) => void;
  hatirla: boolean;
  setHatirla: (v: boolean) => void;
  vazgec: () => void;
}) {
  /* "Kodu yeniden iste" akışı BAŞTAN kuruyor: `key` değişince içteki
     `useActionState` ilk durumuna dönüyor. Durumu elle geri sarmak iki
     kaynaklı bir durum doğuruyordu ve yeni kod istendiğinde ekran 1.
     adımda takılı kalıyordu. Telefon üst bileşende, kaybolmuyor. */
  const [tur, setTur] = useState(0);
  return <SifirlamaAkisi key={tur} {...props} yenidenIste={() => setTur((t) => t + 1)} />;
}

function SifirlamaAkisi({
  telefon,
  setTelefon,
  hatirla,
  setHatirla,
  vazgec,
  yenidenIste,
}: {
  telefon: string;
  setTelefon: (v: string) => void;
  hatirla: boolean;
  setHatirla: (v: boolean) => void;
  vazgec: () => void;
  yenidenIste: () => void;
}) {
  const [durum, istekEylemi, istekBekliyor] = useActionState(
    sifirlamaKoduGonder,
    SIFIRLAMA_BASLANGIC,
  );

  if (durum.adim === "kod") {
    return (
      <SifirlamaKodAdimi
        disDurum={durum}
        hatirla={hatirla}
        setHatirla={setHatirla}
        yenidenIste={yenidenIste}
        vazgec={vazgec}
      />
    );
  }

  return (
    <form action={istekEylemi} className="space-y-5">
      <div>
        <h2 className="font-display text-xl font-bold">Parolanı sıfırla</h2>
        <p className="mt-1 text-[13px] leading-relaxed text-yazi-sonuk">
          Telefon numaranı yaz; hesabında kayıtlı e-postaya bir kod gönderelim.
        </p>
      </div>

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

      <Dugme type="submit" disabled={istekBekliyor}>
        {istekBekliyor ? "Gönderiliyor…" : "Kod gönder"}
      </Dugme>

      <button
        type="button"
        onClick={vazgec}
        className="w-full py-2 text-center text-[13px] text-yazi-sonuk underline"
      >
        Girişe dön
      </button>
    </form>
  );
}

function SifirlamaKodAdimi({
  disDurum,
  hatirla,
  setHatirla,
  yenidenIste,
  vazgec,
}: {
  disDurum: SifirlamaDurumu;
  hatirla: boolean;
  setHatirla: (v: boolean) => void;
  yenidenIste: () => void;
  vazgec: () => void;
}) {
  const [durum, eylem, bekliyor] = useActionState(parolaSifirlaVeGir, disDurum);
  // Parola sunucudan geri gelmiyor; yanlış kodda silinmesin diye burada.
  const [yeniParola, setYeniParola] = useState("");
  const adres = durum.adres ?? disDurum.adres;

  return (
    <form action={eylem} className="space-y-5">
      <input type="hidden" name="telefon" value={disDurum.telefon ?? ""} />
      {adres && <input type="hidden" name="adres" value={adres} />}

      <div>
        <h2 className="font-display text-xl font-bold">Yeni parolanı belirle</h2>
      </div>

      {disDurum.gelistirmeKodu && <GelistirmeKodu kod={disDurum.gelistirmeKodu} />}
      {durum.genelHata && <Uyari>{durum.genelHata}</Uyari>}

      <Alan
        etiket="Doğrulama kodu"
        hata={durum.hatalar?.kod}
        ipucu={adres ? `${adres} adresine gönderildi` : "Hesabındaki e-posta adresine gönderildi"}
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

      <Alan etiket="Yeni parola" hata={durum.hatalar?.parola}>
        <input
          name="parola"
          type="password"
          autoComplete="new-password"
          value={yeniParola}
          onChange={(e) => setYeniParola(e.target.value)}
          placeholder="••••••••"
          className={girdiSinifi}
          required
        />
      </Alan>
      <ParolaKurallari parola={yeniParola} />

      <BeniHatirla isaretli={hatirla} degistir={setHatirla} />

      <Dugme type="submit" disabled={bekliyor}>
        {bekliyor ? "Kaydediliyor…" : "Parolayı değiştir ve gir"}
      </Dugme>

      <button
        type="button"
        onClick={yenidenIste}
        className="w-full py-2 text-center text-[13px] text-yazi-sonuk underline"
      >
        Kodu yeniden iste
      </button>
      <button
        type="button"
        onClick={vazgec}
        className="w-full py-1 text-center text-[13px] text-yazi-sonuk underline"
      >
        Girişe dön
      </button>
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

/* ── Geliştirme kolaylığı ─────────────────────────────────── */

/**
 * Sahte e-posta sağlayıcısı kullanılırken kodu ekranda gösterir.
 *
 * Kodu görmek için sunucu logu okumak test etmeyi gereksiz zorlaştırıyordu.
 * Canlıda bu kutu hiçbir koşulda görünmez: sunucu `gelistirmeKodu` alanını
 * yalnızca sahte sağlayıcıda dolduruyor (`epostaKoduEkrandaGosterilir`) ve
 * `env.ts` canlıda o sağlayıcıyı zaten reddediyor.
 *
 * ⚠️ Metin Ü170'te "SMS"ten "e-posta"ya döndü — kutu neyin
 * gönderilmediğini söylüyor ve yanlış kanalı söylemesi, geliştiricinin
 * yanlış yerde arama yapmasına yol açardı.
 */
function GelistirmeKodu({ kod }: { kod: string }) {
  return (
    <div className="rounded-lg border border-odul/60 bg-cukur px-4 py-3.5">
      <div className="etiket-caps text-odul-koyu">Geliştirme · e-posta gönderilmedi</div>
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
