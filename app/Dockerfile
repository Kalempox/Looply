# ═══════════════════════════════════════════════════════════
# Looply — sunucu imajı (F3)
# ═══════════════════════════════════════════════════════════
#
# İki hedef üretiyor:
#
#   uygulama → çalışan sunucu. `.next/standalone` çıktısı; içinde yalnızca
#              gerçekten kullanılan node_modules dosyaları var.
#   araclar  → göç ve tohum için. Tam kaynak + tam bağımlılık; yalnızca
#              tek seferlik komutlarda `docker compose run` ile koşuyor.
#
# ── İkisi neden ayrı ────────────────────────────────────────
#
# Göçler `tsx` ile çalışıyor ve `src/db/migrations` ile `scripts/` klasörlerini
# istiyor; standalone çıktısında ikisi de yok. Hepsini tek imaja koymak,
# internete açık kaptaki saldırı yüzeyine tohum betiğini ve yönetici
# veritabanı istemcisini eklemek olurdu — tohum betiği canlıda çalıştırılmayı
# reddediyor ama orada durmasının da bir sebebi yok.

# ── Ortak taban ─────────────────────────────────────────────
FROM node:22-alpine AS taban
WORKDIR /app
# Next'in derleme sırasında Google Fonts indirmesi için sertifika gerekiyor
RUN apk add --no-cache ca-certificates
COPY package.json package-lock.json ./

# ── Bağımlılıklar ───────────────────────────────────────────
FROM taban AS bagimliliklar
RUN npm ci

# ── Derleme ─────────────────────────────────────────────────
FROM bagimliliklar AS derleme
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1

# ── 🔴 Derleme anındaki SAHTE değerler ──────────────────────
#
# Next, hata sayfasını (`/_not-found`) derleme sırasında önceden üretiyor ve
# bunun için kök `layout.tsx`i render ediyor. Layout `isDevelopment()`
# çağırıyor, o da `env()`e gidiyor ve `env()` eksik değişkende bilerek
# patlıyor (`lib/env.ts` — "hata erken ve gürültülü olmalı").
#
# Bu davranış Ü115'ten önce de vardı; yerelde `.env.local` durduğu için hiç
# görünmedi. Kapta o dosya yok, bu yüzden derlemeye geçici değerler veriliyor.
#
# Üç şey bunu güvenli kılıyor:
#
#   1. Değerler bu katmanda kalıyor. `uygulama` hedefi ayrı bir `FROM` ile
#      başlıyor, yani bu ENV satırları oraya TAŞINMIYOR. Çalışan kapta
#      yalnızca compose'un `env_file`'ından gelen gerçek değerler var.
#   2. Hiçbiri `NEXT_PUBLIC_` değil, yani tarayıcı paketine gömülmüyor.
#   3. `APP_ENV=production` bilerek: önceden üretilen hata sayfasında
#      geliştirme rozeti KAPALI çıksın. Demoda da canlıda da doğru olan bu.
#
# Anahtarlar çözüldüğünde "DERLEME-SAHTE-ANAHTAR-n" yazıyor; bir gün bir
# yerde karşılaşan kimse bunun gerçek sanmasın diye.
ENV APP_ENV=production
ENV SMS_PROVIDER=netgsm
ENV DATABASE_URL=postgresql://derleme:derleme@derleme-sahte:5432/derleme
ENV APP_DATABASE_URL=postgresql://derleme-app:derleme@derleme-sahte:5432/derleme
ENV PII_ENC_KEY=REVSTEVNRS1TQUhURS1BTkFIVEFSLTEuLi4uLi4uLi4=
ENV PHONE_INDEX_KEY=REVSTEVNRS1TQUhURS1BTkFIVEFSLTIuLi4uLi4uLi4=
ENV OTP_PEPPER=REVSTEVNRS1TQUhURS1BTkFIVEFSLTMuLi4uLi4uLi4=
ENV SESSION_HASH_KEY=REVSTEVNRS1TQUhURS1BTkFIVEFSLTQuLi4uLi4uLi4=
ENV IDENTIFIER_HASH_KEY=REVSTEVNRS1TQUhURS1BTkFIVEFSLTUuLi4uLi4uLi4=
ENV BACKUP_ENC_KEY=REVSTEVNRS1TQUhURS1BTkFIVEFSLTYuLi4uLi4uLi4=

RUN npm run build

# ── Çalışan sunucu ──────────────────────────────────────────
FROM node:22-alpine AS uygulama
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0

# Kök kullanıcı değil: kapta bir açık bulunursa dosya sistemine yazamasın.
RUN addgroup -g 1001 -S looply && adduser -u 1001 -S looply -G looply

# ⚠️ `public` ve `.next/static` standalone klasörüne KENDİLİĞİNDEN
# kopyalanmıyor (Next dokümanı, output.md). Kopyalanmazsa sayfa açılır ama
# bütün CSS ve görseller 404 döner — sessiz ve kafa karıştırıcı bir arıza.
COPY --from=derleme --chown=looply:looply /app/.next/standalone ./
COPY --from=derleme --chown=looply:looply /app/.next/static ./.next/static
COPY --from=derleme --chown=looply:looply /app/public ./public

# Kafe belgeleri (vergi levhası) şifreli olarak buraya yazılıyor —
# compose'da kalıcı bir hacim bağlanıyor, yoksa kap yenilenince kayboluyor.
RUN mkdir -p /app/belgeler && chown looply:looply /app/belgeler

USER looply
EXPOSE 3000
CMD ["node", "server.js"]

# ── Göç ve tohum araçları ───────────────────────────────────
FROM bagimliliklar AS araclar
WORKDIR /app
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
# Varsayılan komut yok: her zaman açıkça çağrılıyor
# (`docker compose run --rm araclar npm run db:migrate`).
CMD ["node", "-e", "console.log('Bu imaj komut bekler: npm run db:migrate | db:seed')"]
