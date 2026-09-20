import { Beliren, Sirali } from "./vitrin-hareket";

/**
 * Vitrinin anlatmadığı iki katman — Ü200.
 *
 * Ürün sahibinin gönderdiği örnekte iki bölüm vardı ve ikisi de bizde
 * **üründe çalışıyor ama sayfada hiç geçmiyordu**: gecikmeli açılan
 * ödül ve ek satış. Yazılmamış özellik, olmayan özellikle aynı kapıya
 * çıkıyor.
 */

/**
 * Gizli açılış — Ü97'nin vitrin karşılığı.
 *
 * ── 🔴 Örnekten AYRILAN yer ─────────────────────────────────
 *
 * Örnek sayfa *"ödül tutarını açılma zamanına kadar gizli tutar"*
 * diyordu. Bizde öyle çalışmıyor ve öyle yazmak yalan olurdu:
 *
 *   · Oyuncu **ne kazandığını baştan görüyor** ("Ücretsiz filtre kahve").
 *   · TL tutarını zaten hiç görmüyor — E9 bunu yasaklıyor, gizlemek
 *     bir özellik değil kuralın kendisi.
 *   · Saklanan şey **saat**: kuponun ne zaman açılacağı.
 *
 * Ürün sahibinin Ü97'deki tarifi buydu: *"ödülü tabii ki bilecek,
 * zamanı bilmeyecek."* Ve bu, örnektekinden daha iyi bir tasarım —
 * ödülü saklamak hayal kırıklığı riski taşıyor, zamanı saklamak
 * merak üretiyor.
 */
export function VitrinGizliAcilis() {
  return (
    <section className="bg-vitrin-lacivert py-20 text-yuzey sm:py-28">
      <div className="mx-auto w-full max-w-6xl px-5">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <Beliren yon="olcek">
            <p className="etiket-caps text-white/45">Gecikmeli açılış</p>
            <h2 className="mt-4 font-display text-[clamp(28px,4.4vw,46px)] leading-[1.04] font-extrabold tracking-[-0.03em]">
              Ödülünü kazandı.
              <br />
              <span className="text-vitrin-altin">Ne zaman</span> açılacağını
              bilmiyor.
            </h2>
            <p className="mt-6 max-w-lg text-[16px] leading-relaxed text-white/65">
              Kazandığı ödülü görüyor. Kullanabileceği anı görmüyor. Aradaki
              boşluk, kafeni bir kez daha aklına getiren şey.
            </p>

            <ul className="mt-8 grid gap-4">
              <Katman
                baslik="Merak, hatırlatmadan güçlü"
                metin="Telefonunda açılmayı bekleyen bir ödül var. Kafeni hatırlatan şey bir bildirim değil, kendi merakı."
              />
              <Katman
                baslik="Saat söylenmiyor, mizah söyleniyor"
                metin="“Gezegenler kararını verdi” gibi cümleler bekleme ekranında duruyor. Süslemedir; kuponu açan kural sunucudadır ve değişmez."
              />
              <Katman
                baslik="Açılınca net"
                metin="Ödülün adı en baştan belli. Açıldığında kasada gösterilecek hâle geliyor, belirsizlik bitiyor."
              />
            </ul>
          </Beliren>

          <Beliren yon="yakin">
            {/*
              ⚠️ Bu kutu gerçek bekleme ekranının **sadeleştirilmiş**
              hâli, ekran görüntüsü değil. Vitrinin kuralı gereği
              (dürüstlük bölümü) uydurma bir arayüz göstermiyoruz;
              gösterilen cümle `bekleme-metni.ts` havuzundan gerçek bir
              satır.
            */}
            <div className="mx-auto max-w-sm rounded-3xl border border-white/12 bg-white/[0.04] p-8 text-center backdrop-blur-sm">
              <span
                aria-hidden
                className="mx-auto flex size-16 items-center justify-center rounded-full bg-vitrin-altin/15 font-display text-[28px] font-extrabold text-vitrin-altin"
              >
                ?
              </span>
              <p className="mt-5 etiket-caps text-[10px] text-vitrin-altin">
                Kazandığın ödül
              </p>
              <p className="mt-2 font-display text-[22px] leading-tight font-bold">
                Ücretsiz filtre kahve
              </p>
              <p className="mt-5 rounded-xl bg-white/[0.06] px-4 py-3 text-[14px] leading-relaxed text-white/70">
                Gezegenler kararını verdi, sıra sende değil henüz.
              </p>
              <p className="mt-4 font-data text-[11px] text-white/35">
                açılınca kasada gösterebilirsin
              </p>
            </div>
          </Beliren>
        </div>
      </div>
    </section>
  );
}

function Katman({ baslik, metin }: { baslik: string; metin: string }) {
  return (
    <li className="border-l-2 border-vitrin-altin/40 pl-5">
      <p className="font-display text-[17px] leading-tight font-bold">{baslik}</p>
      <p className="mt-1.5 text-[14px] leading-relaxed text-white/60">{metin}</p>
    </li>
  );
}

/**
 * Ek satış — kafenin ürünü müşterinin ekranında.
 *
 * ⚠️ Anlatılan her şey üründe VAR: ödül kataloğunu kafe kuruyor
 * (panelden ürün ve kategori), `/firsatlar` o katalogla kafenin ürün
 * indirimlerini gösteriyor, Happy Hour penceresi ayrı bir kart.
 * Vitrin bunları tek satırda bile geçmiyordu.
 *
 * ⚠️ "Otomatik satış artışı" DENMİYOR. Looply kasaya bağlanmıyor ve
 * ciroyu görmüyor; söylenebilecek doğru şey ürünün müşterinin ekranına
 * **girmesi**, satmasının garanti edilmesi değil (aynı sınır SSS'te de
 * açıkça yazılı).
 */
export function VitrinEkSatis() {
  return (
    <section className="mx-auto w-full max-w-6xl px-5 py-20 sm:py-28">
      <Beliren yon="olcek">
        <p className="etiket-caps text-yazi-sonuk">Ek satış</p>
        <h2 className="mt-4 max-w-3xl font-display text-[clamp(30px,5vw,54px)] leading-[1.02] font-extrabold tracking-[-0.03em]">
          Müşteri sadece kahve
          <br />
          içip <span className="text-vurgu">çıkmasın</span>.
        </h2>
        <p className="mt-6 max-w-xl text-[16px] leading-relaxed text-yazi-sonuk">
          Ödül kataloğunu sen kuruyorsun. Yani öne çıkarmak istediğin ürün,
          müşterinin oyun sonunda baktığı ekranda duruyor — menüde değil,
          elinde.
        </p>
      </Beliren>

      <Sirali adim={110} cocukSinifi="h-full" className="mt-12 grid gap-4 sm:grid-cols-3">
        <Urun
          ust="Ödül olarak"
          baslik="Yanına tatlı"
          metin="Kataloğa cheesecake koy. Çarktan o çıktığında müşteri kahvenin yanına bir şey daha alıyor."
        />
        <Urun
          ust="Fırsat olarak"
          baslik="Yeni ürün denensin"
          metin="Yeni içeceğini fırsat listesine ekle. Oyun bitince açılan ekranda görünüyor."
        />
        <Urun
          ust="Saatine göre"
          baslik="Boş saati doldur"
          metin="Happy Hour penceresini sen açıyorsun. Kafenin boş kaldığı saatte ödül daha cömert."
        />
      </Sirali>

      <Beliren yon="yakin">
        <p className="mt-8 max-w-2xl text-[14px] leading-relaxed text-yazi-sonuk">
          <strong className="text-yazi">Sınırı da söyleyelim:</strong> Looply
          yazar kasana bağlanmıyor, bu yüzden &quot;şu kadar ek satış yaptı&quot;
          diyemez. Yaptığı şey ürünü müşterinin ekranına koymak ve kupon kasada
          kullanıldığında bunu saymak.
        </p>
      </Beliren>
    </section>
  );
}

function Urun({ ust, baslik, metin }: { ust: string; baslik: string; metin: string }) {
  return (
    <div className="h-full rounded-2xl border border-cizgi p-7">
      <p className="etiket-caps text-[10px] text-vurgu">{ust}</p>
      <h3 className="mt-2.5 font-display text-[19px] leading-tight font-bold tracking-tight">
        {baslik}
      </h3>
      <p className="mt-2.5 text-[14px] leading-relaxed text-yazi-sonuk">{metin}</p>
    </div>
  );
}
