"use client";

import { useActionState, useState } from "react";
import { IsletmeAlan, isletmeGirdi, IsletmeDugme, IsletmeUyari } from "@/components/isletme";

/**
 * İşletme ve platform tarafı için ortak telefon + SMS giriş formu.
 *
 * Sunucu eylemleri dışarıdan geçiliyor: kafe yöneticisi ve platform
 * kullanıcısı aynı akışı kullanıyor ama farklı hesap tablolarına bakıyor.
 */

export type GirisDurumu = {
  adim: "telefon" | "kod";
  hata?: string;
  alanHatasi?: string;
  gelistirmeKodu?: string;
  telefon?: string;
};

export function OtpGirisFormu({
  kodGonder,
  kodDogrula,
  etiket = "Cep telefonu",
  ipucu,
}: {
  kodGonder: (o: GirisDurumu, f: FormData) => Promise<GirisDurumu>;
  kodDogrula: (o: GirisDurumu, f: FormData) => Promise<GirisDurumu>;
  etiket?: string;
  ipucu?: string;
}) {
  const [disDurum, setDisDurum] = useState<GirisDurumu>({ adim: "telefon" });

  return disDurum.adim === "telefon" ? (
    <TelefonAdimi eylem={kodGonder} disDurum={disDurum} ilerle={setDisDurum} etiket={etiket} ipucu={ipucu} />
  ) : (
    <KodAdimi eylem={kodDogrula} disDurum={disDurum} geriDon={setDisDurum} />
  );
}

function TelefonAdimi({
  eylem,
  disDurum,
  ilerle,
  etiket,
  ipucu,
}: {
  eylem: (o: GirisDurumu, f: FormData) => Promise<GirisDurumu>;
  disDurum: GirisDurumu;
  ilerle: (d: GirisDurumu) => void;
  etiket: string;
  ipucu?: string;
}) {
  const [durum, action, bekliyor] = useActionState(async (o: GirisDurumu, f: FormData) => {
    const yeni = await eylem(o, f);
    if (yeni.adim === "kod") ilerle(yeni);
    return yeni;
  }, disDurum);

  return (
    <form action={action} className="space-y-5">
      {durum.hata && <IsletmeUyari>{durum.hata}</IsletmeUyari>}

      <IsletmeAlan etiket={etiket} hata={durum.alanHatasi} ipucu={ipucu}>
        <input
          name="telefon"
          type="tel"
          autoComplete="tel"
          defaultValue={durum.telefon}
          placeholder="0532 123 45 67"
          className={isletmeGirdi}
          required
        />
      </IsletmeAlan>

      <IsletmeDugme type="submit" disabled={bekliyor}>
        {bekliyor ? "Gönderiliyor…" : "Doğrulama kodu gönder"}
      </IsletmeDugme>
    </form>
  );
}

function KodAdimi({
  eylem,
  disDurum,
  geriDon,
}: {
  eylem: (o: GirisDurumu, f: FormData) => Promise<GirisDurumu>;
  disDurum: GirisDurumu;
  geriDon: (d: GirisDurumu) => void;
}) {
  const [durum, action, bekliyor] = useActionState(async (o: GirisDurumu, f: FormData) => {
    const yeni = await eylem(o, f);
    if (yeni.adim === "telefon") geriDon(yeni);
    return yeni;
  }, disDurum);

  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="telefon" value={disDurum.telefon ?? ""} />

      {disDurum.gelistirmeKodu && (
        <div className="rounded-lg border border-odul/50 bg-odul/5 px-4 py-3">
          <div className="etiket-caps text-yazi-sonuk">
            Geliştirme · SMS gönderilmedi
          </div>
          <div className="mt-1 font-data text-xl font-bold tracking-[0.3em] tabular">
            {disDurum.gelistirmeKodu}
          </div>
        </div>
      )}

      {durum.hata && <IsletmeUyari>{durum.hata}</IsletmeUyari>}

      <IsletmeAlan
        etiket="Doğrulama kodu"
        hata={durum.alanHatasi}
        ipucu={`${disDurum.telefon} numarasına gönderildi`}
      >
        <input
          name="kod"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          className={`${isletmeGirdi} text-center font-data text-xl tracking-[0.4em] tabular`}
          required
          autoFocus
        />
      </IsletmeAlan>

      <div className="flex items-center gap-4">
        <IsletmeDugme type="submit" disabled={bekliyor}>
          {bekliyor ? "Doğrulanıyor…" : "Giriş yap"}
        </IsletmeDugme>
        <button
          type="button"
          onClick={() => geriDon({ adim: "telefon", telefon: disDurum.telefon })}
          className="text-[14px] text-yazi-sonuk underline"
        >
          Numarayı değiştir
        </button>
      </div>
    </form>
  );
}
