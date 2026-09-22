"use client";

/**
 * Kök düzenin hata sınırı — Ü253.
 *
 * `error.tsx` sayfaları koruyor ama **kök düzenin kendisi** çökerse o
 * da devre dışı kalıyor; bu dosya son basamak.
 *
 * ⚠️ Kendi `<html>` ve `<body>`sini yazmak zorunda: aktifken kök düzenin
 * yerine geçiyor, yani düzenin verdiği hiçbir şey (yazı tipi, jetonlar,
 * globals.css) burada yok.
 *
 * ⚠️ Bu yüzden stiller **satır içi**. Sınıf adları kullanılsaydı CSS
 * yüklenmediği durumda biçimsiz bir sayfa çıkardı ve zaten en kötü anda
 * olduğumuz için orada bir de okunmaz bir ekran göstermek istemiyoruz.
 */
export default function KokHatasi({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <html lang="tr">
      <body
        style={{
          margin: 0,
          minHeight: "100dvh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "ui-sans-serif, system-ui, sans-serif",
          background: "#faf9f7",
          color: "#1c1917",
        }}
      >
        <div style={{ maxWidth: 420, padding: 24, textAlign: "center" }}>
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>
            Uygulama açılamadı
          </h1>
          <p style={{ marginTop: 8, fontSize: 14, color: "#57534e" }}>
            Beklenmeyen bir hata oldu. Tekrar denemek çoğu zaman yetiyor.
          </p>
          {error.digest && (
            <p style={{ marginTop: 12, fontSize: 12, color: "#78716c" }}>
              Hata kodu: {error.digest}
            </p>
          )}
          <button
            type="button"
            onClick={() => retry()}
            style={{
              marginTop: 20,
              border: 0,
              borderRadius: 999,
              padding: "12px 22px",
              fontSize: 15,
              fontWeight: 600,
              color: "#fff",
              background: "#1b6ef3",
            }}
          >
            Tekrar dene
          </button>
        </div>
      </body>
    </html>
  );
}
