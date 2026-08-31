"use client";

import type { OyunEkraniProps } from "./ortak";
import { BlokEkrani } from "./blok-ekran";
import { KelimeEkrani } from "./kelime-ekran";
import { DusenEkrani } from "./dusen-ekran";

/**
 * Ekran kayıt defteri — motor tarafındaki `oyunlar/index.ts`'in aynadaki eşi.
 *
 * Yeni oyun eklemek: bir motor modülü, bir ekran bileşeni ve iki deftere
 * birer satır. Kabuk, oturum akışı, sunucu doğrulaması ve puan yazımı
 * değişmiyor — Faz 5'in dördüncü maddesindeki söz buydu.
 *
 * ── Neden harita değil `switch` ─────────────────────────────
 *
 * İlk hâli `Record<string, ComponentType>` idi ve bileşen çalışma zamanında
 * aranıyordu. React'in kuralı buna izin vermiyor: render sırasında **bileşen
 * tipi statik olmalı**. Dinamik tip her render'da farklı görünürse React alt
 * ağacı söker ve **oyun ortasında sıfırlanır** — girdi kaydıyla birlikte.
 *
 * `switch` bunu statik kılıyor. Maliyeti yine tek satır: yeni oyun bir
 * `case` ekliyor.
 */
export function OyunEkrani({ oyunId, ...props }: OyunEkraniProps & { oyunId: string }) {
  switch (oyunId) {
    case "blok":
      return <BlokEkrani {...props} />;
    case "kelime":
      return <KelimeEkrani {...props} />;
    case "dusen":
      return <DusenEkrani {...props} />;
    default:
      return <p className="text-tehlike">Bu oyunun ekranı bulunamadı.</p>;
  }
}

export type { OyunEkraniProps } from "./ortak";
