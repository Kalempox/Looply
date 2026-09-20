import Link from "next/link";
import { Beliren, Sirali } from "./vitrin-hareket";

/**
 * Sıkça sorulanlar — Ü200.
 *
 * ── Neden gerekli ───────────────────────────────────────────
 *
 * Ürün sahibinin gönderdiği örnekte bir SSS vardı ve sorularının hepsi
 * **satış engeli**: "POS entegrasyonu gerekir mi?", "satışımı otomatik
 * ölçer mi?". Cevaplanmayan her biri, sahada "bir düşüneyim" demek.
 *
 * ── 🔴 Cevaplar üründe olan şeyi söylüyor ───────────────────
 *
 * Vitrinin dürüstlük bölümü (*"burada müşteri yorumu görmeyeceksin"*)
 * bu sayfanın kuralını koydu: söylenen her şey doğrulanabilir olmalı.
 * SSS o kuralın en çok zorlandığı yer, çünkü cevap "evet" demek en
 * kolay yer. Burada üç cevap açıkça **hayır** diyor ya da sınırı
 * söylüyor:
 *
 *   · POS entegrasyonu yok — ve **olmaması** bir özellik olarak
 *     anlatılıyor, gizlenmiyor.
 *   · Satış ölçümü yok; ölçülen şey ziyaret ve kupon kullanımı.
 *   · Hatırlatma kanalı şu an kapalı (2026-09-20 kararı).
 *
 * "Evet" demek kolaydı; kasada karşılığı çıkmayan bir "evet" ilk
 * kafede anlaşılır.
 *
 * ── Neden `<details>` ───────────────────────────────────────
 *
 * Akordeon için JavaScript gerekmiyor: `<details>/<summary>` tarayıcının
 * kendi açılır bölümü, klavyeyle çalışıyor, ekran okuyucu durumunu
 * biliyor ve arama motoru içeriği kapalıyken de görüyor. Kendi
 * açılırımızı yazmak üç şeyi birden elle kurmak olurdu.
 */

type Soru = { s: string; c: React.ReactNode };

const SORULAR: Soru[] = [
  {
    s: "Kafeme cihaz ya da POS entegrasyonu gerekiyor mu?",
    c: (
      <>
        Hayır, ikisi de gerekmiyor. Kurulumun tamamı panelden yazdırdığın bir
        karekodu masaya koymak. Kupon kasada <strong>personelin telefonundan
        ya da panelden</strong> onaylanıyor; yazar kasana hiç dokunmuyoruz.
      </>
    ),
  },
  {
    s: "Müşteri uygulama indirmek zorunda mı?",
    c: (
      <>
        Hayır. Karekodu okutunca tarayıcıda açılıyor ve{" "}
        <strong>hesap açmadan</strong> oynamaya başlıyor. Hesap yalnızca
        kazandığı ödülü kullanacağı zaman gerekiyor — o ana kadar hiçbir bilgisi
        kaydedilmiyor.
      </>
    ),
  },
  {
    s: "Ne kadar indirim vereceğimi kim belirliyor?",
    c: (
      <>
        Sen. Hangi ödülün çıkacağını, ne sıklıkla çıkacağını ve günde kaç adet
        verileceğini panelden sen giriyorsun. <strong>Günlük indirim bütçeni
        aşan tek bir kupon bile üretilmiyor</strong> — sürpriz masraf olmuyor.
      </>
    ),
  },
  {
    s: "Satışımı otomatik ölçer mi?",
    c: (
      <>
        <strong>Hayır</strong> — ve bunu açıkça söylüyoruz. Looply ciroyu
        görmüyor, çünkü yazar kasana bağlanmıyor. Ölçtüğü şey şu: kaç kişi
        karekodu okuttu, kaçı oynadı, kaç kupon çıktı, kaçı{" "}
        <strong>kasada kullanıldı</strong> ve kaç kişi ikinci kez geldi. Ciro
        bağlantısını sen kurarsın; biz kapıdan gireni sayarız.
      </>
    ),
  },
  {
    s: "Kupon kullanılmazsa bana maliyeti olur mu?",
    c: (
      <>
        Olmaz. Kupon yalnızca kasada onaylandığında indirim demek. Dağıtılıp
        kullanılmayan kuponun maliyeti yok; süresi dolan kupon kendiliğinden
        kapanıyor.
      </>
    ),
  },
  {
    s: "Müşteriye mesaj gönderiyor musunuz?",
    c: (
      <>
        Şu an <strong>hayır</strong>. Hatırlatma altyapısı üründe hazır ama
        gönderim kanalı henüz açılmadı. Bugün müşteri ödülünü{" "}
        <Link href="/giris" className="underline">
          kendi ekranından
        </Link>{" "}
        görüyor. Kanal açıldığında burada yazacak — olmayan bir özelliği
        anlatmıyoruz.
      </>
    ),
  },
  {
    s: "Başarısı neyle ölçülür?",
    c: (
      <>
        Tek sayıyla: <strong>ikinci kez gelen müşteri</strong>. Oynayan kişi
        sayısı değil, kupon sayısı değil — kasada kullanılan kupon ve onu
        kullanmak için kapıdan tekrar giren kişi. Paneldeki raporun sorduğu soru
        bu.
      </>
    ),
  },
];

export function VitrinSSS() {
  return (
    <section className="mx-auto w-full max-w-3xl px-5 py-20 sm:py-28">
      <Beliren yon="olcek">
        <p className="etiket-caps text-yazi-sonuk">Sıkça sorulanlar</p>
        <h2 className="mt-4 font-display text-[clamp(28px,4.4vw,44px)] leading-[1.05] font-extrabold tracking-[-0.03em]">
          Aklındaki soruyu
          <br />
          <span className="text-vurgu">şimdi</span> cevaplayalım.
        </h2>
      </Beliren>

      <Sirali adim={70} className="mt-10 grid gap-2.5">
        {SORULAR.map((q) => (
          <details
            key={q.s}
            className="group rounded-2xl border border-cizgi bg-yuzey px-5 open:bg-cukur"
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4.5 text-[16px] leading-snug font-semibold [&::-webkit-details-marker]:hidden">
              {q.s}
              {/* ⚠️ İşaret `+` ve açıkken dönüyor. Ok yerine artı:
                  kapalı hâlde "burada devamı var" diyen en okunur
                  işaret ve dönerken çarpıya dönüşmesi kapatmayı da
                  anlatıyor. */}
              <span
                aria-hidden
                className="shrink-0 font-data text-[20px] leading-none text-vurgu transition-transform duration-200 group-open:rotate-45"
              >
                +
              </span>
            </summary>
            <p className="pb-5 text-[15px] leading-relaxed text-yazi-sonuk">
              {q.c}
            </p>
          </details>
        ))}
      </Sirali>
    </section>
  );
}
