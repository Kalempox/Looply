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
   */
  yon?: "ust" | "sag" | "sol";
}) {
  const balon = (
    <span
      className={`relative inline-block rounded-2xl bg-white px-3 py-2 text-[12px] leading-snug font-semibold text-yazi shadow-sm ${
        yon === "ust" ? "max-w-[7.5rem] text-center" : "max-w-[9.5rem]"
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
            : `absolute bottom-2 size-3 rotate-45 bg-white ${yon === "sag" ? "-right-1" : "-left-1"}`
        }
      />
    </span>
  );

  if (yon === "ust") {
    return (
      <span className="flex shrink-0 flex-col items-center gap-1.5">
        {balon}
        <span aria-hidden className="block">
          <Avatar ifade={ifade} boy={boy} />
        </span>
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
