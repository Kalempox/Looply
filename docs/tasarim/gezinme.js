/* CafePlay tasarım prototipi — gezinme.
 *
 * Ekranlar arası bağlantı BURADA duruyor, HTML'de değil. Böylece ekran
 * dosyaları saf tasarım markup'ı olarak kalıyor: koda taşırken bu dosya
 * atılıyor, tek satır temizlik gerekmiyor.
 *
 * Eşleştirme, tıklanabilir öğenin GÖRÜNEN METNİNE göre yapılıyor. Metin
 * değişirse bağlantı sessizce kopmasın diye konsola uyarı düşüyor.
 */

const GENEL = {
  // Oyuncu alt gezinme şeridi — üç durak, her oyuncu ekranında
  Oyna: "ana_sayfa_oyna",
  Ödüllerim: "d_llerim",
  Profilim: "profilim",
  "Panele dön": "isletme_panel",
  "← Panele dön": "isletme_panel",
};

const HARITA = {
  /* ── Giriş ───────────────────────────────────────────────── */
  giri_noktas: {
    "Giriş yap": "kay_t_giri",
    "Karekodsuz gir": "kay_t_giri",
    "Başvuru yap": "isletme_basvuru",
    "Panele gir": "isletme_giris",
    "Platform girişi": "platform_giris",
  },
  kay_t_giri: {
    "Doğrulama kodu gönder": "sms_do_rulama",
    "Aydınlatma metnini": "aydinlatma",
  },
  sms_do_rulama: {
    "Doğrula ve gir": "ana_sayfa_oyna",
    "Numarayı değiştir": "kay_t_giri",
  },
  aydinlatma: { "Geri dön": "kay_t_giri" },

  /* ── Oyuncu ──────────────────────────────────────────────── */
  ana_sayfa_oyna: {
    Blok: "b_l_m_se_imi_blok",
    Oyna: "b_l_m_se_imi_blok", // bugünün oyunu kartındaki düğme
    "Tüm oyunlar": "t_m_oyunlar",
    "Buradaki fırsatlar": "buradaki_f_rsatlar",
    "Verilerim ve hesap ayarlarım": "verilerim",
    "Çıkış yap": "giri_noktas",
  },
  b_l_m_se_imi_blok: {
    "1. bölüm": "oyun_blok",
    "2. bölüm": "oyun_blok",
    "3. bölüm": "oyun_blok",
    "4. bölüm": "oyun_blok",
    "5. bölüm": "oyun_blok",
    "Ana ekrana dön": "ana_sayfa_oyna",
  },
  oyun_blok: { arrow_back: "b_l_m_se_imi_blok", __tahta: "b_l_m_sonucu" },
  oyun_kelime: { arrow_back: "ana_sayfa_oyna", "Gönder": "b_l_m_sonucu" },
  oyun_dusen: { arrow_back: "ana_sayfa_oyna", __tahta: "b_l_m_sonucu" },
  b_l_m_sonucu: {
    "Sonraki bölüm": "oyun_blok",
    "Tekrar oyna": "oyun_blok",
    "Bölümlere dön": "b_l_m_se_imi_blok",
    "Ücretsiz kurabiye": "d_llerim",
  },
  d_llerim: {
    KULLAN: "kupon_kullan",
    "Ücretsiz filtre kahve": "kupon_kullan",
    "1 Dilim Pasta": "kupon_kullan",
    "Özel İçecek": "kupon_durumlari",
  },
  kupon_kullan: { "Ödüllerime dön": "d_llerim", ÖDÜLLERİM: "d_llerim" },
  kupon_durumlari: { ÖDÜLLERİM: "d_llerim" },
  buradaki_f_rsatlar: { "Ana ekrana dön": "ana_sayfa_oyna" },
  verilerim: {
    "Ana ekrana dön": "ana_sayfa_oyna",
    "← Ana ekrana dön": "ana_sayfa_oyna",
    "Evet, sil": "giri_noktas",
  },
  t_m_oyunlar: {
    Blok: "b_l_m_se_imi_blok",
    Kelime: "oyun_kelime",
    Düşen: "oyun_dusen",
    OYNA: "ana_sayfa_oyna",
  },

  /* ── Kasa ────────────────────────────────────────────────── */
  kasa_giris: { Giriş: "kasa" },
  kasa: {
    "QR okut": "kasa_kamera",
    "Kontrol et": "kasa_gecerli",
    "Vardiyayı kapat": "kasa_giris",
  },
  kasa_kamera: { "Kamerayı kapat": "kasa", __tahta: "kasa_gecerli" },
  kasa_gecerli: { ONAYLA: "kasa_onaylandi", Vazgeç: "kasa" },
  kasa_yuzdeli: { ONAYLA: "kasa_onaylandi", Vazgeç: "kasa" },
  kasa_red: { Tamam: "kasa" },
  kasa_onaylandi: { Sıradaki: "kasa", "Geri al": "kasa_red" },

  /* ── İşletme ─────────────────────────────────────────────── */
  isletme_basvuru: { "Başvuruyu gönder": "basvuru_alindi" },
  basvuru_alindi: {},
  isletme_giris: {
    "Doğrulama kodu gönder": "isletme_giris_kod",
    "Henüz başvurmadın mı? İşletme başvurusu": "isletme_basvuru",
  },
  isletme_giris_kod: {
    "Doğrula ve gir": "isletme_panel",
    "Numarayı değiştir": "isletme_giris",
  },
  isletme_panel: {
    "Personel ve PIN": "personel",
    "Haftalık bütçe": "butce",
    Ürünler: "urunler",
    "Ödül kataloğu": "oduller_katalog",
    "Ürün kampanyaları": "kampanyalar",
    Raporlar: "rapor",
    "Masa karekodları": "masa_karekodlari",
    DAĞITILABİLİR: "butce",
    "Bütçeyi belirle": "butce",
    "Çıkış yap": "isletme_giris",
  },
  butce: {}, urunler: {}, oduller_katalog: { Ürünler: "urunler" },
  kampanyalar: {}, personel: {}, rapor: {}, masa_karekodlari: {},

  /* ── Platform ────────────────────────────────────────────── */
  platform_giris: { "Doğrulama kodu gönder": "platform_giris_kod" },
  platform_giris_kod: {
    "Doğrula ve gir": "platform_basvurular",
    "Numarayı değiştir": "platform_giris",
  },
  platform_basvurular: {
    "Çıkış yap": "platform_giris",
    "Evet, onayla": "platform_basvurular",
    "Acil durdurma": "platform_acil",
  },
  platform_acil: {},
};

/* ── Bağlama ─────────────────────────────────────────────────── */

const EKRAN = location.pathname.split("/").filter(Boolean).slice(-2)[0] || "";
const yerel = HARITA[EKRAN] || {};
const tum = { ...GENEL, ...yerel };

/**
 * Öğenin GÖRÜNEN metni — ikon ligatürleri hariç.
 *
 * Material Symbols ikonları metin düğümü olarak duruyor: `arrow_forward`
 * yazan bir <span> ekranda ok çiziyor ama `textContent` içine "arrow_forward"
 * diye giriyor. Ayıklanmazsa "Doğrulama kodu gönder" düğmesinin metni
 * "Doğrulama kodu gönderarrow_forward" oluyor ve hiçbir eşleşme tutmuyor.
 */
function metin(el) {
  if (!el) return "";
  const kopya = el.cloneNode(true);
  kopya.querySelectorAll?.(".material-symbols-outlined").forEach((i) => i.remove());
  return (kopya.textContent || "").replace(/\s+/g, " ").trim();
}

/** Öğenin taşıdığı ikon adı — ok, geri, kamera gibi metinsiz düğmeler için. */
function ikonAdi(el) {
  const i = el.querySelector?.(".material-symbols-outlined") || null;
  return i ? (i.textContent || "").trim() : "";
}

/** Kartın/satırın başlığı — açıklama ve rozet metnini dışarıda bırakır. */
function baslikMetni(el) {
  const b = el.querySelector?.(
    "h1,h2,h3,h4,.font-title-sm,.font-headline-md,.font-display-lg,span.font-semibold,strong",
  );
  return b ? metin(b) : "";
}

function hedefBul(el) {
  const t = metin(el);
  if (t && tum[t]) return tum[t];

  const ik = ikonAdi(el);
  if (!t && ik && tum[ik]) return tum[ik]; // yalnızca ikon taşıyan düğme

  const b = baslikMetni(el);
  if (b && tum[b]) return tum[b];

  // Panel satırları gibi "başlık + açıklama + rozet" taşıyan öğeler:
  // metin anahtarla BAŞLIYORSA eşleş. Sınır kontrolü, "Oyna" anahtarının
  // "Oynamaya hazır mısın?" başlığına yapışmasını engelliyor.
  for (const [k, v] of Object.entries(tum)) {
    if (k.startsWith("__")) continue;
    for (const aday of [t, b]) {
      if (aday && aday.length > k.length && aday.startsWith(k) && /[^\p{L}\p{N}]/u.test(aday[k.length])) {
        return v;
      }
    }
  }
  return null;
}

let bagli = 0;
const baglanmayan = [];
const eslesen = new Set();
window.__HARITA_YEREL = yerel; // _denetim.html buradan okuyor
window.__ESLESEN = eslesen;

// Oyun tahtası → sonuç ekranı. Oyun oynanmıyor; prototipte tahtaya dokunmak
// bölümü bitirmiş sayılıyor ki akış kasaya kadar yürünebilsin.
if (yerel.__tahta) {
  const tahta = document.querySelector(
    ".touch-none, main .grid, [class*='aspect-']",
  );
  if (tahta) {
    tahta.style.cursor = "pointer";
    tahta.title = "Prototip: bölümü bitir";
    tahta.addEventListener("click", () => (location.href = `../${yerel.__tahta}/code.html`));
  }
}

for (const el of document.querySelectorAll(
  "a,button,[role='button'],li>div,li,article,section,span.material-symbols-outlined," +
  'div[class*="rounded-"]',
)) {
  const hedef = hedefBul(el);
  if (!hedef) {
    if (el.tagName === "A" || el.tagName === "BUTTON") baglanmayan.push(metin(el).slice(0, 40));
    continue;
  }
  el.style.cursor = "pointer";
  for (const [k, v] of Object.entries(yerel)) if (v === hedef) eslesen.add(k);
  el.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    location.href = `../${hedef}/code.html`;
  });
  bagli++;
}

/* ── Prototip şeridi ─────────────────────────────────────────── */

const serit = document.createElement("div");
const altCubuk = [...document.querySelectorAll("nav")].find((n) => {
  const c = getComputedStyle(n);
  return c.position === "fixed" && parseInt(c.bottom || "9999", 10) === 0;
});
const altBosluk = altCubuk ? altCubuk.getBoundingClientRect().height + 12 : 12;
serit.style.cssText =
  `position:fixed;right:12px;bottom:${altBosluk}px;z-index:9999;display:flex;gap:6px;` +
  "font:600 11px/1 Outfit,sans-serif;letter-spacing:.05em";
serit.innerHTML =
  `<a href="../index.html" style="background:#1F1F1F;color:#fff;padding:7px 10px;border-radius:6px;text-decoration:none">DİZİN</a>` +
  `<button id="pg" style="background:#fff;color:#757575;border:1px solid #E5E5E5;padding:7px 10px;border-radius:6px;cursor:pointer;font:inherit">← GERİ</button>`;
document.body.appendChild(serit);
document.getElementById("pg").onclick = () => history.back();

if (baglanmayan.length) {
  console.info(
    `[gezinme] ${EKRAN}: ${bagli} bağlantı kuruldu. Bağlanmayanlar:`,
    baglanmayan,
  );
}
