---
name: Noble Café Loyalty
colors:
  surface: '#FFFFFF'
  surface-dim: '#dcd9d9'
  surface-bright: '#fcf9f8'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f6f3f2'
  surface-container: '#f0eded'
  surface-container-high: '#eae7e7'
  surface-container-highest: '#e5e2e1'
  on-surface: '#1b1b1c'
  on-surface-variant: '#424654'
  inverse-surface: '#303030'
  inverse-on-surface: '#f3f0ef'
  outline: '#737785'
  outline-variant: '#c3c6d6'
  surface-tint: '#0856cf'
  primary: '#0041a2'
  on-primary: '#ffffff'
  primary-container: '#0b57d0'
  on-primary-container: '#ced9ff'
  inverse-primary: '#b2c5ff'
  secondary: '#735c00'
  on-secondary: '#ffffff'
  secondary-container: '#fed65b'
  on-secondary-container: '#745c00'
  tertiary: '#802b00'
  on-tertiary: '#ffffff'
  tertiary-container: '#a83b00'
  on-tertiary-container: '#ffcfbe'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dae2ff'
  primary-fixed-dim: '#b2c5ff'
  on-primary-fixed: '#001847'
  on-primary-fixed-variant: '#0040a1'
  secondary-fixed: '#ffe088'
  secondary-fixed-dim: '#e9c349'
  on-secondary-fixed: '#241a00'
  on-secondary-fixed-variant: '#574500'
  tertiary-fixed: '#ffdbce'
  tertiary-fixed-dim: '#ffb599'
  on-tertiary-fixed: '#370e00'
  on-tertiary-fixed-variant: '#7f2b00'
  background: '#fcf9f8'
  on-background: '#1b1b1c'
  surface-variant: '#e5e2e1'
  surface-alt: '#FAFAFA'
  surface-sunk: '#F2F2F2'
  border-noble: '#E5E5E5'
  text-charcoal: '#1F1F1F'
  text-muted: '#757575'
  reward-gold: '#D4AF37'
  danger-red: '#D93025'
typography:
  display-lg:
    fontFamily: Outfit
    fontSize: 48px
    fontWeight: '800'
    lineHeight: 52px
    letterSpacing: -0.04em
  headline-md:
    fontFamily: Outfit
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 30px
    letterSpacing: -0.02em
  title-sm:
    fontFamily: Outfit
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
  body-md:
    fontFamily: Outfit
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 26px
  label-caps:
    fontFamily: Outfit
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.05em
  data-mono:
    fontFamily: JetBrains Mono
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 4px
  unit-1: 4px
  unit-2: 8px
  unit-3: 12px
  unit-4: 16px
  unit-6: 24px
  unit-8: 32px
  margin-mobile: 20px
  gutter-mobile: 12px
---

## Brand & Style

The design system is built on a foundation of "Açık ve Asil" (Light and Noble) aesthetics, specifically tailored for the Turkish café culture. It balances the playful nature of gamification with a sophisticated, professional execution that appeals to both high-end bistro owners and casual coffee drinkers.

The style is **Minimalist-Modern with Tactile Accents**. It relies on expansive whitespace, precision hairlines, and a rigorous typographic hierarchy to create a sense of order and premium quality. The "noble" feel is achieved through the use of high-value neutral tones contrasted against a singular, deep professional accent. 

The system adapts its "voice" through three distinct lenses:
- **PLAYER (Oyuncu):** Focuses on emotional reward, using larger typography and singular, impactful call-to-actions.
- **CASHIER (Kasiyer):** Prioritizes efficiency with high-contrast touch targets and information density designed for fast-paced environments.
- **BUSINESS (İşletme):** Adopts a "documentary" style—sober, grid-aligned, and focused on data integrity without decorative elements.

## Colors

The palette is anchored by **Pure White (#FFFFFF)** and **Off-White (#FAFAFA)** to maintain a clean, airy atmosphere. 

- **Primary (Accent):** A refined Blue (#0B57D0) representing professionalism and trust.
- **Secondary (Reward):** A Noble Gold (#D4AF37) used exclusively for points, bonuses, and achievement milestones (Ödüller).
- **Surface Sunk:** A soft grey used for input fields and background containers to provide subtle depth without heavy shadows.
- **Borders:** Extremely thin #E5E5E5 hairlines are the primary method of separation, ensuring the "noble" look remains sharp and unfussy.

## Typography

This design system uses **Outfit** for all prose and UI labels, capitalizing on its geometric clarity and modern feel.

- **Display & Titles:** Use ExtraBold weights with tight tracking (negative letter spacing) to create "noble" gravity.
- **Body Text:** Use Regular weight with a generous 1.6+ line-height to ensure readability and a "breathing" layout.
- **Numbers (Veriler):** Use **JetBrains Mono** for all numerical data in the Business and Cashier views. This ensures tabular alignment for prices, points, and timestamps.
- **Turkish Localization:** Ensure all instances use correct characters (İ, ı, Ğ, ğ, Ü, ü, Ş, ş, Ö, ö, Ç, ç).

## Layout & Spacing

The design system follows a strict **4px baseline grid**. 

- **Mobile-First:** Optimized for 390x844 (iPhone 14/15 size).
- **Margins:** A standard 20px (unit-5 equivalent) side margin for all screens.
- **Player View:** Uses dynamic, vertical stacks with large padding (unit-8) between sections to emphasize single actions.
- **Cashier View:** Uses a denser grid with unit-3 spacing to fit more items on screen, maintaining 44px minimum touch targets.
- **Business View:** Utilizes a structured, column-based layout reminiscent of a ledger or invoice.

## Elevation & Depth

This design system avoids traditional heavy dropshadows in favor of **Tonal Layering and Hairlines**.

- **Level 0 (Base):** #FAFAFA background.
- **Level 1 (Raised Cards):** Pure White (#FFFFFF) surfaces with a 1px solid border (#E5E5E5). No shadow.
- **Level 2 (Active/Interact):** Use a very soft, high-diffusion shadow (0px 4px 20px rgba(0,0,0,0.04)) only to indicate "lift" during a drag or a primary modal.
- **Inset (Sunk):** Used for input fields and progress bar tracks using #F2F2F2 with a subtle inner stroke.

## Shapes

The shape language is "Rounded" but controlled to maintain the "noble" character. 

- **Cards & Primary Containers:** 1rem (16px) corner radius.
- **Buttons & Chips:** 0.5rem (8px) corner radius for a more professional, architectural feel than full-pill shapes.
- **Signature Progress Bar:** Features a `45-degree striped fill` pattern within a "sunk" track to denote active progress/gamification points (Puanlar).

## Components

- **Buttons (Butonlar):** 
  - *Primary:* Deep Blue background, white text, Outfit Bold.
  - *Secondary:* White background, Noble Hairline border, Charcoal text.
  - *Reward:* Gold background, used only for "Claim" or "Redeem" actions.
- **Cards (Kartlar):** Always Pure White. Use a 1px #E5E5E5 border. For Player view, cards can include large-scale typography.
- **Input Fields (Giriş Alanları):** Background #F2F2F2, no border, 8px radius. Placeholder text in #757575.
- **Progress Bars (İlerleme Çubukları):** The track is #F2F2F2. The fill is Primary Blue or Reward Gold, featuring a subtle, repeating diagonal stripe pattern (Noble Stripe).
- **Chips (Etiketler):** Small, 12px semi-bold text with generous horizontal padding (12px) and 4px radius. 
- **Lists (Listeler):** In Business view, use JetBrains Mono for all numeric columns. Use hairline dividers between rows. No icons in Business view unless functional (e.g., status indicators).
- **Cashier Touch Grid:** Large square buttons (min 80x80px) for quick category selection, using high-contrast borders and large label sizes.