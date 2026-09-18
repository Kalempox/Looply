import { Avatar, type AvatarIfadesi } from "./avatar";

/**
 * Loopy ve konuşma balonu — Ü174.
 *
 * ── Neden bir bileşen ───────────────────────────────────────
 *
 * Ürün sahibinin gönderdiği tasarımlarda aynı öge iki kartta birden
 * var: karşılama kartında *"Hedeflerini tamamla!"*, oyun kartında
 * *"Hadi oynayalım!"*. İkisi ayrı ayrı yazılsaydı balonun kuyruğu,
 * boyu ve avatarla arası iki yerde ayrı ayrı kayardı — bu projede
 * aynı hatanın adı var (Ü71: "yüzey tek yerden gelmezse her turda bir
 * ekran geride kalıyor").
 *
 * ── Kuyruk neden CSS üçgeni değil ───────────────────────────
 *
 * `border` numarasıyla yapılan üçgen, balonun köşe yuvarlaklığıyla
 * birleştiği yerde tırtıklı bir kenar bırakıyor. Döndürülmüş bir kare
 * balonla **aynı zemini** paylaşıyor ve birleşme yeri görünmüyor.
 *
 * ── Erişilebilirlik ─────────────────────────────────────────
 *
 * Balon gerçek metin: ekran okuyucu okuyor. Avatar `aria-hidden` —
 * o bir süs, bilgiyi balon taşıyor.
 */
export function LoopySozu({
  soz,
  ifade = "sakin",
  boy = 108,
  yon = "ust",
}: {
  soz: string;
  ifade?: AvatarIfadesi;
  /** Avatarın piksel boyu. */
  boy?: number;
  /**
   * Balonun avatara göre yeri.
   *
   * 🔴 `ust` dar ekranlar için ve varsayılan o. Yan yana dizilim
   * telefonda ölçüldü ve bozuldu: balon, kartın sol kolonundaki
   * altyazının üstüne biniyordu ve bir satır tamamen kayboluyordu.
   * Tasarımın kendisi ~470 piksel genişliğinde çizilmiş; 375'te aynı
   * yerleşim sığmıyor.
   *
   * 🔴 `alt` — Ü179. Balon altta, kuyruk yukarı bakıyor.
   *
   * Profil kartında zorunlu oldu: kartın sağ üst köşesinde `size-9`
   * kalem düğmesi var ve balon üstteyken tam onun üstüne biniyordu.
   * Karakterin **kafası** balondan dar (kare içinde %45–%67 arası),
   * yani üstte o duruncaya kalemle çakışmıyor.
   */
  yon?: "ust" | "alt" | "sag" | "sol";
}) {
  const balon = (
    <span
      className={`relative inline-block rounded-2xl bg-white px-3 py-2 text-[12px] leading-snug font-semibold text-yazi shadow-sm ${
        yon === "ust"
          ? "max-w-[7.5rem] text-center"
          : yon === "alt"
            ? // `alt` kolonun tamamını kullanabiliyor: altta çakışacak
              // bir şey yok, üstteki balon ise karakterin kafasına
              // göre dar durmalıydı.
              "max-w-[9rem] text-center"
            : "max-w-[9.5rem]"
      }`}
    >
      {soz}
      {/*
        Kuyruk: döndürülmüş kare. Balonla aynı zeminde olduğu için
        birleşme yeri görünmüyor; `border` üçgeni köşe yuvarlaklığında
        tırtıklanıyordu.
      */}
      <span
        aria-hidden
        className={
          // Kuyruk avatara doğru bakıyor.
          yon === "ust"
            ? "absolute -bottom-1 left-1/2 size-3 -translate-x-1/2 rotate-45 bg-white"
            : yon === "alt"
              ? "absolute -top-1 left-1/2 size-3 -translate-x-1/2 rotate-45 bg-white"
              : `absolute bottom-2 size-3 rotate-45 bg-white ${yon === "sag" ? "-right-1" : "-left-1"}`
        }
      />
    </span>
  );

  if (yon === "ust" || yon === "alt") {
    return (
      <span className="flex shrink-0 flex-col items-center gap-1.5">
        {yon === "ust" && balon}
        <span aria-hidden className="block">
          <Avatar ifade={ifade} boy={boy} />
        </span>
        {yon === "alt" && balon}
      </span>
    );
  }

  return (
    <span
      className={`flex shrink-0 items-end gap-1.5 ${
        yon === "sag" ? "flex-row-reverse" : ""
      }`}
    >
      <span aria-hidden className="block">
        <Avatar ifade={ifade} boy={boy} />
      </span>
      {balon}
    </span>
  );
}

/**
 * Balonsuz Loopy — Ü176.
 *
 * Ürün sahibi: *"hep Loopy karakterimiz sevgi dolu, heyecanlı gibi
 * pozitif olmalı"* ve oyun kartında *"sadece hadi oynayalım
 * yazmasın"*.
 *
 * ── 🔴 Neden karşı döndürme var ─────────────────────────────
 *
 * `mutlu` karesi kaynakta ~22° eğik çizilmiş: kollar havada, gövde
 * yana yatık — havada süzülen bir an. Kartta SABİT dururken o eğiklik
 * sevinç değil **devrilme** okunuyordu ve bu yüzden Ü174'te `sakin`e
 * düşülmüştü. Ama `sakin`in yüzü düz: ürün sahibinin istediği
 * pozitiflik orada yok.
 *
 * Karşı döndürme ikisini birden çözüyor: yüz `mutlu`nun yüzü, duruş
 * dik. Ölçülerek seçildi — 22°'de bardağın dikey ekseni sakin
 * karedekiyle çakışıyor.
 *
 * ⚠️ Kollar ve bacaklar eğik poza göre çizildiği için hafifçe asimetrik
 * kalıyor. Bedeli bu ve kabul edildi: dik duran neşeli bir karakter,
 * devrilmiş neşeli bir karakterden iyi.
 */
export function LoopyPozitif({ boy = 84 }: { boy?: number }) {
  return (
    <span
      aria-hidden
      className="inline-block"
      style={{ transform: "rotate(-22deg)", transformOrigin: "50% 60%" }}
    >
      <Avatar ifade="mutlu" boy={boy} />
    </span>
  );
}

/**
 * Elinde kupon tutan Loopy — Ü178, Ü179'da düzeltildi.
 *
 * Ürün sahibi iki kez istedi: *"elinde ödül tutan Loopy"* ve sonra
 * *"elinde kupon tutmalı ve daha büyük olmalı"*. Arada bir de
 * *"mutlu hâline yapmalıydın, burada çok üzgün duruyor"* dedi.
 *
 * ── 🔴 İkisini birden veren bir kare YOKTU ──────────────────
 *
 * Elde olan üç karenin üçü de birini dışlıyordu:
 *
 *   · `sakin`   — eller boş ✅ ama ağız DÜZ BİR ÇİZGİ 🔴
 *   · `mutlu`   — yüz gülüyor ✅ ama kollar havada yumruk 🔴
 *   · `keyifli` — yüz gülüyor ✅ ama eller dolu: kalp tutuyor 🔴
 *
 * `keyifli`nin kalbini kuponla örtmek denendi ve **ölçüm reddetti**:
 * kalbin kutusu dikeyde %53,3–81,1, ağız %46,9–48,0. Kalbi örten her
 * kart gülümsemeyi de örtüyor; kalbin ucunu açıkta bırakmak da çözüm
 * değil — altın kartın arkasından kırmızı bir çıkıntı, tasarım değil
 * hata gibi okunuyor.
 *
 * ── 🔴 İki çözüm denendi, ikincisi tuttu ───────────────────
 *
 * **Ü179:** `sakin`in ağzı gülümsemeye çevrildi (`neseli`) ve eline
 * vektör bir kupon çizildi. Ürün sahibi *"orada hiç olmadı"* dedi ve
 * haklıydı: 3B bir gövdeye yapıştırılmış düz bir kart, iki ayrı
 * malzeme olarak okunuyor — bu projede iki kez reddedilen şeyin ta
 * kendisi (*"avatar 3D gibi olmalı"*).
 *
 * **Ü181:** ürün sahibi doğru yolu söyledi — *"fal ai ile
 * karakterimizi referans vererek elinde kupon mutlu bir şekilde havaya
 * sıçrarken çizdirsek mi."* Görsel referanslı üretim (kontext) mevcut
 * kareyi alıp yalnızca pozu ve elindeki nesneyi değiştiriyor;
 * karakterin tasarımı, malzemesi ve ışığı korunuyor. Ödül artık
 * karakterle **aynı render'dan** geliyor, üstüne çizilmiyor.
 *
 * Üretim `scripts/avatar-kuponlu.py`.
 *
 * ⚠️ `neseli` karesi duruyor ama artık kullanılmıyor. Silinmedi:
 * "gülen yüz + boş eller" başka bir ekranda gerekebilir ve üretimi
 * script'te yazılı.
 */
export function LoopyOdullu({ boy = 120 }: { boy?: number }) {
  return <Avatar ifade="kuponlu" boy={boy} />;
}
