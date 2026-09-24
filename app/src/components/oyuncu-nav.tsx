import Link from "next/link";
import { SeritGizleyici } from "./serit-gizleyici";

/**
 * Oyuncu tarafının alt gezinme şeridi.
 *
 * Üç durak: oynanan yer, kazanılan şey, biriken şey. Dördüncüsü olmamalı —
 * oyuncunun kafede telefonuna bakarken vereceği karar sayısı sınırlı.
 * "Verilerim" bilinçli olarak burada değil; o bir hak ekranı, gündelik
 * gezinme değil (ana ekranın altındaki bağlantıdan açılıyor).
 *
 * ── İkonlar neden elle çizili (Ü31) ─────────────────────────
 *
 * Tasarım dili Material Symbols Outlined diyor ama o aile yalnızca
 * `fonts.googleapis.com` üstünden geliyor; `next/font/google` tanımıyor.
 * CDN'den çekmek oyuncunun hangi sayfayı ne zaman açtığını üçüncü tarafa
 * sızdırırdı — metin fontlarını derlemede indirip kendimizden servis etme
 * sebebimizin aynısı. Bu yüzden üç ikon aynı dilde (24px kutu, 1.6
 * kalınlık, dolgusuz kontur) elle çizildi.
 */

const DURAKLAR = [
  { href: "/oyna", etiket: "Oyna", ikon: Kumanda },
  { href: "/oduller", etiket: "Ödüllerim", ikon: Bilet },
  { href: "/profil", etiket: "Profilim", ikon: Kisi },
] as const;

/**
 * Alt şeritte yanabilecek duraklar.
 *
 * Şeridin götürmediği ekranlar (fırsatlar, sıralama, oyun, kupon
 * detayı) da bir durağı yakıyor — hangi sekmenin altındaysalar onu.
 * Hiçbiri yanmasaydı oyuncu "şeridin dışına çıktım" hissine kapılır,
 * oysa hâlâ aynı bölümün içinde.
 */
export type Durak = (typeof DURAKLAR)[number]["href"];

export function OyuncuNav({ aktif }: { aktif: Durak }) {
  /*
    Ü274: şerit İNCELDİ. Ürün sahibi: "üstteki kafe şeridi ve alttaki
    Oyna/Ödüllerim/Profilim çok fazla alan kaplıyor, neredeyse ekranın
    yarısı onlara gidiyor." Telefonda Safari'nin kendi çubukları da
    ekrandan yiyor; bizim payımız küçük olmalı. `py-3` → `py-1.5`, etiket
    10 px. Alt dolgu iPhone'un ev çizgisine göre (`safe-area`) büyüyor —
    ana ekrana eklenmiş tam ekran modda çizgi şeridin üstüne binmesin.
  */
  return (
    /* 🔴 Ü275: arkası bulanık cam DEĞİL, düz renk — kaydırırken iPhone
       Safari bulanıklığı her karede yeniden hesaplıyordu (sayfa
       takılıyordu). Aşağı kaydırınca çekiliyor, yukarı kaydırınca geri
       geliyor (`SeritGizleyici`, `.serit-alt`). */
    <nav className="serit-alt fixed inset-x-0 bottom-0 z-20 border-t border-cizgi bg-cukur pb-[env(safe-area-inset-bottom)]">
      <SeritGizleyici />
      <ul className="mx-auto flex w-full max-w-md">
        {DURAKLAR.map((d) => {
          const secili = d.href === aktif;
          const Ikon = d.ikon;
          return (
            <li key={d.href} className="flex-1">
              <Link
                href={d.href}
                aria-current={secili ? "page" : undefined}
                className={`flex flex-col items-center gap-0.5 py-1.5 transition-colors ${
                  secili ? "text-vurgu" : "text-yazi-sonuk hover:text-yazi"
                }`}
              >
                <Ikon />
                <span className="etiket-caps text-[10px]">{d.etiket}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** Alt şeridin altında kalmayı önleyen boşluk. */
export function NavBosluk() {
  // Şeridin yüksekliği (~52 px) + ev çizgisi payı.
  return <div className="h-[calc(3.5rem+env(safe-area-inset-bottom))]" aria-hidden />;
}

/* ── İkonlar ───────────────────────────────────────────────── */

function Kutu({ children }: { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="24"
      height="24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {children}
    </svg>
  );
}

function Kumanda() {
  return (
    <Kutu>
      <path d="M7.5 8h9a4.5 4.5 0 0 1 4.4 3.6l.7 3.6A2.6 2.6 0 0 1 19 18.3c-.8 0-1.6-.4-2.1-1L15.6 16H8.4l-1.3 1.3c-.5.6-1.3 1-2.1 1a2.6 2.6 0 0 1-2.6-3.1l.7-3.6A4.5 4.5 0 0 1 7.5 8Z" />
      <path d="M7 11.4v2.2M5.9 12.5h2.2M15.6 12h.01M17.6 14h.01" />
    </Kutu>
  );
}

function Bilet() {
  return (
    <Kutu>
      <path d="M3 8.5A1.5 1.5 0 0 1 4.5 7h15A1.5 1.5 0 0 1 21 8.5v1.8a2 2 0 0 0 0 3.4v1.8a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 15.5v-1.8a2 2 0 0 0 0-3.4Z" />
      <path d="M13 7.5v9" strokeDasharray="2 2" />
    </Kutu>
  );
}

function Kisi() {
  return (
    <Kutu>
      <circle cx="12" cy="8.5" r="3.3" />
      <path d="M5 19a7 7 0 0 1 14 0" />
    </Kutu>
  );
}
