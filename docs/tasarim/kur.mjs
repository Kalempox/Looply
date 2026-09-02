// Tasarım kabuğu üreticisi.
//
// Stitch her ekranı kendi içinde tam bir HTML dosyası olarak veriyor: aynı font
// bağlantıları, aynı Tailwind yapılandırması, aynı stil bloğu 21 kez tekrar.
// Burada o kabuk BİR kez duruyor; ekranlar `_govde/*.html` altında yalnızca
// gövde olarak yazılıyor ve bu betik ikisini birleştirip Stitch'inkiyle aynı
// biçimde `<ekran>/code.html` üretiyor.
//
// Çalıştır:  node docs/tasarim/kur.mjs
//
// Tema `DESIGN.md` ile birebir aynı — orası değişirse burası da değişecek (Ü31).

import { readFileSync, writeFileSync, readdirSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const KOK = dirname(fileURLToPath(import.meta.url));
const GOVDE = join(KOK, "_govde");

/** Ekran kimliği → sekme başlığı. Gövde dosyasının ilk satırındaki yorumdan okunur. */
function baslikCoz(icerik, ad) {
  const m = icerik.match(/^<!--\s*baslik:\s*(.+?)\s*-->/);
  return m ? m[1] : ad;
}

/** Gövdenin ilk satırındaki `govde:` sınıfları — sayfa zemini ekrana göre değişiyor. */
function govdeSinifiCoz(icerik) {
  const m = icerik.match(/<!--\s*govde:\s*(.+?)\s*-->/);
  return m
    ? m[1]
    : "bg-surface-alt text-on-surface font-body-md antialiased min-h-screen";
}

/**
 * Geliştirme şeridi — ekranın en üstünde, doğrulama kodunu gösterir.
 *
 * Uygulamada karşılığı var: `app/src/app/giris/form.tsx` içindeki
 * `GelistirmeKodu`. Sahte SMS sağlayıcısı kullanılırken kod ekrana basılıyor,
 * çünkü kodu görmek için sunucu logu okumak test etmeyi gereksiz zorlaştırıyor.
 *
 * Canlıda HİÇBİR KOŞULDA görünmez: sunucu `gelistirmeKodu` alanını yalnızca
 * sahte sağlayıcıda dolduruyor ve `lib/env.ts` canlıda o sağlayıcıyı zaten
 * reddediyor. Bu yüzden şerit bilerek ürün paletinin dışında duruyor — altın
 * zemin, uyarı ikonu, "gerçek sağlayıcı bağlanınca kaybolur" notu. Kimse onu
 * arayüzün parçası sanmasın.
 *
 * Gövde dosyası `<!-- gelistirme: <tur> · <deger> · <etiket> -->` yazarak ister.
 */
function gelistirmeSeridi(icerik) {
  const m = icerik.match(/<!--\s*gelistirme:\s*(.+?)\s*-->/);
  if (!m) return "";
  const [tur, deger, etiket] = m[1].split("·").map((x) => x.trim());

  if (tur === "numaralar") {
    const satir = (k, v) =>
      `<div class="flex items-baseline justify-between gap-unit-4">` +
      `<dt class="text-text-muted">${k}</dt>` +
      `<dd class="tabular font-data-mono font-medium text-text-charcoal">${v}</dd></div>`;
    return `<div class="w-full border-b border-reward-gold bg-reward-fixed px-margin-mobile py-unit-4">
<div class="mx-auto w-full max-w-lg">
<div class="flex items-center gap-unit-2">
<span class="material-symbols-outlined text-[18px] text-reward-ink">construction</span>
<span class="font-label-caps text-label-caps text-reward-ink">GELİŞTİRME · KAYITLI NUMARALAR</span>
</div>
<dl class="mt-unit-3 flex flex-col gap-unit-1 text-sm">
${satir("Kafe A yöneticisi", "0532 000 00 01")}
${satir("Kafe B yöneticisi", "0532 000 00 02")}
${satir("Platform yöneticisi", "0531 000 00 01")}
${satir("Platform desteği", "0531 000 00 02")}
${satir("Kasiyer PIN", "1234")}
</dl>
<p class="mt-unit-3 text-sm leading-relaxed text-text-muted">Bunların dışındaki numaralar işletme ve platform ekranlarında <strong class="text-text-charcoal">kayıtsız</strong> sayılır ve kod gönderilmez. Oyuncu tarafında her numara kaydolabilir.</p>
</div>
</div>
`;
  }

  return `<div class="sticky top-0 z-50 w-full border-b border-reward-gold bg-reward-fixed px-margin-mobile py-unit-3">
<div class="mx-auto flex w-full max-w-4xl items-center gap-unit-4">
<span class="material-symbols-outlined text-[20px] text-reward-ink">construction</span>
<div class="min-w-0 flex-1">
<div class="font-label-caps text-label-caps text-reward-ink">GELİŞTİRME · ${etiket ?? "SMS GÖNDERİLMEDİ"}</div>
<div class="text-sm text-text-muted">${tur === "pin" ? "Geliştirme tohumundaki PIN. Canlıda bu şerit hiç görünmez." : "Gerçek sağlayıcı bağlandığında bu şerit kaybolur."}</div>
</div>
<span class="tabular shrink-0 font-data-mono text-[24px] font-bold tracking-[0.2em] text-text-charcoal">${deger}</span>
</div>
</div>
`;
}

const KAFA = (baslik, govdeSinifi) => `<!DOCTYPE html><html lang="tr"><head>
<meta charset="utf-8">
<meta content="width=device-width, initial-scale=1.0" name="viewport">
<title>Looply - ${baslik}</title>
<!-- Fonts -->
<link href="https://fonts.googleapis.com" rel="preconnect">
<link crossorigin="" href="https://fonts.gstatic.com" rel="preconnect">
<link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700;800&amp;family=JetBrains+Mono:wght@400;500;700&amp;display=swap" rel="stylesheet">
<!-- Material Symbols -->
<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&amp;display=swap" rel="stylesheet">
<!-- Tailwind CSS -->
<script src="https://cdn.tailwindcss.com?plugins=forms,container-queries"></script>
<script id="tailwind-config">
    tailwind.config = {
        darkMode: "class",
        theme: {
            extend: {
                "colors": {
                    "surface": "#FFFFFF",
                    "surface-alt": "#FAFAFA",
                    "surface-sunk": "#F2F2F2",
                    "surface-container-highest": "#e5e2e1",
                    "border-noble": "#E5E5E5",
                    "outline-variant": "#c3c6d6",
                    "text-charcoal": "#1F1F1F",
                    "text-muted": "#6B6B6B",
                    "on-surface": "#1b1b1c",
                    "on-surface-variant": "#424654",
                    "primary": "#0B57D0",
                    "on-primary": "#ffffff",
                    "on-primary-fixed-variant": "#0040a1",
                    "primary-fixed": "#dae2ff",
                    "reward-gold": "#D4AF37",
                    "reward-ink": "#856612",
                    "reward-fixed": "#FBF3DC",
                    "danger-red": "#D93025",
                    "danger-fixed": "#FDECEA"
                },
                "borderRadius": {
                    "DEFAULT": "0.25rem",
                    "lg": "0.5rem",
                    "xl": "1rem",
                    "full": "9999px"
                },
                "spacing": {
                    "base": "4px",
                    "unit-1": "4px",
                    "unit-2": "8px",
                    "unit-3": "12px",
                    "unit-4": "16px",
                    "unit-6": "24px",
                    "unit-8": "32px",
                    "margin-mobile": "20px",
                    "gutter-mobile": "12px"
                },
                "fontFamily": {
                    "display-lg": ["Outfit", "ui-sans-serif", "system-ui", "sans-serif"],
                    "headline-md": ["Outfit", "ui-sans-serif", "system-ui", "sans-serif"],
                    "title-sm": ["Outfit", "ui-sans-serif", "system-ui", "sans-serif"],
                    "body-md": ["Outfit", "ui-sans-serif", "system-ui", "sans-serif"],
                    "label-caps": ["Outfit", "ui-sans-serif", "system-ui", "sans-serif"],
                    "data-mono": ["JetBrains Mono", "ui-monospace", "SFMono-Regular", "monospace"],
                    "sans": ["Outfit", "ui-sans-serif", "system-ui", "sans-serif"],
                    "mono": ["JetBrains Mono", "ui-monospace", "SFMono-Regular", "monospace"]
                },
                "fontSize": {
                    "display-lg": ["48px", { "lineHeight": "52px", "letterSpacing": "-0.04em", "fontWeight": "800" }],
                    "headline-md": ["24px", { "lineHeight": "30px", "letterSpacing": "-0.02em", "fontWeight": "700" }],
                    "title-sm": ["18px", { "lineHeight": "24px", "fontWeight": "600" }],
                    "body-md": ["16px", { "lineHeight": "26px", "fontWeight": "400" }],
                    "label-caps": ["12px", { "lineHeight": "16px", "letterSpacing": "0.05em", "fontWeight": "600" }],
                    "data-mono": ["14px", { "lineHeight": "20px", "fontWeight": "500" }]
                }
            }
        }
    }
</script>
<style>
    /* Taban font — hiçbir metin tarayıcı varsayılanına düşmesin.
       Ekranlar arası "font farklı görünüyor" sorununun ikinci kaynağı buydu. */
    html, body, button, input, select, textarea {
        font-family: "Outfit", ui-sans-serif, system-ui, sans-serif;
    }
    /* İmza doku: ilerleme çubuklarının -45° çizgisi. */
    .noble-stripe {
        background-image: repeating-linear-gradient(
            -45deg,
            rgba(255, 255, 255, 0.15),
            rgba(255, 255, 255, 0.15) 10px,
            transparent 10px,
            transparent 20px
        );
    }
    .tabular { font-variant-numeric: tabular-nums; }
    ::-webkit-scrollbar { display: none; }
    .pb-safe { padding-bottom: env(safe-area-inset-bottom, 16px); }
    @media (prefers-reduced-motion: reduce) {
        *, *::before, *::after {
            animation-duration: .01ms !important;
            transition-duration: .01ms !important;
        }
    }
</style>
</head>
<body class="${govdeSinifi}">
`;

// Prototip gezinmesi tek dosyada; ekran markup'ı temiz kalıyor (bkz. gezinme.js).
const KUYRUK = `
<script src="../gezinme.js"></script>
</body></html>
`;

let sayi = 0;
for (const dosya of readdirSync(GOVDE).filter((f) => f.endsWith(".html"))) {
  const ad = dosya.replace(/\.html$/, "");
  const ham = readFileSync(join(GOVDE, dosya), "utf8");
  const govde = ham.replace(/^<!--\s*(baslik|govde|gelistirme):.*?-->\s*/gm, "");
  const serit = gelistirmeSeridi(ham);

  mkdirSync(join(KOK, ad), { recursive: true });
  writeFileSync(
    join(KOK, ad, "code.html"),
    KAFA(baslikCoz(ham, ad), govdeSinifiCoz(ham)) + serit + govde.trim() + KUYRUK,
    "utf8",
  );
  sayi++;
}

console.log(`${sayi} ekran üretildi.`);
