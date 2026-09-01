import { notFound, redirect } from "next/navigation";
import * as oturum from "@/domain/session";
import * as masaOturumu from "@/domain/masa";
import { K2 } from "@/domain/masa";
import { oyunBul, gununOyunu } from "@/oyunlar";
import { kodEkrandaGosterilir } from "@/sms";
import { isGunu } from "@/lib/tarih";
import { Sayfa, Baslik } from "@/components/ui";
import { OyunKabugu } from "./oyun-kabuk";

export const dynamic = "force-dynamic";

/**
 * Oyun sayfası.
 *
 * Sunucu tarafı yalnızca **bağlamı** kuruyor: hangi oyun, oyuncu kafede mi,
 * konumu doğrulanmış mı, bugünün bonuslu oyunu bu mu. Oyunun kendisi ve
 * oturum akışı kabuğun içinde.
 *
 * `kazandirir` burada hesaplanıyor ve ekranda **oyun başlamadan önce**
 * söyleniyor. Oyuncunun bir bölümü bitirip "puan nerede?" diye sorması,
 * baştan söylenmesinden çok daha kötü.
 */
export default async function OyunSayfasi({
  params,
  searchParams,
}: {
  params: Promise<{ oyunId: string }>;
  searchParams: Promise<{ basla?: string }>;
}) {
  const { oyunId } = await params;
  const sp = await searchParams;

  const o = await oturum.oku();
  if (!o || o.rol !== "oyuncu") redirect("/giris");

  const oyun = oyunBul(oyunId);
  if (!oyun) notFound();

  const masa = await masaOturumu.aktif(o.ozneId);
  const kazandirir = !!masa && (masa.kanitMaskesi & K2) !== 0;
  const bonusMu = gununOyunu(isGunu()).id === oyun.id;

  return (
    <Sayfa>
      <Baslik ust={`${oyun.emoji} Oyun`}>{oyun.ad}</Baslik>

      <OyunKabugu
        oyunId={oyun.id}
        ad={oyun.ad}
        ozet={oyun.ozet}
        emoji={oyun.emoji}
        bolumSayisi={oyun.bolumSayisi}
        kazandirir={kazandirir}
        bonusMu={bonusMu}
        cafeAdi={masa?.cafeAdi ?? null}
        demoKapisi={kodEkrandaGosterilir()}
        hemenBasla={sp.basla === "1"}
      />
    </Sayfa>
  );
}
