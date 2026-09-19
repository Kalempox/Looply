import Link from "next/link";
import { RENK, type OyuncuRengi } from "./oyuncu-renk";
import { DESEN } from "./oyuncu-sahne";
import { KartResmi, KUPON_GORSELI } from "./kart-gorseli";
import { type KuponGorseli } from "./oyuncu-gorsel";

/**
 * Kupon bileti — Ü72.
 *
 * ── Nasıl buraya gelindi ────────────────────────────────────
 *
 * Ü69-71 arasında bilet dört stil denemesinden geçti ve açık zeminli
 * ışın stilinde karar kılınmıştı. Ürün sahibi bir tur sonra kendi
 * tasarımını gösterdi ve karar değişti: **koyu doygun zemin, kartın
 * tamamına döşenmiş desen, sağ kenardan taşan büyük çizim.**
 *
 * Öncekinden farkı zenginlik. Açık zeminli kart doğruydu ama boştu:
 * bir renk, bir kontur çizim, bir çizgi. Şimdi üç katman var — zemin,
 * desen, sahne — ve kart bakılacak bir şeye dönüşüyor.
 *
 * ── Üç kategori, üç sahne (ürün sahibinin kuralı) ───────────
 *
 * *"Filtre kahve de çay da sıcak içecek; ikisinde de kenardaki görsel
 * aynı olmalı, yoksa her kafede farklı sıcak içecekler olduğundan
 * buraya sürekli görsel üretmek zorunda kalırız."*
 *
 * Kural bakım maliyetini sıfırlıyor: kafe menüsüne ne eklerse eklesin
 * `gorselSec()` onu sıcak içecek / tatlı / para üçlüsünden birine
 * düşürüyor ve yeni çizim gerekmiyor.
 *
 * ── Parlama da gitti (Ü73) ──────────────────────────────────
 *
 * Soldan sağa geçen ışık süpürmesi (`parilti`) kaldırıldı: *"parlama
 * efektini geçiyor ya soldan sağa, kaldır onu."* Desen zaten yüzeyi
 * dolduruyor ve hareketli bir parlama onun üstünde ikinci bir katman
 * oluyordu. Sınıf duruyor — başka bir yerde gerekirse hazır.
 *
 * ── Işın gitti ──────────────────────────────────────────────
 *
 * Ü70'te ışın dokusu "kartların ana ekrandaki durum kartıyla
 * akrabalığını kuran tek detay" diye korunmuştu. Desen o işi daha iyi
 * yapıyor ve ikisi birlikte gürültü oluyordu; ışın bilette bırakıldı.
 * Diğer kartlar (fırsat, oyun, başlık) hâlâ ışın dokusunda — orada
 * anlatacak bir desen yok.
 *
 * ── Değişmeyen ──────────────────────────────────────────────
 *
 * TL değeri yok (E9), geçerlilik damgası yok. Bilet ne kadar "değerli"
 * görünürse görünsün kasada okutulmadan hiçbir şey ifade etmiyor.
 */

export type BiletVerisi = {
  href: string;
  kafe: string;
  baslik: string;
  gorsel: KuponGorseli;
  renk: OyuncuRengi;
  /** "8 Eyl" — biletin son kullanım günü (bekleyende açılış günü). */
  son: string;
  /**
   * Tarihin başındaki kelime — varsayılan "son".
   *
   * Bekleyen kuponda anlamlı tarih **açılış**, son kullanım değil;
   * "son 18 Eyl" yazmak orada yanlış olurdu. Varsayılanı olan bir
   * alan, çağıranların çoğunu rahat bırakıp istisnayı mümkün kılıyor.
   */
  tarihOneki?: string;
  /**
   * Sönük bilet — şu an kasada gösterilemeyen kupon (Ü171–Ü172).
   *
   * Üç hâli var: **kullanıldı**, **süresi geçti**, **birazdan
   * açılıyor**. Üçü de "şimdi kullanamazsın" diyor, o yüzden aynı
   * yüzeyi paylaşıyorlar; ilk ikisi geçmiş, üçüncüsü gelecek —
   * farkı `baglanti` taşıyor.
   *
   * ── Neden bilet oldu ────────────────────────────────────────
   *
   * Geçmiş sekmesindeki kuponlar `SakinKart` diye ayrı bir bileşendi:
   * düz beyaz satır, sol kenarında bir şerit. Gerekçesi yazılıydı ve
   * mantıklıydı — *"kasada gösterilemeyecek bir şeyin bilet gibi
   * durması, oyuncuyu kasaya boşuna gönderir."*
   *
   * Ürün sahibi ekrana bakıp *"ödüllerim kısmındakiler daha güzel, ona
   * göre uyumlu yapmalıyız"* dedi ve haklı: aynı ekranda iki ayrı kart
   * dili konuşuluyordu. Kaygı yine de gerçek, o yüzden bilet **aynı
   * biçimi taşıyor ama aynı şeyi söylemiyor**: "Kasada göster →"
   * yerine "Kullanıldı" / "Tüh, süresi geçti" yazıyor ve tıklanmıyor.
   *
   * ── 🔴 SÖNÜK demek SAYDAM demek DEĞİL ───────────────────────
   *
   * Ü162'de kullanılmış kuponlardan `opacity` **kaldırılmıştı**:
   * karartma "bu kupon bozuk" gibi okunuyordu, oysa kullanılmış kupon
   * bir **başarı** — oyuncu kasaya gitti ve indirimini aldı. Aynı
   * hatayı sönükleştirirken tekrarlamamak için burada saydamlık değil
   * **doygunluk** düşüyor (`saturate`). Kart tam opak kalıyor, beyaz
   * metin keskin duruyor; değişen tek şey rengin bağırması.
   */
  sonuk?: {
    /** Kesikli çizginin altında yazan şey — eylem değil durum. */
    etiket: string;
    /**
     * Sönük ama TIKLANABİLİR — Ü172.
     *
     * Geçmiş bilet tıklanmıyor: kullanılmış kuponun detay sayfasında
     * yapacak bir şey yok. Bekleyen kupon ise **gelecek**: oyuncu
     * detayına bakıp ne zaman açılacağını görebilmeli. İkisi aynı
     * yüzeyi paylaşıyor ama aynı sözü vermiyor.
     */
    baglanti?: boolean;
  };
};

export function Bilet({ veri }: { veri: BiletVerisi }) {
  const r = RENK[veri.renk];
  const sonuk = veri.sonuk;

  const govde = (
    <>
      {/* Desen kartın tamamına döşeniyor. */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{ backgroundImage: DESEN[veri.gorsel], backgroundRepeat: "repeat" }}
      />

      {/*
        Sahne sağ kenardan taşıyor ve kırpılıyor.

        Tam sığdırılsaydı "kartın içine bir resim koyduk" gibi
        okunurdu; taşan çizim kartı bir nesne hâline getiriyor.
      */}
      <span
        aria-hidden
        className="pointer-events-none absolute top-1/2 -right-6 -translate-y-1/2"
      >
        {/*
          🔴 Ü189: elle çizilen sahnenin yerine ÜRETİLMİŞ illüstrasyon.

          Ürün sahibi referans gönderdi: *"ödül kartlarında Loopy ödül
          türüne göre kahve içiyor, tatlı yiyor, paralı indirimlerde
          ödül açıyor."* Yani kartta duran şey artık ödülün çizimi
          değil, ödülü YAŞAYAN karakter.

          ⚠️ Beş kupon türü, üç görsel — eşleme `KUPON_GORSELI`de ve
          gerekçesi orada yazılı.
        */}
        <KartResmi ad={KUPON_GORSELI[veri.gorsel] ?? "hediye"} boy={150} />
      </span>

      {/*
        Sahnenin metne değdiği yerde zemin koyulaşıyor.

        Çizim kartın rengine yakın tonlarda ve metnin sağ ucu onun
        üstüne düşüyordu. Soldan sağa açılan bu perde metni tamamen
        okunur bırakıyor, çizimi ise kapatmıyor.
      */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0"
        /* ⚠️ Perde Ü189'da GENİŞLEDİ: üretilmiş illüstrasyon eskisinden
           büyük (150 vs 122) ve daha parlak; eski perde metnin sağ
           ucunu açıkta bırakıyordu. */
        style={{
          background: `linear-gradient(100deg, ${r.koyu} 30%, ${r.koyu}dd 50%, transparent 72%)`,
        }}
      />

      {/*
        Buz kırağısı — yalnızca soğuk içecekte (Ü74).

        Kenarlardan içeri doğru beyazlayan bir halka. Ürün sahibinin
        istediği "soğuk efekti" bu: kart camdan bakılıyormuş gibi
        duruyor. Perdeden **sonra** çiziliyor, yoksa perde kırağıyı
        sol yarıda tamamen yutuyor.
      */}
      {veri.gorsel === "soguk" && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(115% 130% at 50% 50%, transparent 46%, rgba(255,255,255,0.30) 100%)",
          }}
        />
      )}

      {/* Toka: biletin takıldığı yer. Kartı çantaya asılan bir etikete
          çeviriyor — koçandan farklı olarak bir yön de veriyor. */}
      <span aria-hidden className="absolute top-1/2 left-2.5 -translate-y-1/2">
        <Toka renk={r.canli} />
      </span>

      {/*
        🔴 Geçmiş biletin ÜSTÜ KARARIYOR — Ü171.

        Ürün sahibi: *"üstleri kararmış olsun."*

        ⚠️ Bu, Ü162'de kaldırdığımız karartmanın aynısı değil ve
        karıştırmamak önemli. Orada kaldırılan `opacity` idi: kartın
        **tamamı** saydamlaşıyordu, metin dâhil, ve sonuç "bu kupon
        bozuk" gibi okunuyordu. Burada konan şey bir **perde** —
        kart tam opak, metin tam beyaz, kararan yalnızca yüzey.
        O yüzden perde metin kolonunun ALTINDA duruyor.

        Bağlam da değişti: Ü162'de bunlar soluk beyaz satırlardı ve
        karartma onları bozuk gösteriyordu. Şimdi canlı koyu bir
        bilet ve perde "olmuş bitmiş" diyor.
      */}
      {sonuk && (
        <span aria-hidden className="pointer-events-none absolute inset-0 bg-black/45" />
      )}

      {/*
        Metin kolonu sağdan **96 piksel** dar.

        İlk denemede tam genişlikteydi ve "son 8 Eyl" tarihi çizimin
        altında kalıyordu; perde metni okunur tutuyor ama üstüne binen
        bir çizim perdeyle çözülmüyor. Kesikli çizginin de çizimden
        önce bitmesi ürün sahibinin tasarımındaki hâli.
      */}
      <div className="relative flex h-full flex-col justify-center pr-24 pl-12">
        {/*
          Tarih **üst satırda**, kafe adının yanında.

          Alt satırda `justify-between` ile sağa yaslıydı ve çizimin
          altında kalıyordu; metin kolonunu daraltmak da yetmedi çünkü
          fincanın kulpu sola doğru uzuyor. Üst satırda hem yer var hem
          de alt satır ürün sahibinin tasarımındaki gibi tek bir eyleme
          kalıyor.
        */}
        <span className="block etiket-caps text-white/55">
          {veri.kafe}{" "}
          <span className="text-white/35">
            · {veri.tarihOneki ?? "son"} {veri.son}
          </span>
        </span>
        <span className="mt-1 block font-display text-xl leading-tight font-bold text-white">
          {veri.baslik}
        </span>

        {/*
          Kesikli çizgi: biletin koparma yeri.

          Altındaki satır biletin ne olduğunu söylüyor ve geçmişte
          **eylem değil durum**: ok işareti de kalkıyor, çünkü ok bir
          yere gitmeyi vaat ediyor.
        */}
        <span className="mt-2.5 block border-t border-dashed border-white/30 pt-2">
          <span className="etiket-caps" style={{ color: sonuk ? "rgba(255,255,255,0.72)" : r.canli }}>
            {sonuk ? sonuk.etiket : "Kasada göster →"}
          </span>
        </span>
      </div>
    </>
  );

  const zemin = {
    // Koyu ve doygun: `koyu` tondan `ana` tona. Beyaz metin bu iki
    // durağın hepsinde AA geçiyor; pastel zeminde geçmiyordu ve
    // metni koyu yapmak gerekiyordu.
    background: `linear-gradient(115deg, ${r.koyu} 0%, ${r.ana} 100%)`,
  };

  const ortak = "kart-golge relative block h-[124px] overflow-hidden rounded-2xl";

  if (sonuk) {
    const stil = {
      ...zemin,
          /*
            Karartan şey perde (yukarıda, `bg-black/45`); buradaki
            doygunluk düşüşü onun yanında ikinci bir işaret.

            İkisi birlikte gerekiyor: yalnızca karartma, kartı gece
            çekilmiş bir fotoğraf gibi bırakıyordu — renk hâlâ
            bağırıyordu. Yalnızca doygunluk düşüşü ise ürün sahibinin
            istediği "kararmış" hâli vermiyordu.

            ⚠️ `filter` metni de etkiliyor ama beyaz metin doygunluğu
            zaten sıfır, yani ondan etkilenmiyor.
          */
      filter: "saturate(0.55)",
    };

    return sonuk.baglanti ? (
      <Link href={veri.href} className={`${ortak} transition-transform active:scale-[0.99]`} style={stil}>
        {govde}
      </Link>
    ) : (
      <div className={ortak} style={stil}>
        {govde}
      </div>
    );
  }

  return (
    <Link
      href={veri.href}
      className={`${ortak} kart-gel transition-transform active:scale-[0.99]`}
      style={zemin}
    >
      {govde}
    </Link>
  );
}

/**
 * Sol kenardaki toka.
 *
 * Zımba çentiğinin yerini aldı. Çentik biletin **koparıldığını**
 * söylüyordu; oysa bu kupon koparılmıyor, kasada okutuluyor. Toka
 * "taşınan bir etiket" diyor ve kartın soluna doğal bir başlangıç
 * veriyor.
 */
function Toka({ renk }: { renk: string }) {
  return (
    <svg width="22" height="42" viewBox="0 0 22 42" fill="none" aria-hidden>
      <path
        d="M11 8v10"
        stroke={renk}
        strokeWidth="4"
        strokeLinecap="round"
      />
      <circle cx="11" cy="6" r="5" stroke={renk} strokeWidth="3.4" fill="none" />
      <rect x="3" y="17" width="16" height="20" rx="6" stroke={renk} strokeWidth="3.4" fill="none" />
      <circle cx="11" cy="27" r="3" fill={renk} />
    </svg>
  );
}
