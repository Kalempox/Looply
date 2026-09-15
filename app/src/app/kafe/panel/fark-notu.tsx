import Link from "next/link";

/**
 * "Bu sayfa hangisi" notu — ödül mü, kampanya mı (Ü138).
 *
 * ── Neden sekme değil de not ────────────────────────────────
 *
 * Bu ikisi bir süre **tek başlık altında iki sekmeydi** ("Ödüller ve
 * kampanyalar"). Birleştirme, kafe sahibinin sorusu — *"müşteriye ne
 * veriyorum"* — tek yerde cevaplansın diye yapılmıştı. Ters etki yarattı:
 * aynı başlık, aynı alt yazı ve iki sekme, ikisinin **aynı şeyin iki
 * görünümü** olduğu izlenimini veriyordu. Oysa ayrı tablolar, ayrı
 * mekanizmalar (Ü26).
 *
 * Şimdi ikisi sol menüde ayrı duraklar. Sekmenin yerinde bu not var:
 * sayfa kendini bir cümleyle tanıtıyor ve öbürüne yol gösteriyor.
 *
 * ── Metin neden mekanizmayı yazıyor ─────────────────────────
 *
 * Karışmanın tam yeri şurası: **ikisi de yüzde indirim olabiliyor.**
 * Katalogdaki "%20 · Latte" bir ödül, kampanyadaki "%20 · Latte" bir
 * kampanya. Ayrım görünüşte değil mekanizmada, o yüzden not tanım değil
 * **mekanizma** yazıyor.
 *
 * ⚠️ **Ayrım "puan" DEĞİL.** Ü52 puanla satın almayı kaldırdı; puan artık
 * yalnızca sıralama ve seviye için birikiyor, hiçbir şey satın almıyor.
 * Ü52 öncesinden kalma yorumlar ödülü *"oyuncunun puanıyla aldığı şey"*
 * diye tanımlıyor ve bu metin buraya bir kez öyle yazıldı — yanlıştı.
 *
 * Bugünkü gerçek ayrım **kazanmak**:
 *
 *   **Ödül**     oyun sonunda ya da çarkta **kazanılıyor**. Çıkıp
 *                çıkmaması şansa ve kafenin çark ağırlıklarına bağlı.
 *   **Kampanya** kazanmak gerekmiyor, **oynamak yetiyor**. Kafenin
 *                belirli bir ürünü itmesi; oyunu bitiremeyen müşteriye de
 *                düşüyor.
 *
 * ⚠️ Kampanya metni *"oyun oynamayı gerektirmiyor"* DEMİYOR. Kaldırılan
 * sekme bileşeninin açıklaması bunu diyordu ve yanlıştı: kampanya kuponu
 * oyun bitişinde düşüyor (`domain/oyun.ts`, `kampanyaKuponuVer`). Doğrusu
 * — **oynamak şart, kazanmak değil.** Oyunu bitirememiş müşteriye latte
 * indirimi vermemek için sebep yok; kafenin istediği o lattenin satılması.
 */

const METIN = {
  odul: {
    baslik: "Ödül nedir",
    govde: (
      <>
        Oyuncunun <Vurgu>oyun sonunda ve şans çarkında kazandığı</Vurgu> şey.
        Kişiye özel, tek kullanımlık kupon çıkarır. Ürün, yüzde ya da tutar
        olabilir. Puanla satın alınmaz — puan yalnızca sıralama ve seviye için
        birikiyor.
      </>
    ),
    oburuSoru: "Bir ürünü öne çıkarmak mı istiyorsun?",
    oburuEtiket: "Kampanyalar",
    oburuYol: "/kafe/panel/kampanyalar",
    renk: "border-odul/40 bg-odul-zemin/50",
  },
  kampanya: {
    baslik: "Kampanya nedir",
    govde: (
      <>
        <Vurgu>Senin</Vurgu> öne çıkarmak istediğin bir ürüne bağlı yüzde
        indirimi. <Vurgu>Puan istemez</Vurgu> ve oyun sonunda kendiliğinden
        düşer — oyuncunun kazanması gerekmez, oynaması yeter.
      </>
    ),
    oburuSoru: "Oyuncunun kazandığı ödülleri mi arıyorsun?",
    oburuEtiket: "Ödüller",
    oburuYol: "/kafe/panel/oduller",
    renk: "border-kampanya/30 bg-kampanya-zemin/60",
  },
} as const;

function Vurgu({ children }: { children: React.ReactNode }) {
  return <strong className="font-semibold text-yazi">{children}</strong>;
}

export function FarkNotu({ taraf }: { taraf: "odul" | "kampanya" }) {
  const m = METIN[taraf];

  return (
    <div className={`mb-8 rounded-xl border px-4 py-3.5 ${m.renk}`}>
      <div className="etiket-caps text-[10px] text-yazi">{m.baslik}</div>
      <p className="mt-1.5 text-[14px] leading-relaxed text-yazi-sonuk">{m.govde}</p>
      <p className="mt-2.5 text-[13px] text-yazi-sonuk">
        {m.oburuSoru}{" "}
        <Link
          href={m.oburuYol}
          // `whitespace-nowrap`: telefonda satır tam okun önünde kırılıyor ve
          // "→" tek başına alt satırda kalıyordu.
          className="font-semibold whitespace-nowrap text-vurgu underline underline-offset-2 hover:no-underline"
        >
          {m.oburuEtiket} →
        </Link>
      </p>
    </div>
  );
}
