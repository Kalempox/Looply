import { notFound, redirect } from "next/navigation";
import * as oturum from "@/domain/session";
import * as masaOturumu from "@/domain/masa";
import * as oyunSecimi from "@/domain/oyun-secimi";
import { K2 } from "@/domain/masa";
import { oyunBul } from "@/oyunlar";
import { kodEkrandaGosterilir } from "@/sms";
import { KUPON_ESIGI } from "@/domain/puan";
import { OyuncuSayfa } from "@/components/oyuncu";
import * as avatar from "@/domain/avatar";
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
 * söyleniyor. Oyuncunun bir tur oynayıp "puan nerede?" diye sorması,
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
  const bonusMu = (await oyunSecimi.gununOyunuKafede(masa?.cafeId ?? null)).id === oyun.id;
  // Ü148: rozet kutlamasında oyuncunun KENDİ avatarı tebrik ediyor.
  const avatarSecimi = await avatar.oku(o.ozneId);

  /*
    Geri düğmesi katalogda (Ü67).

    Ürün sahibi: *"oyunlarda geri çıkma butonu da yok."* Doğru: oyun
    ekranı oynarken ekranın tamamını kaplıyor ve tek çıkış yolu
    sayfanın en altındaki bir bağlantıydı — oyun alanının altında,
    görünmüyor.

    Hedef `/oyunlar`: oyuncu buraya çoğunlukla katalogdan geliyor ve
    "geri" onu geldiği yere döndürmeli. Ana ekrandan tek dokunuşla
    gelenler için de katalog bir adım ötede, çıkmaz sokak yok.
  */
  return (
    <OyuncuSayfa aktif="/oyna" geri={{ href: "/oyunlar", etiket: "Oyunlar" }} yuva={false}>
      {/* Başlık kabuğun içinde: üç durumun üçü de oyunun adını farklı
          yerde söylüyor (kartın tepesinde, oynarken şeritte, sonuçta
          sonuç kartında). Sayfanın da ayrıca söylemesi, oyun adını
          ekranda iki kez yazıyordu. */}
      <OyunKabugu
        oyunId={oyun.id}
        ad={oyun.ad}
        ozet={oyun.ozet}
        emoji={oyun.emoji}
        kuponEsigi={KUPON_ESIGI}
        kazandirir={kazandirir}
        bonusMu={bonusMu}
        cafeAdi={masa?.cafeAdi ?? null}
        avatarRenk={avatarSecimi.renk}
        avatarAksesuar={avatarSecimi.aksesuar}
        demoKapisi={kodEkrandaGosterilir()}
        hemenBasla={sp.basla === "1"}
      />
    </OyuncuSayfa>
  );
}
