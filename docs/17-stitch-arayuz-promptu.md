# 17 — Google Stitch Arayüz Promptu

> Looply'in **tüm arayüzünü** Google Stitch'te baştan tasarlatmak için hazırlanmış
> tam prompt seti. Kodda bugün var olan her ekran + linki verilmiş ama henüz
> yazılmamış ekranlar + karara bağlanmış ileri faz ekranları.

**Son güncelleme:** 2026-08-26 · **Kaynak:** `app/src/app/**`, `docs/02`, `docs/06`, `docs/08`

---

## 0 · Nasıl kullanılır

Stitch tek promptta tüm uygulamayı üretmez — **ekran ekran** üretir. Bu yüzden dosya
şöyle kurulu:

```
BÖLÜM 1  →  ÇEKİRDEK PROMPT   (her ekran promptunun BAŞINA yapıştırılır)
BÖLÜM 3  →  EKRAN PROMPTLARI  (31 ekran, her biri tek başına yapıştırılabilir)
```

**Akış:**

1. Stitch'te **Açık ve Asil** teması seçili projede çalış — palet, font ve şekil dili
   kilitlendi (BÖLÜM 1).
2. Her ekran için: `ÇEKİRDEK PROMPT` + boş satır + o ekranın prompt bloğu → yapıştır.
3. Mod: oyuncu ve kasa ekranlarında **Mobile** (390×844); işletme ve platform
   ekranlarında (D ve E grupları) **Web**, 1024 px.

**Tasarım dili kilitli — 2026-08-26.** `Açık ve Asil`: Outfit + JetBrains Mono,
beyaz/açık gri zemin, tek mavi vurgu, asil altın ödül rengi, 1px saç teli çizgiler,
gölge yerine tonlama. Tam tanım BÖLÜM 1'de; Stitch'in ürettiği tema dosyası
`stitch_noble_minimalist_design/noble_caf_loyalty/DESIGN.md`.

Ekran promptları renk adı yerine **rol adı** kullanıyor (`accent`, `reward`,
`danger`…); çekirdek promptta bu roller birebir hex'e bağlanmış durumda.

**Durum: 40 ekran hazır ve birbirine bağlı.** Stitch'in 11 ekranı + elle çizilen
29 ekran, hepsi `docs/tasarim/` altında tek tasarım sisteminde.

```bash
python -m http.server 4173 --directory docs/tasarim
```

`http://localhost:4173` → dizin. Ekranlar **tıklanabilir**: giriş noktasından
başlayıp kayıt, oyun, ödül, kasa onayı ve rapora kadar gerçek akışı yürüyebilirsin.
Her ekranın sağ altında **DİZİN** ve **← GERİ** şeridi var.

Docker gerekmiyor — bunlar düz HTML dosyaları. Docker yalnızca gerçek uygulamanın
PostgreSQL'i için lazım.

**Geliştirme şeridi.** Doğrulama kodu, kasiyer PIN'i ve kayıtlı test numaraları
ekranın en üstünde altın bir şeritte görünüyor — kodu görmek için sunucu logu
okumak gerekmesin diye. Uygulamadaki karşılığı `app/src/app/giris/form.tsx`
içindeki `GelistirmeKodu`. Şerit bilerek ürün paletinin dışında duruyor; canlıda
hiçbir koşulda render edilmiyor, çünkü sunucu `gelistirmeKodu` alanını yalnızca
sahte SMS sağlayıcısında dolduruyor ve `lib/env.ts` canlıda o sağlayıcıyı zaten
reddediyor.

| Ekran | Şeritte görünen |
|---|---|
| A1 giriş noktası | kayıtlı test numaraları + kasiyer PIN |
| B2 SMS doğrulama | 6 haneli kod |
| C1 kasa girişi | kasiyer PIN'i |
| D3b işletme girişi · kod | 6 haneli kod |
| E1b platform girişi · kod | 6 haneli kod |

---

## 1 · ÇEKİRDEK PROMPT

> Bunu her ekran promptunun başına yapıştır.

```
You are designing Looply, a Turkish mobile web product. Read this context first,
then design ONLY the screen described after it.

── PRODUCT ─────────────────────────────────────────────────────────────
Looply is a gamified customer-acquisition and loyalty network for cafés in Turkey.
A guest at a café table scans a printed QR code on the table, registers with phone +
name, plays a short casual game, earns points and discount coupons, and redeems the
coupon at the cash register. The café pays for measurable foot traffic, not for a game.

Three audiences use it:
  · PLAYER   — a guest sitting at a café table, phone in one hand, holding a coffee
  · CASHIER  — staff at a dim, crowded counter, must finish in three seconds
  · BUSINESS — the café owner and the platform team, reading numbers like an invoice

── PLATFORM ────────────────────────────────────────────────────────────
This is a RESPONSIVE WEBSITE, not a native app. No app store, no install screen, no
splash screen, no native tab bar chrome, no iOS/Android system UI mockups.
It must look correct in mobile Safari and Chrome. Design mobile-first at 390×844.
Player and cashier screens are mobile only. Business and platform screens are
mobile-first but must also hold up at 1024px wide.

── LANGUAGE ────────────────────────────────────────────────────────────
All interface text is TURKISH. Every string in quotes below is final copy — use it
exactly as written and DO NOT TRANSLATE it to English. Do not invent extra
marketing copy, taglines, or filler paragraphs.

── DESIGN SYSTEM · "AÇIK VE ASİL" — LOCKED, DO NOT REINVENT ────────────
The design system is already decided and 11 screens are already built with it. Match
them exactly. Do not propose an alternative palette, typeface, radius or spacing
scale. Do not introduce a colour that is not on this list.

TYPOGRAPHY — two families, six styles, nothing else
  Outfit           all prose, headings, labels and buttons
  JetBrains Mono   all numbers, codes, timestamps, tabular data

  display-lg    Outfit 800 · 48/52 · tracking -0.04em
  headline-md   Outfit 700 · 24/30 · tracking -0.02em
  title-sm      Outfit 600 · 18/24
  body-md       Outfit 400 · 16/26
  label-caps    Outfit 600 · 12/16 · tracking 0.05em · UPPERCASE
  data-mono     JetBrains Mono 500 · 14/20 · tabular figures

  Headings tight and heavy, body loose and light — that contrast is the "noble"
  gravity of this system. Render Turkish characters correctly, including the
  dotted capital İ: İ ı Ğ ğ Ü ü Ş ş Ö ö Ç ç.

COLOR — nine values, no additions
  #FFFFFF   surface        cards and raised panels
  #FAFAFA   surface-alt    page background
  #F2F2F2   surface-sunk   inputs, progress tracks, inset areas
  #E5E5E5   border-noble   every hairline and divider
  #1F1F1F   text-charcoal  primary text
  #6B6B6B   text-muted     secondary text, label-caps, hints
  #0B57D0   primary        accent: primary action, active nav, verified state
  #D4AF37   reward-gold    rewards: BORDERS, FILLS, the striped bar, status dots
  #856612   reward-ink     the same reward colour when it is TEXT
  #D93025   danger-red     errors, rejection, destructive actions

  Gold is a border and a fill, not a typeface colour: #D4AF37 as text sits at
  2.1:1 on white and disappears. Whenever a reward label, price, coupon code or
  amount is set in the reward colour, use #856612. Never put danger-red text on
  #F2F2F2 — that combination is 4.26:1; put it on #FFFFFF instead.

  No second blue. No green success colour. No purple, no teal, no gradients on
  surfaces. Keep the vast majority of every screen white and grey, and let blue and
  gold appear rarely enough that they still mean something.

SHAPE
  Cards and primary containers   16px radius
  Buttons, inputs, large chips    8px radius
  Small chips and badges          4px radius
  Full-pill only for the status dot and the level-bar track.

DEPTH — hairlines and tone, never heavy shadow
  Base     #FAFAFA page
  Raised   #FFFFFF card + 1px #E5E5E5 border, no shadow (at most
           0 4px 20px rgba(0,0,0,0.04) on an element being dragged)
  Sunk     #F2F2F2 fill, no border

SPACING — strict 4px baseline grid
  4 · 8 · 12 · 16 · 24 · 32
  20px side margin on every mobile screen. 12px gutter between grid cells.
  32px between major sections, 12–16px inside them.

SIGNATURE — the "noble stripe"
  Progress bars use a #F2F2F2 track with a primary-blue or reward-gold fill carrying
  a repeating -45° stripe: rgba(255,255,255,0.15), 10px on / 10px off. This single
  texture is the product's recognizable detail. It appears on the player level bar,
  the café budget bar and the campaign counters — and nowhere else.

ROLE VOCABULARY — the screen briefs below name colours by role; resolve them here
  surface / surface-raised → #FFFFFF      surface-sunk → #F2F2F2
  border, "hairline"       → #E5E5E5      text          → #1F1F1F
  text-muted               → #757575      accent        → #0B57D0
  reward                   → #D4AF37      danger        → #D93025
  "micro-label"            → the label-caps style (Outfit 600, NOT monospaced)
  "monospaced", "tabular"  → JetBrains Mono
  "display face"           → Outfit 700–800

ICONS
  Material Symbols Outlined, used sparingly and only where an icon does real work:
  bottom nav, status indicators, empty states. Never decorative. Never on business
  or platform screens except as a functional status mark.

── STILL ON YOU ────────────────────────────────────────────────────────
The system is fixed; the composition is not. What still has to be earned on every
screen: a clear typographic hierarchy, numbers given room and always set larger than
their label, deliberate whitespace, and every state drawn — empty, loading, error and
success. Where a screen brief below lists variants, draw all of them.

── THREE SURFACES, ONE PALETTE ─────────────────────────────────────────
The three audiences are separated by DENSITY, ORNAMENT and TONE — not by hue.

PLAYER   Expressive and immediate. Big numbers, generous cards, one clear action per
         screen. A guest looks at this for twenty seconds between sips.
CASHIER  The same visual system, scaled up for a counter: larger type, taller touch
         targets, fewer elements on screen. One thumb, three seconds, dim room, queue
         waiting. No menu, no tabs, no settings on the cashier screen.
BUSINESS Restrained and documentary. Tables, hairlines, aligned numbers, NO EMOJI, no
         decorative illustration, no dashboard widgets. Every business screen should
         read like a well-set invoice. "The café owner is moved by the result, not by
         the game."

── WRITING RULES ───────────────────────────────────────────────────────
A label labels. A hint gives an example. An error says what happened AND how to fix it.
No sentence does two jobs. No exclamation marks. No "Oops". No cheerful mascot voice.

── ACCESSIBILITY ───────────────────────────────────────────────────────
Body text on surface must clear 4.5:1 contrast; micro-labels must clear 4.5:1 too, so
do not let "muted" drift into unreadable grey. Color never carries meaning alone —
every colored state also has a text label. Minimum touch target 44×44. Visible focus
ring on every interactive element. Body text minimum 13px; form inputs 16px so iOS
does not zoom on focus.

── NEVER ───────────────────────────────────────────────────────────────
No stock photography. No 3D illustrations. No confetti. No coffee-bean or coffee-cup
iconography. No gamification clichés (winged trophies, glowing chests, slot machines).
No emoji anywhere on business or platform screens. No AI-generated hero imagery.

Now design ONLY the following screen.
```

---

## 2 · Ekran haritası

```
                        ┌─────────────────────────┐
   MASA KAREKODU  ──────▶  /m/{kod}  (ekran YOK)  │  imzalı masa bileti çerezi
                        └───────────┬─────────────┘
                                    ▼
   A1  /                    ┌───────────────┐
   üç kapı  ───────────────▶│  B1  /giris   │  telefon + ad + soyad + doğum yılı
                            └───────┬───────┘
                                    ▼
                            ┌───────────────┐
                            │  B2  OTP kodu │  6 hane
                            └───────┬───────┘
                                    ▼
   ┌────────────────────────────────────────────────────────────────┐
   │  B3  /oyna   ◀── alt gezinme: Oyna · Ödüllerim · Profilim      │
   │      ├─ durum şeridi (5 hâl) → konum doğrula                   │
   │      ├─ B4 /oyna/{id} bölüm seçimi → B5 oyun → B6 sonuç        │
   │      ├─ B9 /firsatlar                                          │
   │      ├─ B7 /oduller → B8 /oduller/{id}  (QR + 6 hane)          │
   │      ├─ B10 /profil                                            │
   │      └─ B11 /verilerim                                         │
   └────────────────────────────────────────────────────────────────┘
                                    │  kupon QR / kod
                                    ▼
   C1 /kasa/giris  ──▶  C2 /kasa  ──▶  C4 geçerli ──▶ C6 onaylandı (60 sn geri al)
                                  └──▶  C5 geçersiz

   D1 /kafe/basvuru ──▶ D2 alındı ──▶ [E2 platform onayı] ──▶ D3 /kafe/giris
                                                                    │
                                                                    ▼
   D4 /kafe/panel ──┬─ D5 bütçe   ─┬─ D6 ürünler ─┬─ D7 ödüller
                    ├─ D8 kampanya ┼─ D9 personel ┼─ D10 rapor
                    └─ D11 masa karekodları (henüz yok)

   E1 /platform/giris ──▶ E2 /platform/basvurular ──▶ E3 /platform/acil
```

**Ekranı olmayan yollar:** `/m/{kod}` (yönlendirme), `/cikis` (yönlendirme),
`/api/saglik` (JSON), `/gelistirme` (yalnız geliştirme, tasarlanmayacak).

---

## 3 · Ekran promptları

### 3.0 · Durum tablosu

Tüm ekranlar: `docs/tasarim/<klasor>/code.html` · dizin: `docs/tasarim/index.html`

| Kod | Ekran | Klasör | Kaynak |
|---|---|---|---|
| A1 | Giriş noktası | `giri_noktas` | Stitch |
| B1 | Kayıt / giriş | `kay_t_giri` | Stitch |
| B2 | SMS doğrulama | `sms_do_rulama` | Stitch |
| B3 | Oyuncu ana ekranı | `ana_sayfa_oyna` | Stitch |
| B4 | Bölüm seçimi | `b_l_m_se_imi_blok` | Stitch |
| B5 | Oyun · Blok | `oyun_blok` | Stitch |
| B5 | Oyun · Kelime | `oyun_kelime` | elle |
| B5 | Oyun · Düşen | `oyun_dusen` | elle |
| B6 | Bölüm sonucu | `b_l_m_sonucu` | Stitch |
| B7 | Ödüllerim | `d_llerim` | Stitch |
| B8 | Kuponu kullan · QR | `kupon_kullan` | elle |
| B9 | Buradaki fırsatlar | `buradaki_f_rsatlar` | Stitch |
| B10 | Profilim | `profilim` | Stitch |
| B11 | Verilerim | `verilerim` | elle |
| C1 | Kasa girişi | `kasa_giris` | elle |
| C2–C6 | Kupon onayı · 5 hâl | `kasa` | elle |
| D1–D2 | İşletme başvurusu | `isletme_basvuru` | elle |
| D3 | İşletme girişi | `isletme_giris` | elle |
| D4 | İşletme paneli | `isletme_panel` | elle |
| D5 | Haftalık bütçe | `butce` | elle |
| D6 | Ürünler | `urunler` | elle |
| D7 | Ödül kataloğu | `oduller_katalog` | elle |
| D8 | Ürün kampanyaları | `kampanyalar` | elle |
| D9 | Personel ve cihazlar | `personel` | elle |
| D10 | Rapor | `rapor` | elle |
| D11 | Masa karekodları | `masa_karekodlari` | elle |
| E1 | Platform girişi | `platform_giris` | elle |
| E2 | Başvurular | `platform_basvurular` | elle |
| E3 | Acil durdurma | `platform_acil` | elle |
| F1 | Aydınlatma metni | `aydinlatma` | elle |
| — | *Tüm oyunlar* | `t_m_oyunlar` | Stitch · kapsam dışı |

**Kaynak dosyalar.** **40 ekranın tamamının** gövdesi `docs/tasarim/_govde/*.html`
altında; ortak kabuk (font bağlantıları, Tailwind teması, `noble-stripe`) tek yerde,
`docs/tasarim/kur.mjs` içinde duruyor. Stitch'in ürettiği 11 dosya da bu kabuğa
alındı — artık kendi kabuklarını taşımıyorlar. Tema değişirse `kur.mjs` düzenlenip

```bash
node docs/tasarim/kur.mjs
```

çalıştırılır; 40 ekran birden yenilenir. `index.html` üretilmiyor, kendi tema
tanımını taşıyor — token değişince orayı da elle güncelle.

---

### 3.1 · Denetim sonuçları

`docs/tasarim/` üzerinde palet, tipografi, E9, G1, erişilebilirlik ve sayı biçimi
denetimi çalıştırıldı.

```
31 ekran tarandı · TEMİZ
```

**Tarayıcıda ölçülen tipografi** — 31 ekranın gövde fontu tek değer: `Outfit`.
Metin dışında yalnızca ikon fontu (`Material Symbols Outlined`) ve sayılarda
`JetBrains Mono` görünüyor.

| Ekran | Öğe | Ölçülen |
|---|---|---|
| C1 | H1 | Outfit **800** 36px |
| C1 | PIN alanı | JetBrains Mono **500** 36px |
| C1 | düğme | Outfit **600** 18px |
| C2 | "QR okut" | Outfit **600** 20px |
| C4 | "ONAYLA" | Outfit **600** 20px |
| C4 | 45 TL | JetBrains Mono **700** 24px |

**Doğrulanan ürün kuralları:**

| Kural | Ekran | Sonuç |
|---|---|---|
| E9 · kupon ekranında TL yok | B8 | ✅ hiçbir TL dizesi yok |
| E9 · geçerlilik damgası yok | B8 | ✅ yalnızca "geçerli değildir" cümlesi |
| E9 · TL yalnızca kasada | C4 | ✅ tek görünüm yeri |
| G1 · rapor kişisel veri | D10 | ✅ ad/soyad/telefon yok, yalnız `K-4821` biçimi kod |
| Ü30 · mahremiyet eşiği | D10 | ✅ `<5` iki yerde |
| İşletme yüzeyinde emoji yok | D10 | ✅ |

---

### 3.2 · Uygulanan düzeltmeler

Stitch çıktısındaki bulguların tamamı giderildi ve 11 ekran ortak kabuğa alındı.

**Tipografi — "fontlar farklı görünüyor" sorununun kökü.** Tailwind'de
`text-title-sm` yalnızca boyut değil **ağırlığı da** taşıyor. Keyfi boyut yazıldığında
(`text-[20px]`) ağırlık sessizce 400'e düşüyor ve Outfit SemiBold yerine Outfit
Regular çiziliyordu. 24 dosyada 148 yerde vardı; ağırlık ve harf aralığı artık
markup'ta açıkça yazıyor. Kabukta ayrıca taban font kuralı var — hiçbir metin tarayıcı
varsayılanına düşmüyor — ve font yığınlarına yedek eklendi.

| # | Ekran | Düzeltilen |
|---|---|---|
| 1 | B3 | "Oyun Kategorileri" (Bulmaca / Şans) kaldırıldı — **Ü10:** kategori yok |
| 2 | B3 | **"Bugünün oyunu" kartı eklendi** (×2 çarpan) + "Tüm oyunlar" ızgarası + fırsatlar kartı + hesap bağlantıları |
| 3 | B3 | Seviye çubuğu `1.200 / 2.000 Puan` → **`1.080 / 1.500 XP`** (Ü14) |
| 4 | B6 | Skor etiketi `Toplam Puan` → **`SKOR`** + "sunucuda doğrulandı" |
| 5 | B6 | Ödül kartı "…siparişinde geçerli" → **"Ödüllerim ekranından kasada gösterebilirsin."** (E9) |
| 6 | B7 | Tepe çubuğu kaldırıldı — tema adı "Açık ve Asil" arayüze sızmıştı, bildirim zili üründe yok |
| 7 | B7 | Bekleyen kuponun **%75 ilerleme çubuğu** → **"Açılış 27 Eylül"** (A5: ertesi gün açılır, hızlandırılamaz) |
| 8 | B9 | İndirim yüzdesi kırmızı çipten **altın** çipe |
| 9 | B9 | Alt gezinmede aktif durak `Ödüllerim` → **`Oyna`** |
| 10 | B5 Blok | **"SÜRE 02:14" sayacı** → **"TEMİZLENEN 6"** (Ü21: Blok'ta zaman yok) |
| 11 | B5 Blok | `1,250` / `3,000` → **`1.250` / `3.000`** |
| 12 | B1 | Zorunlu aydınlatma onayı **işaretsiz** hâle getirildi (KVKK açık rıza) |
| 13 | B1 | "Gizlilik politikamız gereği…" → numaranın şifreli saklandığını söyleyen gerçek metin |
| 14 | 9 ekran | **948 palet dışı Material-3 sınıfı** dokuz renge eşlendi |
| 15 | tümü | `user-scalable=no` kaldırıldı — parmakla büyütme açık |
| 16 | 5 ekran | `dark:` varyantları silindi — Ü31 açık arayüz, karanlık mod yok |
| 17 | tümü | Tanımsız sınıflar onarıldı: `noble-hairline` → gerçek kenarlık, `no-select` → `select-none`, `flat no shadows` → silindi |
| 18 | tümü | Süs gölgeleri (`shadow-sm/md`) kaldırıldı — Ü31: gölge yerine tonlama |
| 19 | B9 | Süs degradesi kaldırıldı |

**Not:** Önceki listede "B6'da *Bölümlere dön* düğmesi eksik" yazıyordu; düğme
dosyada mevcut, ekran görüntüsünde kadraj dışında kalmış. Madde kaldırıldı.

**`t_m_oyunlar` kapsama alındı (B3b).** Ürün sahibinin kararı: oyunlar partiler
hâlinde ekleneceği için ızgara ana ekranda durmamalı — her yeni oyun ana ekranı bir
sıra uzatır ve "bugünün oyunu" kararı kalabalıkta kaybolurdu. Ana ekranda artık tek
satırlık bir giriş var; katalog ayrı ekranda, düz ve tek eksenli bir listede.
Kategori sekmeleri (Popüler / Strateji / Hız), uydurma oyunlar (Yapboz, Arena,
Hızlı), yanlış bölüm sayıları ve dış kaynaktan gelen avatar fotoğrafı kaldırıldı;
arama alanı kaldı çünkü kategori değil, aynı listenin daraltılmış hâli.

---

### A1 · Giriş noktası — `/`

**Kim:** herkes · **Yüzey:** oyuncu · **Nereden:** doğrudan adres

> Bu ekranı **ilk** üret. Paleti burada seç, sonraki 30 ekran onu miras alacak.

```
Screen: "Giriş noktası" — the single front door for all three audiences.
This is the first screen of the product; the palette you choose here becomes the
palette for all 31 screens. Single column, max-width 512px, centered, 20px padding.

Layout top to bottom:
1. Header. "Looply" in the display face, extrabold, ~48px, tight tracking.
   Below it, body face 15px text-muted: "Masadaki karekodu okut, oyna, kazandığın
   indirimi kasada kullan."
2. OPTIONAL open-session strip (design it as a second variant of this screen):
   an accent-outlined card, horizontal row — micro-label "AÇIK OTURUM", under it the
   role name "Oyuncu" in 15px semibold; on the right an outlined accent button
   "DEVAM ET" in micro-label style, and a small underlined text-muted link "ÇIKIŞ".
3. Three stacked sections, each with a micro-label heading and a 13px text-muted
   subtitle underneath:
   · "OYUNCU"   subtitle "Masadaki karekodu okutarak girilir."
   · "İŞLETME"  subtitle "12 onaylı kafe."
   · "PLATFORM" subtitle "3 başvuru onay bekliyor."
4. Inside each section, one or two "door" rows. A door is a full-width outlined row,
   NOT a filled button: a hairline border, 16px horizontal / 14px vertical padding,
   title in 15px semibold on the left with a 13px text-muted description under it, and
   a "→" arrow on the right. Primary doors carry the accent on their border and title;
   secondary doors use the neutral border and plain text.
   Doors, in order:
   - "Giriş yap" / "Numaran kayıtlıysa doğrudan girersin" (primary)
   - "Karekodsuz gir" / "Kafe dışında: oynanır ama kazandırmaz" (secondary)
   - "Başvuru yap" / "Vergi levhasıyla, ücretsiz" (primary)
   - "Panele gir" / "Yetkili numarasıyla" (secondary)
   - "Platform girişi" / "Başvuruları inceler ve onaylar" (secondary)

Do not add a hero image, a logo mark, or app-store badges.
All quoted text is Turkish final copy — do not translate.
```

| Dokunulan | Nereye gider |
|---|---|
| Giriş yap · Karekodsuz gir | `/giris` (B1) |
| Başvuru yap | `/kafe/basvuru` (D1) |
| Panele gir | `/kafe/giris` (D3) |
| Platform girişi | `/platform/giris` (E1) |
| Devam et (açık oturum) | role göre `/oyna` · `/kafe/panel` · `/platform/basvurular` |
| Çıkış | `/cikis` → `/` (A1) |

---

### B1 · Kayıt / giriş, adım 1 — `/giris`

**Kim:** oyuncu · **Nereden:** masa karekodu veya A1

```
Screen: "Giriş" — step 1 of 2. Phone + identity form.
Single column, max-width 448px, 20px side padding, 40px top.

Layout:
1. "Buradasın" table badge — an accent-outlined card: micro-label "BURADASIN", below
   it in the display face, bold 18px: "Kahve Durağı · Masa 3".
   This badge only appears when the guest arrived by scanning a table QR. Show it.
2. Heading block: an accent micro-label "OYUNA BAŞLA", under it an H1 in the display
   face, extrabold ~30px: "Önce seni tanıyalım".
3. Paragraph, body 15px text-muted: "Numaranı doğruladıktan sonra oyunlar açılır.
   Kazandığın indirimler hesabına işlenir."
4. Form fields. Every field is: a micro-label above, then an input on surface-sunk with
   a hairline border, 16px text, 16px horizontal / 14px vertical padding; on focus the
   border takes the accent. Hints sit under the input in 12px text-muted.
   · "CEP TELEFONU"  placeholder "0532 123 45 67"
     hint "Doğrulama kodu bu numaraya gelecek"
   · Two fields side by side in a 2-column grid: "AD" and "SOYAD"
   · "DOĞUM YILI"  placeholder "1995"  hint "Looply 18 yaş ve üzeri içindir"
5. A hairline divider, then two consent checkboxes. 20px checkboxes taking the accent
   when checked, 12px gap, text in 13px text-muted with 1.6 line-height:
   · "Aydınlatma metnini okudum, kişisel verilerimin işlenmesini kabul ediyorum."
     — the words "Aydınlatma metnini" are an underlined accent link.
   · "Looply'den kampanya ve fırsat bildirimleri almak istiyorum."
   These two must look clearly SEPARATE and the second must render UNCHECKED. Do not
   merge them into one line and do not pre-check anything.
6. Primary button, full width: solid accent fill, display face bold 16px, 16px vertical
   padding: "Doğrulama kodu gönder"
7. Footer note, monospaced 10px text-muted, 1.6 line-height: "Telefon numaran şifreli
   saklanır ve üye işletmelerle paylaşılmaz. Kafeler seni yalnızca sana özel anonim bir
   kodla görür."

Also produce an inline error variant: a field with a danger border and a 13px danger
message under it, plus a top-of-form alert box — hairline danger border on
surface-sunk, 14px danger text, no icon.

All quoted text is Turkish final copy — do not translate.
```

| Dokunulan | Ne olur |
|---|---|
| Aydınlatma metnini | `/aydinlatma` yeni sekmede (F1) |
| Doğrulama kodu gönder | Aynı sayfa, B2 adımına geçer (SMS gider) |

---

### B2 · SMS doğrulama, adım 2 — `/giris`

**Kim:** oyuncu · **Nereden:** B1

```
Screen: "Doğrulama kodu" — step 2 of 2, replaces the step-1 form in place.
Same page frame as step 1.

Layout:
1. Same "Buradasın" accent table badge at the top.
2. Same heading block: "OYUNA BAŞLA" / "Önce seni tanıyalım".
3. Single field:
   micro-label "DOĞRULAMA KODU"
   a WIDE input, centered text, monospaced 24px, letter-spacing 0.4em, tabular figures,
   placeholder "——————", hairline border on surface-sunk.
   hint under it in 12px text-muted: "0532 123 45 67 numarasına gönderildi"
4. Full-width solid accent button: "Doğrula ve gir"
5. Under it, a plain underlined text-muted text button, 13px, centered:
   "Numarayı değiştir"
6. Bottom line, monospaced 10px text-muted, centered: "Masa bağlantın hazır — giriş
   yapınca oyunlar açılıyor"

Also produce a wrong-code error variant: an alert box above the field with a hairline
danger border on surface-sunk, 14px danger text, no icon, message "Kod doğru değil.
Tekrar dene veya numaranı kontrol et."

Do not draw six separate OTP boxes — this is ONE wide input with wide letter-spacing.
All quoted text is Turkish final copy — do not translate.
```

| Dokunulan | Ne olur |
|---|---|
| Doğrula ve gir | `/oyna` (B3) — masa oturumu açılır |
| Numarayı değiştir | B1'e döner, alanlar dolu gelir |

---

### B3 · Oyuncu ana ekranı — `/oyna`

**Kim:** oyuncu · **Nereden:** B2, alt gezinme, her yerden

Ürünün en önemli ekranı. Tepedeki şerit oyuncunun tek sorusuna cevap veriyor:
*"kazanabiliyor muyum?"*

```
Screen: "Oyna" — the player home. This is the most important screen in the product.
Single column, max-width 448px, 20px side padding, 64px bottom padding for the nav.

1. STATUS STRIP — sticky at the very top, full-bleed, 20px horizontal / 12px vertical
   padding, a near-opaque surface with backdrop blur, and a bottom hairline whose color
   changes with state. Row layout: a 10px dot on the left, a two-line text block in the
   middle, an optional outlined button on the right (border uses currentColor,
   micro-label text, 12px/6px padding).
   Design ALL FIVE states as separate strips stacked in the deliverable:
   a) OUTSIDE  — neutral border, text-muted, hollow dot, no button
      line 1 (micro-label): "KAFE DIŞINDASIN"
      line 2 (12px text-muted): "Oynayabilirsin ama puan ve kupon kazanamazsın"
   b) AWAITING LOCATION — reward color, hollow PULSING dot
      line 1: "KAHVE DURAĞI · MASA 3"   line 2: "Kazanabilmek için konumunu doğrula"
      button: "DOĞRULA"
   c) VERIFIED — accent color, FILLED dot, no button
      line 1: "KAHVE DURAĞI · MASA 3"   line 2: "Doğrulandı · 24 m"
   d) TOO FAR — danger color, hollow dot
      line 1: "KAHVE DURAĞI · MASA 3"   line 2: "Kafeden 380 m uzaktasın"
      button: "TEKRAR"
   e) LOCATION OFF — reward color, hollow dot
      line 1: "KAHVE DURAĞI · MASA 3"   line 2: "Konum kapalı — büyük ödüller kilitli"
      button: "TEKRAR"
   State (e) must NOT look like a crash or a hard error. Refusing location permission
   is a normal choice; only large rewards stay locked.

2. IDENTITY. Micro-label "MERHABA", under it the first name in the display face,
   extrabold ~36px: "Zeynep".

3. TWO NUMBER CARDS side by side in a 2-column grid, 10px gap. Each card has 16px
   horizontal / 20px vertical padding: micro-label on top, then a monospaced bold
   ~30px tabular number.
   · "BU KAFEDEKİ PUANIN"  →  "1.800"  in accent, card outlined in accent
   · "KULLANILABİLİR KUPON" →  "2"     in reward, card outlined in reward
   Out-of-café variant: the first label becomes "PUAN", the number is neutral, and a
   monospaced 9px text-muted suffix line reads "kafede kazanılır".

4. LEVEL STRIP, directly under the cards, tappable: hairline border on surface-sunk,
   16px/12px padding. Top row: micro-label "BU KAFEDEKİ SEVİYEN" on the left, a
   monospaced bold 18px accent "4" on the right. Under it a 4px-tall progress bar on a
   neutral track; the FILL is a repeating fine stripe in the accent, not a flat bar —
   make this striped fill a recurring detail of the product, it appears again on the
   business budget screens. Under that, monospaced 9px text-muted: "Sonraki seviyeye
   420 XP".

5. OPTIONAL LOCK NOTICE (design as a variant): a hairline reward border on
   surface-sunk, micro-label in reward "ÖDÜLLER GEÇİCİ OLARAK KİLİTLİ", under it 13px
   text-muted: "Telefon numaran yakında değişti. Güvenlik için 14:30, 27 Ağustos'a
   kadar kupon kullanılamıyor. Oynamaya devam edebilirsin, puanların birikir."

6. GAME OF THE DAY. Section header row: micro-label in reward "BUGÜNÜN OYUNU" on the
   left, and on the right in monospaced 10px reward: "×2 PUAN".
   Under it a large card outlined in reward, 24px horizontal / 28px vertical padding:
   a 36px emoji glyph "🟦" at the top, then the game name in the display face,
   extrabold ~24px "Blok", then 14px text-muted "Parçaları yerleştir, satırları
   temizle", then a full-width outlined reward button: "Oyna".

7. ALL GAMES. Micro-label header "TÜM OYUNLAR". A 2-column grid of cards with a 4:3
   aspect ratio, 10px gap. Each: a 24px emoji at the top-left, and pinned to the bottom
   the game name in 15px semibold plus a micro-label line under it.
   · 🔤 "Kelime"  — "5 BÖLÜM"
   · 🧱 "Düşen"   — "5 BÖLÜM"

8. OFFERS CARD (only when seated at a table): micro-label with the café name
   "KAHVE DURAĞI", then a row with "Buradaki fırsatlar" in the display face, bold 18px
   on the left and an accent "→" on the right, then 13px text-muted: "Bu kafenin ödül
   kataloğu ve ürün indirimleri".

9. EXPLANATION NOTE, only when the player cannot earn: no box, just a 2px neutral left
   rule with 16px left padding, 13px text-muted: "Puan ve kupon yalnızca bir Looply
   kafesinde, masadaki karekodu okutunca kazanılır."

10. Footer links above the nav, separated by a hairline top border: an underlined accent
    14px link "Verilerim ve hesap ayarlarım" and an underlined text-muted 14px
    "Çıkış yap".

11. BOTTOM NAV — fixed, full width, hairline top border, near-opaque surface-sunk with
    backdrop blur, three equal items, 12px vertical padding. Each item is an emoji
    glyph over a micro-label. Active item takes the accent, inactive is text-muted.
    🎮 "OYNA"  ·  🎟️ "ÖDÜLLERİM"  ·  🏅 "PROFİLİM"
    Exactly three items. Never add a fourth.

All quoted text is Turkish final copy — do not translate.
```

| Dokunulan | Nereye gider |
|---|---|
| Şerit → Doğrula / Tekrar | Tarayıcı konum izni ister, şerit yerinde değişir |
| Seviye şeridi | `/profil` (B10) |
| Bugünün oyunu → Oyna | `/oyna/blok` (B4) |
| Oyun karosu | `/oyna/{oyunId}` (B4) |
| Buradaki fırsatlar | `/firsatlar` (B9) |
| Verilerim ve hesap ayarlarım | `/verilerim` (B11) |
| Çıkış yap | `/cikis` → `/` (A1) |
| Alt gezinme | `/oyna` · `/oduller` · `/profil` |

---

### B4 · Bölüm seçimi — `/oyna/{oyunId}`

**Kim:** oyuncu · **Nereden:** B3

```
Screen: "Bölümler" — level picker for one game.
Max-width 448px, 20px side padding, 40px top.

1. Heading block: accent micro-label "🟦 OYUN", under it H1 display face, extrabold
   ~30px: "Blok".
2. CONDITIONAL WARNING — a 2px reward left rule, 16px left padding, no box, 13px
   text-muted: "Konumun doğrulanmadığı için bu oyunlar puan ve XP kazandırmaz. Ana
   ekrandaki şeritten doğrulayabilirsin."
   Out-of-café wording variant: "Kafe dışındasın: oynayabilirsin ama puan, XP ve kupon
   kazanamazsın."
3. CONDITIONAL BONUS BANNER — hairline reward border on surface-sunk, micro-label in
   reward: "BUGÜNÜN OYUNU · ×2 PUAN"
4. Micro-label header "BÖLÜMLER".
5. Five stacked cards, 10px gap, 20px horizontal / 16px vertical padding. Each row: on
   the left a title in the display face, bold 18px "1. bölüm" with a 13px text-muted
   line under it "Parçaları yerleştir, satırları temizle"; on the right an accent "→".
6. An underlined accent 14px link at the bottom: "Ana ekrana dön"

Do not add star ratings, locks, or a completion percentage — levels are always open.
All quoted text is Turkish final copy — do not translate.
```

| Dokunulan | Ne olur |
|---|---|
| n. bölüm | Sunucu tohumu üretir, B5 oyun ekranı açılır |
| Ana ekrana dön | `/oyna` (B3) |

---

### B5 · Oyun ekranları (3 oyun)

**Kim:** oyuncu · **Nereden:** B4

```
Screen set: three in-game boards. Full-bleed play area, no page scroll during play,
text selection disabled look (no cursors, no highlights).

Shared chrome for all three, above the board:
  a row with a micro-label on the left "BLOK · 1. BÖLÜM", and — only when the session
  cannot earn — a reward micro-label on the right "KAZANDIRMAZ".
Below the board, a centered monospaced 11px text-muted line that pulses gently while
the server checks the score: "Sunucu skorunu doğruluyor…"

BOARD 1 · "Blok"  🟦
  An 8×8 grid of cells. Empty cells sit on surface-sunk with a hairline border; filled
  cells are solid accent, flat, no bevel and no gloss. A row or column about to clear
  flashes in the reward color. Under the grid, a tray of THREE offered pieces, each
  drawn as small cells on its own card; the selected piece's card takes the accent
  outline. Above the grid on the right, a monospaced tabular score. Pieces are placed
  by drag or by select-then-tap.

BOARD 2 · "Kelime"  🔤
  A row of 5–7 letter cards — each letter in the display face, extrabold ~28px. Above
  them, the word being built shown monospaced with wide letter-spacing. Below, two
  buttons side by side: an outlined "Karıştır" and a solid accent "Gönder". Under that,
  the found words as a wrapped list of small outlined chips (monospaced 11px), and a
  monospaced progress line "4 / 6 kelime". Rejected words flash a danger border.

BOARD 3 · "Düşen"  🧱
  A 10-wide by 16-tall well. Same cell treatment as Blok. The falling piece takes the
  reward color; locked cells take the accent; the landing preview is a hairline accent
  outline with no fill. To the right of the well, a narrow column with micro-labels and
  monospaced numbers: "SIRADAKİ" with a small piece preview, "SATIR" with a count,
  "SKOR". Below the well, four large touch controls: ◀ ▶ ▼ and a rotate glyph, each
  56×56, outlined.

Use 3, 4 and 5-cell mixed piece shapes for "Düşen" — NOT the classic seven 4-cell
tetromino set. Do not reference or imitate Tetris art direction.
All quoted text is Turkish final copy — do not translate.
```

---

### B6 · Bölüm sonucu

**Kim:** oyuncu · **Nereden:** B5

```
Screen: "Bölüm sonucu" — what the player earned. Max-width 448px, 20px side padding.

1. RESULT CARD — outlined in accent on success, neutral on failure, 24px horizontal /
   28px vertical padding:
   micro-label "BLOK · 1. BÖLÜM"
   H2 display face, extrabold ~30px: "Bölüm tamam"   (failure: "Bölüm bitti")
   then a block: micro-label "SKOR", a monospaced bold ~36px accent tabular number
   "1.240", and under it a monospaced 9px text-muted line: "sunucuda doğrulandı"
2. EARNINGS ROWS — stacked boxes with a hairline border on surface-sunk, 16px/14px
   padding. Title in the display face, bold 16px (reward-colored when there is a gain,
   text-muted when there is none), description in 13px text-muted under it.
   · "+300 puan"  /  "Bu kafede harcanabilir."
   · "+50 XP"     /  "Seviyen bu kafede ilerledi. XP harcanmaz."
   Daily-cap variant of the first row's description: "Günlük 900 puan sınırına ulaştın;
   150 puan yazılmadı. Oynamaya devam edebilirsin, XP birikiyor."
   No-gain variant: title "Kazanım yok", description "Puan ve XP yalnızca bir Looply
   kafesinde, konumun doğrulandığında kazanılır."
3. REWARD CARD — only when a coupon was won. A tappable box with a solid reward border
   on surface-sunk: micro-label in reward "🎟️ ÖDÜL KAZANDIN", then the reward title in
   the display face, bold 18px "Ücretsiz kurabiye", then 13px text-muted "Ödüllerim
   ekranından kasada gösterebilirsin."
   Deferred variant of that last line: "Yarın açılıyor. Ödüllerim ekranından takip
   edebilirsin."
   NEVER print a TL amount here. The player learns the reward's NAME, never its value.
4. BADGE ROW variant: title "2 yeni rozet", description "Profilinde görebilirsin."
5. BUTTON STACK, 10px gap, all full width:
   · solid accent: "Sonraki bölüm"
   · outlined neutral: "Tekrar oyna"
   · plain underlined text-muted 14px: "Bölümlere dön"
6. REJECTED VARIANT — a card outlined in reward: H2 "Kayıt doğrulanamadı", body 14px
   text-muted: "Bu oyunun sonucu geçersiz sayıldı ve puan yazılmadı. Bağlantın koptuysa
   yeniden dene." Only "Tekrar oyna" and "Bölümlere dön" appear.

No confetti, no particle burst, no trophy illustration.
All quoted text is Turkish final copy — do not translate.
```

| Dokunulan | Nereye gider |
|---|---|
| Ödül kartı | `/oduller` (B7) |
| Sonraki bölüm / Tekrar oyna | Aynı ekranda yeni oturum, B5 |
| Bölümlere dön | B4 |

---

### B7 · Ödüllerim — `/oduller`

**Kim:** oyuncu · **Nereden:** alt gezinme, B6

```
Screen: "Ödüllerim" — the coupon inventory.
Max-width 448px, 20px side padding, bottom nav visible with "ÖDÜLLERİM" active.

1. Heading block: accent micro-label "ENVANTER", H1 "Ödüllerim".
2. THREE SECTIONS, 40px apart, each with a micro-label header:
   · "KULLANILABİLİR" — cards outlined in reward
   · "YAKINDA AÇILIYOR" — with a 12px text-muted note under the header: "Büyük ödüller
     kazanıldığı gün değil, ertesi gün açılır."
   · "GEÇMİŞ" — the whole list rendered at 55% opacity
3. COUPON CARD — 20px horizontal / 16px vertical padding:
   micro-label with the café name "KAHVE DURAĞI"
   title in the display face, bold 20px: "Ücretsiz filtre kahve"
   a bottom row: on the left a micro-label state (reward-colored when usable, muted
   otherwise), on the right a monospaced 10px text-muted tabular date.
   State labels, use exactly:
     "Kasada göster" · "Yarın açılıyor" · "Kullanıldı" · "Süresi doldu" · "Geri alındı"
   Right-side date labels: "Son kullanım 12 Eylül" or, for pending, "Açılış 27 Ağustos".
   NO TL amount anywhere on this screen.
4. EMPTY STATE — one card, 24px/32px padding: a 30px "🎟️" glyph, then 15px text-muted:
   "Henüz ödülün yok. Bir Looply kafesinde masadaki karekodu okutup oynadığında
   kazandıkların burada birikir."

All quoted text is Turkish final copy — do not translate.
```

| Dokunulan | Nereye gider |
|---|---|
| Kullanılabilir / Yakında açılıyor kartı | `/oduller/{kuponId}` (B8) |
| Geçmiş kartı | Tıklanmaz |

---

### B8 · Kuponu kullan — `/oduller/{kuponId}`

**Kim:** oyuncu · **Nereden:** B7

> Projenin en hassas ekranı. **E9:** burada TL değeri ve "geçerlidir" damgası yok.
> Bir kasiyer telefona bakıp ürün verirse sistem hiçbir şey görmez, kafenin bütçesi
> dolu görünür ve bütün raporlar yalan söyler. Geçerlilik yalnızca kasa ekranında,
> okutulduktan sonra ortaya çıkar.

```
Screen: "Kuponu kullan" — the redemption screen shown to the cashier.
Max-width 448px, 20px side padding.

1. Heading block: an accent micro-label with the café name "KAHVE DURAĞI", H1 display
   face, extrabold ~30px: "Ücretsiz filtre kahve".
2. MAIN CARD — outlined in reward, 24px horizontal / 28px vertical padding, centered:
   · a QR code, 220×220, BLACK on a PURE WHITE panel with 12px white padding around it,
     centered. The white panel is mandatory even if the page background is already
     light — scanners need a clean quiet zone.
   · under it, 15px text: "Kasada bu kodu okut."
   · a hairline divider with 20px space above and below
   · micro-label "KAMERA ÇALIŞMAZSA"
   · a six-character code in monospaced bold ~30px, letter-spacing 0.3em, reward color,
     tabular: "K7M2X9"
3. A note under the card: 2px reward left rule, 16px left padding, no box, 13px
   text-muted: "Kasada okutulmadan geçerli değildir. Kuponun kullanılıp kullanılmadığını
   yalnızca kasiyerin ekranı gösterir."
4. A monospaced 11px text-muted tabular line: "Son kullanım 12 Eylül"
5. An underlined accent 14px link: "Ödüllerime dön"
6. NON-USABLE VARIANTS — replace the whole main card with a plain neutral card,
   24px/32px padding, containing a display-face bold 20px title and a 14px text-muted
   paragraph:
   · "Yarın açılıyor" / "Büyük ödüller kazanıldığı gün değil, ertesi gün açılır.
     27 Ağustos tarihinden itibaren kasada kullanabilirsin."
   · "Kullanıldı" / "Bu kupon kasada kullanıldı."
   · "Süresi doldu" / "Kullanım süresi geçti. Yeni ödüller kazanmaya devam edebilirsin."
   · "Geri alındı" / "Kasiyer bu onayı geri aldı. Bir yanlışlık olduysa işletmeyle görüş."

ABSOLUTE RULES for this screen:
  · NO monetary value. No "45 TL", no "%20", no strike-through price.
  · NO validity stamp, checkmark, "GEÇERLİ" badge, green tick, or holographic seal.
  · An expired coupon must look almost identical to a valid one at a glance.
This is a deliberate anti-fraud design decision, not an omission. Do not "improve" it.
All quoted text is Turkish final copy — do not translate.
```

| Dokunulan | Nereye gider |
|---|---|
| Ödüllerime dön | `/oduller` (B7) |

---

### B9 · Buradaki fırsatlar — `/firsatlar`

**Kim:** oyuncu · **Nereden:** B3

```
Screen: "Buradaki fırsatlar" — the current café's catalogue.
Max-width 448px, 20px side padding.

1. Heading block: accent micro-label "FIRSATLAR", H1 "Buradaki fırsatlar".
2. The accent "Buradasın" table badge: micro-label "BURADASIN", then
   "Kahve Durağı · Masa 3".
3. A card: micro-label "BU KAFEDEKİ PUANIN", then monospaced bold 24px accent tabular
   "1.800".
4. SECTION "ÜRÜN İNDİRİMLERİ" (micro-label header in reward). Stacked cards outlined in
   reward, 20px/16px padding. Each: a row with the product name in the display face,
   bold 20px on the left and the percentage in monospaced bold 24px reward on the right
   — written as "%10", percent sign FIRST (Turkish convention). Under it a monospaced
   10px text-muted line: "3 Eylül tarihine kadar".
5. SECTION "ÖDÜL KATALOĞU" (micro-label header). Stacked plain cards. Each: title in
   the display face, bold 18px, optional 13px text-muted description, then a micro-label
   price line — "6.000 puan" in reward when affordable, text-muted when not. Instant
   rewards show an accent micro-label "Puan istemez" instead of a price. Unaffordable
   rows render the whole card at 55% opacity.
6. EMPTY-CATALOGUE STATE — a card with 15px text-muted text: "Kahve Durağı henüz ödül
   kataloğunu hazırlamadı. Oynamaya devam et — puanların birikiyor, katalog açıldığında
   burada görünecek."
7. OUT-OF-CAFÉ STATE — replace the whole body with one card, 24px/32px padding: a 30px
   "📍" glyph, then 15px text-muted: "Şu an bir kafede değilsin. Fırsatlar kafeye özel —
   masadaki karekodu okuttuğunda o kafenin ödülleri ve indirimleri burada görünür."
   plus an underlined accent 14px link "Ana ekrana dön".

Never show the café's cost data or a TL ceiling on this screen.
All quoted text is Turkish final copy — do not translate.
```

| Dokunulan | Nereye gider |
|---|---|
| Ana ekrana dön | `/oyna` (B3) |
| Ödül / kampanya satırı | Tıklanmaz — bilgi ekranı |

---

### B10 · Profilim — `/profil`

**Kim:** oyuncu · **Nereden:** alt gezinme, B3 seviye şeridi

> **Ü15:** Global seviye yok. Tepede tek bir büyük sayı **olmayacak** — ekran kafe
> kartlarından oluşuyor.

```
Screen: "Profilim" — per-café progress.
Max-width 448px, 20px side padding, bottom nav with "PROFİLİM" active.

1. Heading block: accent micro-label "PROFİL", H1 with the first name: "Zeynep".
2. SECTION "ROZETLERİN" — a wrapped row of badge chips. A chip is a small box with a
   hairline reward border on surface-sunk, 12px horizontal / 6px vertical padding, text
   in monospaced 10px UPPERCASE reward with wide tracking: "İLK OYUN", "MÜDAVİM".
   Never a medal illustration, never a photo-realistic badge.
3. SECTION "KAFELERİN" — stacked cards, 16px gap. Each card (outlined in accent when it
   is the café the player is currently sitting in), 20px/20px padding:
   · a row: café name in the display face, bold 20px on the left; when current, an
     accent micro-label "BURADASIN" on the right
   · a row with two blocks: left is micro-label "SEVİYE" over a monospaced bold 30px
     accent tabular "4"; right, right-aligned, is micro-label "XP" over a monospaced
     18px tabular "1.080"
   · a 6px striped accent progress bar on a neutral track, then a monospaced 10px
     text-muted line: "Sonraki seviyeye 420 XP"
   · the café's badge chips, wrapped
   · a hairline divider, then micro-label "BURADA OYNADIKLARIN · 23" and under it a
     short list of rows: on the left an emoji plus the game name in 13px, on the right
     a monospaced 10px text-muted tabular "24 Ağu · 1.240"
4. A closing note: 2px neutral left rule, 16px padding, 13px text-muted: "Seviye her
   kafede ayrı tutulur — bir kafedeki ilerlemen diğerine taşınmaz."
5. EMPTY STATE — a card, 24px/32px padding: a 30px "🏅" glyph and 15px text-muted:
   "Henüz bir kafede ilerleme kaydetmedin. Seviye ve rozetler yalnızca kafede, masadaki
   karekodu okutup oynadığında birikir."

Do NOT add an avatar, a profile photo, a global level, or a total-points headline.
All quoted text is Turkish final copy — do not translate.
```

| Dokunulan | Nereye gider |
|---|---|
| Kafe kartı | Tıklanmaz — bilgi kartı |
| Alt gezinme | `/oyna` · `/oduller` · `/profil` |

---

### B11 · Verilerim — `/verilerim`

**Kim:** oyuncu · **Nereden:** B3 alt bağlantısı

```
Screen: "Verilerim" — KVKK (Turkish GDPR) rights screen.
Max-width 448px, 20px side padding. NO bottom nav on this screen — it is a rights
screen, not daily navigation.

1. Heading block: accent micro-label "KVKK", H1 "Verilerim".
2. OPTIONAL DELETION BANNER — hairline reward border, 14px reward text: "Hesabın
   silinmek üzere. Kişisel bilgilerin 25 Eylül tarihinde geri döndürülemez şekilde
   silinecek. O tarihe kadar vazgeçebilirsin."
3. SECTION "HAKKINDA TUTTUĞUMUZ BİLGİLER" — a definition list with hairlines above,
   below and between rows. Each row: a 14px text-muted label on the left, a
   right-aligned 15px value, and optionally a monospaced 10px text-muted note beneath.
   · "Ad soyad"      → "Zeynep Kaya"
   · "Telefon"       → "0532 *** ** 67"   note "şifreli saklanır"
   · "Kayıt tarihi"  → "14 Ağustos 2026"
   Under the list, 13px text-muted: "Bu bilgiler hesabın açık olduğu sürece tutulur,
   hesabını silmenden 30 gün sonra geri döndürülemez şekilde silinir."
4. SECTION "ÜYE İŞLETMELERİN GÖRDÜĞÜ" — a ruled list: café name on the left in 15px,
   the per-café anonymous code on the right in monospaced 13px accent ("K-4821").
   Under it, 13px text-muted: "Kafeler adını, soyadını veya telefonunu görmez. Yalnızca
   yukarıdaki koda ve oyun hareketine bakarlar. Her kafede kodun farklıdır; iki kafe
   kendi aralarında seni eşleştiremez."
5. SECTION "KAMPANYA MESAJLARI" — a toggle control with a label next to it, taking the
   accent when on. Under it, 13px text-muted: "Bu izin hizmetin şartı değil — kapalıyken
   de oynayabilir, ödül kazanabilirsin."
6. SECTION "VERİLERİMİ İNDİR" — an outlined full-width button "Verilerimi indir", and
   under it 13px text-muted: "Hakkında tuttuğumuz her şeyi JSON dosyası olarak
   indirirsin: hesap bilgilerin, rızaların, puan hareketlerin, kuponların ve sana
   gönderilen mesajların listesi."
7. SECTION "HESABIMI SİL" — a full-width button with a danger border and danger text:
   "Hesabımı sil". Under it 13px text-muted: "Kişisel bilgilerin 30 gün içinde silinir.
   Kupon ve puan kayıtları ticari kayıt zorunluluğu gereği kalır ama kimliğinle bağı
   kopar." Also design the confirmation state: an inline block (not a floating modal)
   with a danger border asking "Hesabını silmek istediğine emin misin?" and two buttons,
   "Vazgeç" (outlined) and "Evet, sil" (danger fill).
8. An underlined accent 14px link: "← Ana ekrana dön"

All quoted text is Turkish final copy — do not translate.
```

| Dokunulan | Ne olur |
|---|---|
| İzin anahtarı | Yerinde değişir, kayıt anında yazılır |
| Verilerimi indir | JSON dosyası iner |
| Hesabımı sil → Evet, sil | `/giris?silindi=1` (B1'de bilgi kutusu) |
| Ana ekrana dön | `/oyna` (B3) |

---

### C1 · Kasa girişi — `/kasa/giris`

**Kim:** kasiyer · **Nereden:** kasadaki tablet

```
Screen: "Kasa girişi" — staff PIN entry on a counter tablet or phone.
Same visual system as the player screens, but everything one size larger.
Vertically centered on a full-height page, content max-width 320px.

1. Centered header: monospaced 11px UPPERCASE accent, wide letter-spacing, "LOOPLY";
   under it H1 display face, extrabold ~30px "Kasa"; under that a 14px text-muted
   paragraph, max-width 288px: "Kupon onaylamak için personel PIN'inle gir. Oturum
   sekiz saat açık kalır."
2. Centered micro-label "PERSONEL PIN'İ".
3. A single very large input: full width, 24px vertical padding, centered text,
   monospaced ~36px, letter-spacing 0.5em, placeholder "••••", masked, hairline border
   on surface-sunk, accent border on focus. Maximum four digits.
4. A full-width solid accent button, display face bold 18px, 20px vertical padding:
   "Giriş"
5. Centered 12px text-muted footer, max-width 288px: "PIN yalnızca işletme
   yöneticisinin kaydettiği cihazlarda çalışır."
6. Error variant: above the input, a full-width box with a hairline danger border on
   surface-sunk, centered 14px danger text: "PIN doğru değil."
   Unregistered-device variant: "Bu cihaz kayıtlı değil. İşletme yöneticisi panelden
   kaydetmeli."

Do not draw a numeric keypad — the device keyboard handles input.
All quoted text is Turkish final copy — do not translate.
```

| Dokunulan | Nereye gider |
|---|---|
| Giriş | `/kasa` (C2) — oturum 8 saat |

---

### C2–C6 · Kasa ekranı — `/kasa`

**Kim:** kasiyer · **Nereden:** C1

> **E7:** *"Sistemin sahada ayakta kalıp kalmayacağını bu ekran belirler. Kasiyer
> kullanmazsa hiçbir rapor doğru olmaz."* Menü yok, sekme yok, ayar yok.

```
Screen set: "Kasa" — the coupon approval flow, five states of ONE screen.
Counter scale. Content column max-width 448px, centered on the page.

PERSISTENT HEADER (all states): centered monospaced 10px accent, wide letter-spacing,
"LOOPLY KASA"; under it display face, extrabold 24px "Kupon onayı".

STATE C2 · IDLE
  · A huge primary button, full width, solid accent, display face bold 20px, 24px
    vertical padding: "QR okut"
  · Under it a micro-label "VEYA KUPON KODU" and a very large input: centered,
    monospaced ~30px, letter-spacing 0.3em, UPPERCASE, placeholder "——————", hairline
    border on surface-sunk, 20px vertical padding.
  · A full-width outlined accent button: "Kontrol et"
  · Variant for browsers without camera QR support (iOS Safari): the "QR okut" button
    is ABSENT, the input's micro-label becomes "KUPON KODU", and a centered 12px
    text-muted paragraph appears: "Bu tarayıcı kamerayla QR okuyamıyor. Müşterinin
    ekranındaki altı haneli kodu gir — aynı kuponu açar."
    This variant must not look broken or degraded. It is a first-class path.

STATE C3 · CAMERA OPEN
  · A full-width camera viewport with a hairline border on surface-sunk, 4:3.
  · A full-width outlined button under it: "Kamerayı kapat"
  · Camera-denied variant: replace the viewport with a box with a hairline danger
    border, 14px danger text: "Kameraya erişilemedi. Kodu elle girebilirsin."
  · No scanning animation, no laser line. If a frame guide is needed, use four thin
    accent corner brackets.

STATE C4 · VALID COUPON FOUND
  · A block with a 2px SOLID accent border, 24px horizontal / 28px vertical padding:
    micro-label in accent "GEÇERLİ KUPON"
    H2 display face, extrabold ~30px: "Ücretsiz filtre kahve"
    a hairline divider, then a row: micro-label "DEĞER" on the left and a monospaced
    bold 24px REWARD-colored tabular "45 TL" on the right.
    For a percentage coupon the left label reads "%20 · EN FAZLA" instead.
    a monospaced 11px text-muted row: "Müşteri K-4821" on the left, "son kullanım
    12 Eylül" on the right.
    PERCENTAGE ONLY — an amount field: micro-label "ADİSYONDAKİ İNDİRİM (TL)", a
    centered monospaced 24px input, then a 12px text-muted note: "Tavanın üstü kabul
    edilmez. Aradaki fark bütçeye geri döner."
    a huge solid accent button, display face bold 20px, 24px vertical padding, label in
    CAPS: "ONAYLA"
    a plain underlined text-muted 14px button: "Vazgeç"
  · The TL value appears HERE and only here. This is the one screen in the product that
    is allowed to show money to a human at the counter.

STATE C5 · REJECTED
  · A block with a 2px SOLID danger border, centered, 24px/32px padding: a 36px "⛔"
    glyph, then display face bold 20px danger text with the reason, then a full-width
    outlined button: "Tamam"
  · Design these reason strings as separate examples:
    "Bu kupon zaten kullanıldı."
    "Bu kuponun süresi dolmuş."
    "Bu kupon başka bir işletmeye ait."
    "Kod bulunamadı."

STATE C6 · APPROVED
  · A block with a 2px SOLID accent border, centered, 24px/32px padding: a 36px "✅"
    glyph, display face extrabold 24px "Kupon onaylandı", 15px text-muted reward name
    "Ücretsiz filtre kahve", monospaced bold 20px reward-colored tabular "45 TL".
  · A full-width button with a danger border and danger text, showing a LIVE COUNTDOWN:
    "Geri al · 47 sn"  — the window is 60 seconds. Also design the expired variant where
    the button is replaced by a monospaced 11px text-muted line: "Geri alma süresi
    doldu".
  · A full-width solid accent button, display face bold 18px: "Sıradaki"

BELOW ALL STATES · TODAY'S SUMMARY, separated by a hairline top rule:
  micro-label "BUGÜN"; a row with a monospaced bold 30px accent tabular "14" next to
  14px text-muted "kupon · 620 TL"; then a small list of rows, reward name on the left
  in 13px text-muted and a monospaced tabular count on the right.
  Empty variant: 14px text-muted "Bugün henüz kupon kullanılmadı."
A plain underlined text-muted 13px button at the very bottom: "Vardiyayı kapat"

No navigation menu, no tabs, no settings icon anywhere on this screen.
All quoted text is Turkish final copy — do not translate.
```

| Dokunulan | Ne olur |
|---|---|
| QR okut | C3 kamera |
| Kontrol et | C4 (geçerli) veya C5 (geçersiz) |
| ONAYLA | C6 — bütçeden düşer, denetim izine yazılır |
| Geri al · n sn | 60 sn içinde: onay iptal, C5 bilgi kutusu |
| Sıradaki | C2'ye döner |
| Vardiyayı kapat | `/kasa/giris` (C1) |

---

### D1 · İşletme başvurusu — `/kafe/basvuru`

**Kim:** kafe sahibi · **Yüzey:** işletme (belge dili) · **Nereden:** A1, D3

```
Screen: "İşletme başvurusu" — the café application form.
BUSINESS surface: same palette, but restrained and documentary. Tables, hairlines,
aligned numbers. NO EMOJI. No decorative accents.
Max-width 512px, 20px side padding on mobile / 32px on desktop, 40px top.

1. Header block with a bottom hairline and 24px bottom padding: a micro-label
   "LOOPLY", then H1 display face, BOLD (not extrabold) ~30px "İşletme başvurusu",
   then a 15px text-muted paragraph: "Vergi levhanla başvur. Ücretsiz — onaylanana
   kadar hiçbir karekod üretilmez."
2. Form fields. Business-style field: a 13px SEMIBOLD label above (not a micro-label —
   business screens use sentence-case bold labels), an input on a raised white surface
   with a hairline border, 16px text, 16px/12px padding. Hints under the input in 12px
   text-muted.
   · "İşletme adı"    hint "Müşterinin gördüğü ad"
   · "Ticari unvan"   hint "Vergi levhasındaki tam unvan"
   · Two side by side: "Vergi numarası" and "Şehir"
   · "Açık adres" — a 3-row textarea
   · Two side by side: "Yetkili adı soyadı" and "Yetkili cep telefonu"
     (placeholder "0532 123 45 67", hint "Panele bu numarayla girilir")
   · "Vergi levhası veya işletme belgesi" — a file input whose button is a solid neutral
     dark rectangle with light 13px text; hint "PDF, JPG veya PNG · en fazla 8 MB ·
     şifreli saklanır"
3. A hairline divider, then a full-width primary button: solid, display face bold 16px,
   14px vertical padding: "Başvuruyu gönder"
4. Error variants: field border turns danger with a 13px danger message under it; a
   form-level alert is a box with a hairline danger border.

All quoted text is Turkish final copy — do not translate.
```

---

### D2 · Başvuru alındı

```
Screen: "Başvuru alındı" — the confirmation state replacing the form on the same page.
BUSINESS surface, same page frame as D1.

1. An info alert: a box with a hairline border on a raised surface, 14px text:
   "Başvurun alındı. Belgeni inceleyip yetkili numarana bilgi vereceğiz."
   The words "Başvurun alındı." are bold.
2. A raised card with a hairline border, 20px padding:
   H2 display face, bold 18px "Bundan sonra ne olacak", then a numbered list, 14px
   text-muted, 1.6 line-height, where each number is bold:
   1. "Yüklediğin belgeyi inceliyoruz."
   2. "Onaylanınca yetkili numarasına giriş bilgisi gönderiyoruz."
   3. "Panelden haftalık bütçeni ve ödül listeni kuruyorsun."
   4. "Masa karekodların üretiliyor."
   Then a hairline and a 13px text-muted closing line: "Onay tamamlanmadan hiçbir
   karekod üretilmez ve müşterine kupon dağıtılmaz."

No success illustration, no checkmark graphic, no confetti.
All quoted text is Turkish final copy — do not translate.
```

---

### D3 · İşletme girişi — `/kafe/giris`

```
Screen: "İşletme girişi" — manager OTP login. BUSINESS surface, max-width 512px.
Identical structure to D1's header pattern.

Header: micro-label "LOOPLY", H1 "İşletme girişi", subtitle "Başvuru sırasında
verdiğin yetkili numarasıyla gir."

Two states of one form:
  STEP 1: label "Yetkili cep telefonu", hint "Başvuruda bildirdiğin numara",
          placeholder "0532 123 45 67"; primary button "Doğrulama kodu gönder"
  STEP 2: label "Doğrulama kodu", a wide centered monospaced 24px input with 0.4em
          letter-spacing and placeholder "——————", hint "0532 *** ** 67 numarasına
          gönderildi"; primary button "Doğrula ve gir"; under it a plain underlined 13px
          text-muted button "Numarayı değiştir"

Footer, above a hairline: an underlined 14px link "Henüz başvurmadın mı? İşletme
başvurusu"

Note for the unregistered-number case: the screen still advances to STEP 2 and shows
no error. Do not design a "bu numara kayıtlı değil" message — that leak is deliberate.
All quoted text is Turkish final copy — do not translate.
```

| Dokunulan | Nereye gider |
|---|---|
| Doğrula ve gir | `/kafe/panel` (D4) |
| İşletme başvurusu | `/kafe/basvuru` (D1) |

---

### D4 · İşletme paneli — `/kafe/panel`

```
Screen: "İşletme paneli" — the café dashboard. BUSINESS surface, max-width 896px,
20px side padding on mobile / 32px on desktop. Reads like an invoice.

1. Header block with a bottom hairline: micro-label "İŞLETME PANELİ", H1 display face,
   bold ~30px "Kahve Durağı", subtitle 15px text-muted "İstanbul".
2. SECTION "Kurulum durumu" — a section heading is 13px semibold with a 16px gap under
   it. A 3-column grid built from hairline gaps so the cells read as a ruled table.
   Each cell has a micro-label and a monospaced bold 24px tabular number:
   "MASA" 12 · "PERSONEL" 4 · "KAYITLI CİHAZ" 2
3. SECTION "Bu dönemin bütçesi" — a tappable outlined block:
   top row: micro-label "DAĞITILABİLİR" on the left, monospaced 12px text-muted on the
   right "2.400 TL taahhüt"
   then a monospaced bold ~30px tabular "1.150" followed by a small 13px "TL"
   then a monospaced 11px text-muted line: "820 TL açık kuponlarda · 430 TL kasada
   harcandı"
   Empty variant: a warning box with a hairline reward border, 14px text: "Henüz bütçe
   belirlemedin. Bütçe olmadan hiçbir ödül dağıtılamaz. Bütçeyi belirle" with the last
   three words underlined as a link.
4. SECTION "Kurulum" — a ruled list, rows divided by hairlines with rules above and
   below the whole list. Each row: a 15px semibold title with a 13px text-muted
   description under it, and a status badge on the right. A badge is a small outlined
   box with 10px monospaced uppercase text, 8px/3px padding — "açık" in neutral,
   "yakında" muted at 55% opacity.
   Rows, in this exact order:
   · "Personel ve PIN"     / "Kasiyer hesabı aç, PIN ver, kasa cihazını kaydet"
   · "Haftalık bütçe"      / "En az 1.500 TL — kullanılmayan kuponun maliyeti yok"
   · "Ürünler"             / "Menün — ödüllerin ve kampanyaların dayanağı"
   · "Ödül kataloğu"       / "Ürün ödülü ve TL tavanlı indirim kuponu"
   · "Ürün kampanyaları"   / "Yüzde indirimi — tavan, adet ve süre limitiyle"
   · "Masa karekodları"    / "Masalara yapıştırılacak kodlar"           badge "yakında"
   · "Raporlar"            / "Gelen nitelikli oyuncu, fiilen kullanılan indirim, hangi
                              saat doluyor"
5. A footer above a hairline: an underlined 14px text-muted "Çıkış yap".

No sidebar, no icons, no dashboard widgets, no charts on this screen.
All quoted text is Turkish final copy — do not translate.
```

| Dokunulan | Nereye gider |
|---|---|
| Bütçe bloğu / Haftalık bütçe | `/kafe/panel/butce` (D5) |
| Personel ve PIN | `/kafe/panel/personel` (D9) |
| Ürünler | `/kafe/panel/urunler` (D6) |
| Ödül kataloğu | `/kafe/panel/oduller` (D7) |
| Ürün kampanyaları | `/kafe/panel/kampanyalar` (D8) |
| Raporlar | `/kafe/panel/rapor` (D10) |
| Masa karekodları | Henüz yok (D11) |
| Çıkış yap | `/kafe/giris` (D3) |

---

### D5 · Haftalık bütçe — `/kafe/panel/butce`

```
Screen: "Haftalık bütçe". BUSINESS surface, max-width 896px.

Header: micro-label "İŞLETME PANELİ", H1 "Haftalık bütçe", subtitle "Kullanılmayan
kuponun maliyeti yok."

1. SECTION "Bu dönem", with a 13px text-muted sub-line: "24 Ağustos – 30 Ağustos ·
   7 gün". Inside a hairline border:
   · a 4-column ruled grid (2 columns on mobile) of number cells, each with a
     micro-label and a monospaced bold 24px tabular value plus a small "TL":
     "DAĞITILABİLİR" 1.150 (full-strength text) · "AÇIK KUPONLARDA" 820 (muted) ·
     "KASADA HARCANAN" 430 (muted) · "BÜTÇEYE DÖNEN" 0 (muted)
   · directly under the grid, a single 8px-tall stacked bar spanning the full width on
     a neutral track: a full-strength segment for "kasada harcanan" and a
     reward-colored segment for "açık kuponlarda". No legend, no labels on the bar.
   · a footer row inside the border, 13px text-muted: "Taahhüt 2.400 TL" on the left
     (the number bold) and "Alt sınır 1.500 TL" on the right.
2. SECTION "Bütçeyi güncelle" with the sub-line: "Dağıtılmış kuponların altına
   indirilemez — verilen söz geri alınmaz."
   A form: label "Haftalık taahhüt (TL)", a monospaced input, a hint "En az 1.500 TL",
   a primary button "Kaydet".
   First-time variant: heading "Bütçeyi belirle" with the sub-line "Bütçe, sisteme
   yatırdığın para değil; dağıtacağını taahhüt ettiğin kendi ürününün değeri."
   Error variant under the input, 13px danger: "Bütçe 1.500 TL'nin altına indirilemez."
3. SECTION "Nasıl işliyor" — a numbered list where the number is a monospaced 11px
   text-muted glyph in its own column, the step title is 14px bold, and the body is
   14px text-muted:
   1. "Kupon verildi" — "Tutar açık kuponlara geçer, dağıtılabilir bütçe azalır. Henüz
      hiçbir şey ödemedin."
   2. "Kasiyer onayladı" — "Tutar kasada harcanana geçer. Ödediğin an burasıdır."
   3. "Süresi doldu ya da iptal edildi" — "Tutar bütçeye döner ve o kadar yeni kupon
      çıkabilir."
4. An underlined 14px text-muted link: "Panele dön"

All quoted text is Turkish final copy — do not translate.
```

---

### D6 · Ürünler — `/kafe/panel/urunler`

```
Screen: "Ürünler" — the café's menu. BUSINESS surface, max-width 896px.

Header: micro-label "İŞLETME PANELİ", H1 "Ürünler", subtitle "Ödüllerin ve
kampanyaların dayanağı."

1. SECTION "Yeni ürün" — an inline add form inside a raised card with a hairline
   border, 20px padding: two fields side by side, "Ürün adı" and "Fiyat (TL)", plus a
   primary button "Ekle".
2. SECTION "Menü · 8 aktif" — a ruled list. Each row: product name in 15px semibold
   with a monospaced 12px text-muted tabular price line under it ("45 TL"); on the
   right a small outlined text button "Kaldır" (or "Geri al" for inactive rows), and
   for inactive rows a "kullanımda değil" badge plus the whole row at 55% opacity.
3. Empty state, 14px text-muted: "Henüz ürün yok. Ödül tanımlayabilmek için önce
   menünü gir."
4. Bottom link "Panele dön".

All quoted text is Turkish final copy — do not translate.
```

---

### D7 · Ödül kataloğu — `/kafe/panel/oduller`

```
Screen: "Ödül kataloğu". BUSINESS surface, max-width 896px.

Header: micro-label "İŞLETME PANELİ", H1 "Ödül kataloğu", subtitle "Oyuncunun puanıyla
alabileceği şeyler."

1. Optional warning box at the top — hairline reward border, 14px: "Henüz ürün
   girmemişsin. Ödül tanımlayabilirsin ama ürüne bağlamak raporları çok daha anlamlı
   yapar. Ürünler"  — the last word underlined as a link.
2. SECTION "Yeni ödül" — a raised card with a hairline border, 20px padding, containing
   a form with a type selector rendered as TWO RADIO CARDS side by side (hairline
   border; when selected, a full-strength border and a sunk fill — never a rounded
   segmented control):
   · "Ürün ödülü"        / "Menüden bir ürün, TL değeriyle"
   · "İndirim kuponu"    / "Yüzde indirim, TL tavanıyla"
   Then fields: "Başlık", "Ürün" (select), "Maliyet (TL)", "Puan fiyatı", and a
   checkbox "Puan istemez (anlık ödül)". Primary button "Ödülü ekle".
3. SECTION "Katalog · 6 yayında" — a ruled list. Each row:
   · title line: a small glyph "🏆" or "🎟️" then the title in 15px semibold, then
     optional badges "anlık" and "yayında değil"
   · a monospaced 12px text-muted tabular meta line: "45 TL · 6.000 puan · Filtre
     kahve"  (percentage variant: "%20 · en fazla 60 TL · puan istemez")
   · a 12px text-muted proof-level sentence, written in plain language, NEVER as a code
     like "K3":
       "Konumu doğrulanmış oyunculara verilir"
       "Masada en az beş dakika kalmış oyunculara verilir"
       "Fiş kodu girilmiş oyunculara verilir"
   · on the right, a small outlined text button "Yayından kaldır" / "Yayına al"
   Inactive rows render at 55% opacity.
4. Empty state, 14px text-muted: "Katalog boş. Oyuncular puan biriktiriyor ama
   harcayacakları bir şey yok."
5. Bottom link "Panele dön".

The two emoji glyphs here are the ONLY pictorial marks allowed on a business screen,
and only inside this list. Everywhere else on business screens: no emoji.
All quoted text is Turkish final copy — do not translate.
```

---

### D8 · Ürün kampanyaları — `/kafe/panel/kampanyalar`

```
Screen: "Ürün kampanyaları". BUSINESS surface, max-width 896px.

Header: micro-label "İŞLETME PANELİ", H1 "Ürün kampanyaları", subtitle "Boş saatini
doldur, istediğin ürünü sattır."

1. SECTION "Yeni kampanya" with the sub-line: "TL tavanı, günlük adet ve süre — üçü de
   zorunlu. Yüzde tek başına açık uçlu bir borçtur."
   A raised card with a hairline border: a "Ürün" select, then a 4-field grid —
   "Yüzde", "TL tavanı", "Günlük adet", "Bitiş tarihi" — plus an optional "Toplam adet"
   and a primary button "Kampanyayı oluştur".
2. SECTION "Kampanyalar · 2 yayında" — a ruled list. Each row:
   · title line: "Tiramisu · %10" in 15px semibold plus a status badge — "yayında"
     (neutral border), "duraklatıldı" (reward border), "taslak" / "bitti" (muted at
     55%)
   · a monospaced 12px text-muted tabular line: "en fazla 25 TL · günde 20 adet ·
     toplam 100 · 3 Eylül tarihine kadar"
   · a LIVE COUNTER block: a row with "Bugün 7/20" on the left and "toplam 43" on the
     right in monospaced 11px text-muted, then a 4px bar on a neutral track with a
     full-strength fill.
   · on the right, small outlined text buttons "Duraklat" / "Sürdür" and "Bitir".
   Ended rows render at 55% opacity.
3. Empty state, 14px text-muted: "Henüz kampanya yok."
4. Bottom link "Panele dön".

All quoted text is Turkish final copy — do not translate.
```

---

### D9 · Personel ve cihazlar — `/kafe/panel/personel`

```
Screen: "Personel ve cihazlar". BUSINESS surface, max-width 896px.

Header: micro-label "İŞLETME PANELİ", H1 "Personel ve cihazlar", subtitle "Kasada
kupon onaylayacak kişileri ve cihazları buradan yönetirsin."

1. SECTION "Kasiyerler" with a long sub-line, 15px text-muted: "Kasiyer telefonla değil
   PIN'le giriyor — vardiya değişiminde SMS beklemek gerçekçi değil. PIN yalnızca
   aşağıda kayıtlı cihazlarda çalışır ve 90 günde bir değiştirilmelidir."
   A ruled list of staff rows: name in 15px semibold, a monospaced 11px text-muted line
   under it ("PIN 12 gün önce değiştirildi"), and on the right small outlined text
   buttons "PIN yenile" and "Kapat". A row whose PIN is overdue shows a reward-bordered
   badge "PIN eskidi".
   Empty state — an outlined box with centered 14px text-muted text: "Henüz kasiyer
   eklenmedi. Kupon onaylanabilmesi için en az bir kasiyer gerekiyor."
   Then a raised card with a hairline border, 20px padding: H3 15px semibold "Kasiyer
   ekle", a field "Ad soyad", and a primary button "Ekle".
   Also design the PIN-reveal state: after adding, the card shows a micro-label
   "YENİ PIN" and a monospaced bold ~30px tabular "4821" with a 12px text-muted warning
   "Bu PIN bir daha gösterilmez. Kasiyere şimdi ver."
2. SECTION "Kayıtlı cihazlar" with the sub-line: "PIN yalnızca bu cihazlarda çalışır.
   Kayıtlı olmayan bir telefondan PIN denemek işe yaramaz."
   A ruled list: device label on the left in 15px, a monospaced 11px text-muted date on
   the right. Empty state: "Kayıtlı cihaz yok. Kasada kullanacağın tableti veya telefonu
   kaydet."
   A raised card: H3 "Bu cihazı kaydet", a 13px text-muted line "Kasada kullanacağın
   cihazdan bu sayfayı aç ve kaydet.", a field "Cihaz adı", a primary button "Kaydet".
3. SECTION "Yöneticiler" — a ruled list: name in 15px semibold, a masked phone in
   monospaced 11px text-muted under it ("0532 *** ** 01"), and a badge "yönetici" on
   the right.
4. Bottom link "← Panele dön".

All quoted text is Turkish final copy — do not translate.
```

---

### D10 · Rapor — `/kafe/panel/rapor`

**Kafenin ödediği şeyin kanıtı.** Ekranın en üstünde nitelikli oyuncu var; geri kalan
her sayı onu açıklıyor.

```
Screen: "Rapor" — the café's weekly proof-of-value report. BUSINESS surface,
max-width 896px. This screen must read like an audited statement — it is the single
most important screen for the paying customer, so the typography and alignment here
have to be flawless.

Header: micro-label "İŞLETME PANELİ", H1 "Rapor", subtitle "24 Ağustos – 30 Ağustos".

1. TABS — two text tabs on a hairline bottom border, no pills: "Bu hafta" (active: a
   2px full-strength bottom border, semibold) and "Geçen hafta" (muted, transparent
   border).
2. SECTION "Kafene gelen oyuncu" with the sub-line: "Looply üzerinden gelip oyunu
   tamamlayan, konumu doğrulanmış müşteriler."
   · A hero block with a hairline border, 20px/24px padding: micro-label "NİTELİKLİ
     OYUNCU", then a monospaced BOLD ~48px tabular number "127", then a 13px text-muted
     paragraph: "Günde bir kez, cihaz başına sayılır. Aynı müşterinin ikinci oyunu
     tekrar sayılmaz — bu sayı ziyaret sayısı değil, gelen kişi." with "gelen kişi" in
     bold.
   · Under it, a 3-column ruled grid of smaller number cells: "TEKİL OYUNCU" 98 ·
     "TAMAMLANAN OYUN" 412 · "VERİLEN KUPON" 63
3. SECTION "İndirim" with the sub-line: "Kazanılan ile kullanılan ayrı sayılır —
   ödediğin yalnızca ikincisi."
   Two ruled cells side by side, and the SECOND must read as the heavier one:
   · "KAZANILAN" — monospaced bold 24px in MUTED text, "2.180 TL", then a 12px
     text-muted line "Dağıtılan 63 kuponun toplam değeri"
   · "KASADA KULLANILAN" — monospaced bold 24px in FULL-STRENGTH text, "740 TL", then
     "41 kupon · ödediğin tutar" with "ödediğin tutar" in bold
4. SECTION "Hangi saat doluyor" with the sub-line: "Boş saatini doldurma iddiasının
   kanıtı burada."
   A horizontal bar list: each row is a monospaced 11px text-muted time label in a 48px
   column ("14:00"), then a 12px-tall bar on a neutral track with a full-strength fill,
   then a right-aligned monospaced 11px tabular count in a 40px column.
   Empty variant: "Bu dönemde henüz oyun oynanmadı."
5. SECTION "Masa hareketi" — a ruled list: table name in 15px semibold on the left, a
   monospaced 12px text-muted line on the right "18 oyuncu · 44 oyun".
   Empty variant: "Henüz masa hareketi yok."
6. SECTION "Kampanya sonuçları" — a ruled list: "Tiramisu · %10" in 15px semibold with
   a status badge, then a monospaced 12px text-muted line "20 verildi · 14 kullanıldı ·
   310 TL".
7. SECTION "Doğrulama defteri" with the sub-line: "Sayımızı satır satır
   denetleyebilirsin. Denetlenemeyen bir sayı, iddiadan ibarettir."
   A real data table, horizontally scrollable on mobile, with a hairline header border
   and hairline dividers between rows. Header cells are monospaced 10px uppercase
   text-muted with wide tracking.
   Columns: "Müşteri" · "Zaman" · "Masa" · "Kanıt" · "Oyun"
   A row: "K-4821" monospaced · "26 Ağu 14:32" muted tabular · "Masa 3" · a badge
   "nitelikli" or a monospaced 11px text-muted "K1" · a tabular count "3".
   Under the table, 12px text-muted: "Müşteriler işletmene özel anonim kodla görünür.
   Ad, soyad ve telefon Looply'de kalır, hiçbir ekranda gösterilmez."
   Where a count is below the privacy threshold, the cell shows "<5" instead of a
   number — design at least one such cell.
8. SECTION "Dışa aktar" — an outlined button "CSV indir" and a 13px text-muted line
   "Bu dönemin doğrulama defteri, masa hareketi ve kampanya sonuçları."
9. Bottom link "Panele dön".

ABSOLUTE RULE: no name, no surname, no phone number, no avatar, no map pin, no
individual customer profile anywhere on this screen. Customers exist here only as
per-café anonymous codes.
All quoted text is Turkish final copy — do not translate.
```

| Dokunulan | Ne olur |
|---|---|
| Bu hafta / Geçen hafta | Aynı ekran, dönem değişir |
| CSV indir | Dosya iner, denetim izine yazılır |
| Panele dön | `/kafe/panel` (D4) |

---

### D11 · Masa karekodları — `/kafe/panel/masalar` *(henüz yazılmadı)*

```
Screen: "Masa karekodları" — printable table QR codes. BUSINESS surface, max-width 896px.

Header: micro-label "İŞLETME PANELİ", H1 "Masa karekodları", subtitle "Masalara
yapıştırılacak kodlar. Kod basılıdır ve değişmez."

1. SECTION "Masalar" — a ruled list: table label in 15px semibold ("Masa 3"), a
   monospaced 11px text-muted line under it, and on the right small outlined text
   buttons "Yazdır" and "Kapat".
   An inline add form: a field "Masa adı" and a primary button "Masa ekle".
2. SECTION "Yazdırılabilir sayfa" — a preview of the print sheet: a grid of cards on
   white, each holding a black QR on white with 16px padding, the café name in
   monospaced 10px uppercase above it, the table label in the display face, bold 18px
   below it, and a 12px text-muted line "Okut, oyna, kazan." An outlined button
   "Yazdırma sayfasını aç".
3. A 13px text-muted note: "Karekod masaya özeldir ve tahmin edilemez. Fotoğrafı
   paylaşılsa bile oyuncunun konumu kafede değilse kazanım açılmaz."
4. Bottom link "Panele dön".

All quoted text is Turkish final copy — do not translate.
```

---

### E1 · Platform girişi — `/platform/giris`

```
Screen: "Platform girişi". BUSINESS surface, max-width 512px.
Identical structure to D3 (two-step OTP), with:
  header micro-label "LOOPLY", H1 "Platform girişi",
  subtitle "Yalnızca platform ekibi. Yetkili numaranla gir."
  field label "Cep telefonu"
No application link in the footer. Nothing else on the page.
All quoted text is Turkish final copy — do not translate.
```

---

### E2 · İşletme başvuruları — `/platform/basvurular`

```
Screen: "İşletme başvuruları" — manual café approval queue. BUSINESS surface,
max-width 896px.

Header: micro-label "PLATFORM · YÖNETİCİ" (support variant: "PLATFORM · DESTEK"),
H1 "İşletme başvuruları", subtitle "Onaylanmadan hiçbir kafe karekod üretemez, kupon
dağıtamaz."

1. SUPPORT-ROLE WARNING (variant): a box with a hairline reward border, 14px: "Destek
   rolündesin: başvuruları görebilirsin ama karara bağlayamazsın. Onay yetkisi yalnızca
   yöneticidedir."
2. TABS on a hairline bottom border: "Bekleyen" (active) · "Onaylı" · "Reddedilen".
3. APPLICATION CARDS, 20px apart. Each is a raised card with a hairline border:
   · header strip with a bottom hairline, 20px/16px padding: café name in the display
     face, bold 20px on the left, "Kahve Durağı A.Ş. · İstanbul" in 13px text-muted
     under it, and a status badge on the right — "bekliyor" (reward border), "onaylı"
     (neutral border), "reddedildi" (danger border)
   · a definition list with hairline dividers: label in 13px text-muted on the left,
     right-aligned 14px value:
       "Yetkili" → "Mert Aydın"
       "Telefon" → "0532 *** ** 01" — for the admin role, a small outlined text button
         "Tam numarayı aç" next to it; for the support role, a monospaced 10px
         text-muted note under the masked number: "tam numarayı yalnızca yönetici
         açabilir"
       "Adres"   → the full address
       "Başvuru" → "24 Ağustos 14:12"
       "Belge"   → "vergi-levhasi.pdf (412 KB)" with a monospaced 10px note
         "şifreli saklanır"
   · a decision strip on a sunk background with a top hairline, admin only: a primary
     button "Onayla", an outlined button "Reddet", and a "Ret gerekçesi" text field that
     appears when Reddet is chosen. Also design a confirm state inline: "Kahve Durağı
     onaylanacak. Onaylanınca yetkili numarasına giriş bilgisi gider." with "Vazgeç" and
     "Evet, onayla".
4. Empty state — an outlined box, centered 15px text-muted: "Bu listede başvuru yok."
5. A footer above a hairline: underlined 14px text-muted "Çıkış yap".

All quoted text is Turkish final copy — do not translate.
```

| Dokunulan | Ne olur |
|---|---|
| Sekmeler | Liste filtrelenir |
| Tam numarayı aç | Numara açılır, denetim izine yazılır (yalnız yönetici) |
| Onayla / Reddet | Kafe durumu değişir, yetkiliye SMS gider |

---

### E3 · Acil durdurma — `/platform/acil`

```
Screen: "Hasarı durdur" — the emergency kill-switch console. BUSINESS surface,
max-width 896px. Deliberately plain and single-page: during an incident nobody should
hunt for a tab or remember the right menu.

Header: micro-label "PLATFORM · ACİL DURDURMA", H1 "Hasarı durdur", subtitle "Dördü de
geri alınabilir ve her kullanım denetim izine düşer."

1. Warning boxes at the top, stacked:
   · support role, reward border: "Destek rolündesin: durumu görebilirsin ama durdurma
     yapamazsın. Acil durdurma yetkisi yalnızca yöneticidedir."
   · active stop, DANGER border: "Şu an açık bir durdurma var. Sistem yarı kapalı
     çalışıyor — sorun çözüldüyse geri açmayı unutma."
   · suspended cafés, reward border: "2 kafe askıda. Askıdaki kafede karekod
     çözülmüyor, panel açılmıyor, kupon üretilmiyor."
2. SECTION "Akış durdurma" with the sub-line: "Mevcut kayıtlara dokunmaz; yalnızca yeni
   işlem üretimini keser."
   Three switch rows, each an outlined block, 20px/16px padding: a 15px semibold title,
   a 13px text-muted description, and on the right an action button — outlined neutral
   "Durdur" when running, solid DANGER "Açık — geri aç" when stopped. A stopped row also
   gets a 2px danger left rule.
   · "Kupon dağıtımını durdur" / "Dağıtılmış kuponlar kasada kullanılmaya devam eder,
     yenisi üretilmez. Bütçe sızıntısı şüphesinde ilk düğme bu."
   · "SMS'i durdur" / "Kayıt ve giriş durur; maliyet saldırısı kesilir."
   · "Oyunu durdur" / "Yeni oyun oturumu açılmaz. Skor doğrulamasında açık bulunduğunda
     kazanım üretimini keser."
3. SECTION "Kafeyi askıya al" with the sub-line: "O kafede karekod, kupon ve panel —
   hepsi durur. Diğer kafeler etkilenmez."
   A café select and an outlined danger button "Askıya al", plus a ruled list of
   currently suspended cafés with a "Geri aç" button on each.
4. SECTION "Tüm oturumları iptal et" with the sub-line: "Çalınan cihaz, sızdırılmış
   çerez, ayrılan personel — herkes çıkar."
   A monospaced line "412 açık oturum" and a solid DANGER button "Tüm oturumları iptal
   et", plus an inline confirmation: "412 oturum kapanacak. Herkes yeniden giriş yapmak
   zorunda kalır." with "Vazgeç" and "Evet, iptal et".
5. A closing note: 2px neutral left border, 16px padding, 13px text-muted: "Bu ekran
   hasarı durdurur, olayı çözmez. KVKK bildirim süresi 72 saat."

The danger color is used ONLY on this screen among the business screens, and only on
destructive controls and active-stop indicators.
All quoted text is Turkish final copy — do not translate.
```

---

### F1 · Aydınlatma metni — `/aydinlatma` *(2026-08-26'da yazıldı)*

> `app/src/app/giris/form.tsx` içinde bu adrese bağlantı verilmiş ama sayfa henüz
> yazılmadı. Kayıt akışının zorunlu onay kutusu buraya bakıyor — tasarımı gerekli.

```
Screen: "Aydınlatma metni" — the KVKK privacy notice, opened in a new tab from the
registration consent checkbox. Player surface, since the player reaches it from the
player flow. Max-width 448px, 20px side padding, generous vertical rhythm.

1. Heading block: accent micro-label "KVKK", H1 "Aydınlatma metni", then a monospaced
   10px text-muted line: "Son güncelleme 26 Ağustos 2026".
2. A long-form reading layout: H2 headings in the display face, bold 18px with 32px
   space above, body in the text face 15px text-muted with 1.7 line-height, and lists
   using simple bullets. Section headings:
   "Hangi verileri işliyoruz" · "Neden işliyoruz" · "Kimlerle paylaşıyoruz" ·
   "Ne kadar saklıyoruz" · "Haklarınız" · "Bize nasıl ulaşırsınız"
3. A callout box for the key promise: hairline accent border, 14px text: "Telefon
   numaran şifreli saklanır ve üye işletmelerle paylaşılmaz. Kafeler seni yalnızca sana
   özel anonim bir kodla görür."
4. An underlined accent 14px link at the bottom: "← Geri dön"

Body copy is placeholder Turkish legal text — the layout is what matters here.
All quoted text is Turkish final copy — do not translate.
```

**Kodda:** `app/src/app/aydinlatma/page.tsx`. Gövde metni bu tasarımdan alındı ve
**hukuk incelemesinden geçmedi** — `docs/05` S20 olarak açık duruyor.

---

### G · İleri faz ekranları *(karar verildi, henüz sıraya girmedi)*

Bunlar `docs/02-karar-defteri.md`'de kabul edilmiş ama kodda yok. Stitch'e ancak
yukarıdaki 31 ekran bittikten sonra ver.

| Kod | Ekran | Karar |
|---|---|---|
| G1 | Davet ekranı — davet kodu, kimler geldi, kazanılan XP | Faz 9, Ü20 |
| G2 | Masayı Fethet — masa bazlı sıralama tablosu | Ö1 kabul |
| G3 | Masa oyunu — aynı masadaki oyuncular takım | Ö2 kabul |
| G4 | Happy Hour havuzu — görünür TL havuzu, geri sayım | Ö3 kabul, havuz olarak |
| G5 | Fiş kodu girişi — K4 kanıt seviyesi | A6, kasiyer kodu |

---

## 4 · Kırmızı çizgiler — her üretimden sonra kontrol et

Stitch bunları kendiliğinden ihlal ediyor. Üretilen her ekranı bu listeye karşı oku.

| # | Kural | Neden |
|---|---|---|
| 1 | **Oyuncunun kupon ekranında TL yok** | Kasiyer telefona bakıp ürün verirse sistem hiçbir şey görmez, bütçe dolu görünür, tüm raporlar yalan söyler |
| 2 | **Oyuncunun kupon ekranında "geçerlidir" damgası yok** | Süresi dolmuş kupon geçerli olanla aynı görünmeli; geçerlilik yalnızca kasa ekranında ortaya çıkar |
| 3 | **Kafe ekranlarında ad, soyad, telefon yok** | Kafeler oyuncuyu yalnızca kafeye özel anonim kodla görür; iki kafe verisini birleştirip aynı kişiyi izleyemez |
| 4 | **Palet dokuz renk, ekleme yok** | Ekran ekran üretildiği için Stitch her seferinde tema genişletmeye meyilli; yeşil "başarı" rengi, ikinci mavi, degrade eklenmez |
| 5 | **Vurgu rengi seyrek** | Her şey vurgulanırsa hiçbir şey vurgulanmamış olur; ekranın büyük kısmı beyaz ve gri kalmalı |
| 5b | **Üründe olmayan kavram uydurulmaz** | Gerçekleşti: Stitch oyun kategorisi, bekleyen kupona ilerleme çubuğu ve bildirim zili ekledi. Prompt neyi anlatıyorsa o çizilir; fazlası ürün kararı ihlali |
| 6 | **İşletme ekranlarında emoji yok** (tek istisna: ödül kataloğu satırı) | Kafe sahibi oyundan değil sonuçtan etkilenmeli; ekran muhasebe belgesi gibi okunmalı |
| 7 | **Alt gezinme üç durak** — dördüncüsü eklenmez | Oyuncunun kafede telefona bakarken vereceği karar sayısı sınırlı |
| 8 | **Renk tek başına anlam taşımaz** | Her renkli durumun yanında metin etiketi var |
| 9 | **Kamerasız yol eşit görünür** | iOS Safari QR okuyamıyor; 6 haneli kod bazı cihazlarda tek yol, "yedek" gibi görünemez |
| 10 | **Konum reddi hata değil** | Tarayıcıda konum kullanıcı tercihine bağlı; akış çökmez, yalnızca büyük ödüller kilitli kalır |
| 11 | **Native uygulama kabuğu yok** | Ü12: ürün web. Splash ekranı, app store rozeti, iOS status bar mockup'ı çizilmez |
| 12 | **Form girdileri 16px** | Küçüğü iOS Safari'de odaklanınca sayfayı zumluyor |
| 13 | **Sayılar monospace ve tabular** | Ürünün konusu sayı; sütunlarda kayan rakam raporu güvenilmez gösterir |
| 14 | **QR beyaz zemin üstünde** | Sayfa zemini açık olsa bile karekodun kendi beyaz sessiz alanı olmalı, yoksa okuyucu takılır |

---

## 5 · Stitch çıktısını koda taşırken

> ### ✅ Geçiş tamamlandı — 2026-08-26
>
> Aşağıdaki plan uygulandı: **49 dosya değişti, 1 dosya eklendi** (`/aydinlatma`),
> `npm run ci` yeşil (**210 test**). Ayrıntı ve geçişte bulunan iki hata:
> `16-faz8-kapi-raporu.md` §7.
>
> Plandan **sapılan üç yer**, gerekçeleriyle:
>
> | Plan | Yapılan | Neden |
> |---|---|---|
> | Alt gezinmede Material Symbols | **Elle çizilen üç SVG ikon** | İkon ailesi yalnızca `fonts.googleapis.com`'da; `next/font/google` tanımıyor. CDN'den çekmek oyuncunun hangi sayfayı ne zaman açtığını üçüncü tarafa sızdırırdı |
> | `--font-outfit` / `--font-mono` `<body>`de | **`<html>`de** | `@theme` bloğu `--font-body`yi `:root` üstünde tanımlıyor; değişken `<body>`de kalınca zincir kopuyor ve bütün metin Times'a düşüyor |
> | (planda yok) | **Mikro etiketler mono'dan Outfit 600'e** | Kilitli sistemde mono yalnızca sayıya ait. 84 yerde `.etiket-caps` (12/16 · 0.05em) |
>
> Ayrıca `.butce-bar` → **`.asil-serit`** oldu (adı da işini anlatsın diye) ve
> `.karo` gerçekten silindi — yerine düz kart yardımcı sınıflarla yazılıyor.

Bugünkü kod koyu çini paletine göre yazılmış. Açık palete geçiş **iki dosyada**
başlıyor, gerisi mekanik sınıf değişimi.

### 5.1 · Fontlar — `app/src/app/layout.tsx`

Bugün `Bricolage_Grotesque`, `Manrope` ve `Martian_Mono` yükleniyor (satır 2–26).
Üçü de gidiyor, yerine ikisi geliyor:

```ts
import { Outfit, JetBrains_Mono } from "next/font/google";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin", "latin-ext"],   // latin-ext şart: İ ı Ğ ğ Ş ş
  weight: ["400", "600", "700", "800"],
  display: "swap",
});

const mono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin", "latin-ext"],
  weight: ["500", "700"],
  display: "swap",
});
```

Bilgisayarına indirdiğin Outfit, **Stitch'te ve Figma'da tasarım yaparken** işine
yarayacak; uygulamada `next/font/google` fontu derleme sırasında kendi sunucumuza
indirip yerelden servis ediyor, yani CDN bağımlılığı ve `fonts.googleapis.com`
isteği doğmuyor. Ayrı bir kurulum gerekmiyor.

Aynı dosyada iki düzeltme daha:
`themeColor: "#0b1030"` → `"#FAFAFA"` · `maximumScale: 1` **silinecek**
(parmakla büyütmeyi kapatıyor).

### 5.2 · Renkler — `app/src/app/globals.css`

`@theme` bloğu baştan yazılıyor. Bugünkü on beş token dokuza iniyor:

| Stitch adı | Yeni token | Değer | Bugünkü karşılığı (silinecek) |
|---|---|---|---|
| `surface` | `--color-yuzey` | `#FFFFFF` | `--color-ink-raised` / beyaz kart |
| `surface-alt` | `--color-zemin` | `#FAFAFA` | `--color-ink` / `--color-paper` |
| `surface-sunk` | `--color-cukur` | `#F2F2F2` | `--color-ink-sunk` / `--color-paper-sunk` |
| `border-noble` | `--color-cizgi` | `#E5E5E5` | `--color-ink-line` / `--color-rule` |
| `text-charcoal` | `--color-yazi` | `#1F1F1F` | `--color-chalk` / `--color-graphite` |
| `text-muted` | `--color-yazi-sonuk` | `#6B6B6B` | `--color-chalk-dim` / `--color-graphite-dim` |
| `primary` | `--color-vurgu` | `#0B57D0` | `--color-turquoise` |
| `reward-gold` | `--color-odul` | `#D4AF37` | `--color-brass` |
| `reward-ink` | `--color-odul-koyu` | `#856612` | — (kontrast düzeltmesiyle geldi) |
| `danger-red` | `--color-tehlike` | `#D93025` | `--color-bole` |

> **Kontrast düzeltmesi — 2026-08-26.** İlk kilitli değerlerden ikisi sistemin
> kendi erişilebilirlik kuralını (4.5:1) tutturamıyordu: `#757575` sönük metin
> zeminde 4.41, çukurda 4.12'de kalıyordu; `#D4AF37` **metin olarak** beyazda
> 2.10'daydı. Sönük gri `#6B6B6B`'ye çekildi (en kötü hâl 4.76) ve altının
> yazı hâli için `#856612` eklendi (en kötü hâl 4.80). Altın çerçeve, dolgu ve
> asil şerit olarak `#D4AF37` kalıyor — ürünün tanınır rengi orada.
> `#D93025` değişmedi; yalnızca zemini değişti (çukur → yüzey).

`--color-cobalt` karşılıksız kalıyor — `.karo`'nun iç çerçevesi içindi, o bileşen
gidiyor.

**Sınıf değişiklikleri:**

- `.karo` (çift çerçeveli koyu karo) → **silinecek.** Yerine düz kart:
  `bg-yuzey border border-cizgi rounded-2xl`. `data-vurgu="pirinc"` /
  `="turkuaz"` nitelikleri kenarlık rengini değiştirmeye devam ediyor
  (`border-odul` / `border-vurgu`).
- `.butce-bar` (yatay çizgili) → **noble stripe'a dönüşecek:** `-45°`,
  `rgba(255,255,255,0.15)` 10px dolu / 10px boş, altında `bg-vurgu` veya `bg-odul`.
- `.gir`, `.nabiz`, `.patla`, `.oyun-alani`, `.tabular` → **kalıyor**, renkten
  bağımsızlar.
- Yuvarlatma geliyor: bugün her yer keskin köşe, artık kart 16px / düğme 8px /
  çip 4px.

### 5.3 · Dosyalar

Bileşenler yeniden yazılmaz, içi güncellenir:

| Dosya | İş |
|---|---|
| `src/components/ui.tsx` | Oyuncu parçaları — `girdiSinifi`, `Dugme`, `Uyari`, `Baslik`, `Sayfa`, `MasaKunyesi` |
| `src/components/isletme.tsx` | İşletme parçaları — kâğıt paleti artık ana paletle aynı, ayrım yoğunlukta kalıyor |
| `src/components/oyuncu-nav.tsx` | Emoji yerine Material Symbols, aktif durak `text-vurgu` |
| `src/components/karekod.tsx` | QR'ın beyaz sessiz alanı korunacak |
| `src/components/otp-giris.tsx` | Ortak OTP formu |

Sayfa dosyalarındaki sınıf adları (`bg-ink`, `text-chalk-dim`, `border-rule`…) toplu
değiştirilir. **208 test renkten ve sınıf adından bağımsız** — hiçbiri DOM sınıfı
sorgulamıyor, hepsi domain ve veritabanı seviyesinde. `npm run ci` bu geçişte de
yeşil kalmalı; kalmıyorsa bir yerde mantık kırılmış demektir.
