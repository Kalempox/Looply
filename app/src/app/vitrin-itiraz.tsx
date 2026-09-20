import { Beliren, Sirali } from "./vitrin-hareket";

/**
 * "Bunlar zaten aklında" — Ü200.
 *
 * ── 🔴 Vitrinin eksik olan sesi ─────────────────────────────
 *
 * Sayfa kafe sahibine **ürünü** anlatıyordu: şunu yapıyoruz, şu
 * çalışıyor, şu ölçülüyor. Ürün sahibinin gönderdiği örnekte ise
 * argüman başka bir yerden açılıyor — kafe sahibinin **kendi cevapsız
 * soruları** sıralanıyor:
 *
 *   *"Instagram reklamı verdin. Peki reklamdan sonra etkileşim devam
 *   ediyor mu?"*
 *
 * Ürün sahibi bunu *"müşteriye direkt iletişim"* diye adlandırdı ve
 * farkı doğru gördü: birinci ses satıcının, ikincisi okuyanın.
 *
 * ── Neden bölüm SORULARDAN oluşuyor ─────────────────────────
 *
 * Cevabı okuyan veriyor. "Ölçemiyorsun" demek bir iddia ve
 * işletmeciyi savunmaya geçiriyor; "ölçebiliyor musun?" diye sormak
 * aynı şeyi onun kendi ağzından söyletiyor. Aynı tercih sayfanın
 * sonundaki *"kullanmazsan ne kaybedersin"* bölümünde de var ve orada
 * gerekçesi yazılı.
 *
 * ⚠️ Rakip kötülenmiyor. "Instagram işe yaramaz" demek hem yanlış hem
 * de reklamını zaten veren kişiyi kaybetmek. Söylenen şey dar: reklam
 * gösterimi sayıyor, sonrasını saymıyor.
 *
 * ⚠️ Bölüm çözümü ANLATMIYOR, yalnızca soruları bırakıyor. Hemen
 * altında döngü bölümü geliyor ve cevap orası. Soruyu sorup aynı
 * kartta cevaplamak, sorunun ağırlığını kendi elinle almak olurdu.
 */

const SORULAR = [
  {
    ust: "Reklam verdin",
    soru: "Gelen kişiyi görüyorsun. Peki reklamdan sonra ne oluyor?",
    alt: "Gösterim sayısı elinde. Kaç kişinin kapıdan girdiği elinde değil.",
  },
  {
    ust: "Müşteri bugün geldi",
    soru: "Yarın tekrar gelmesi için elinde bir sebep var mı?",
    alt: "Kahven iyi olabilir. Ama hesabı ödeyip çıkan kişinin elinde geri dönmek için bir şey kalmıyor.",
  },
  {
    ust: "İndirim verdin",
    soru: "Bu indirimin ne kadarı gerçekten kullanıldı?",
    alt: "Kaç kupon dağıtıldı, kaçı kasada gösterildi, kim ikinci kez geldi — üçü de kayıtsız.",
  },
  {
    ust: "Yeni ürün çıkardın",
    soru: "Müşteriye söyleyebildiğin bir yer var mı?",
    alt: "Cheesecake, kurabiye, yeni içecek… Menüde duruyor ama masadaki kişiye ulaşan bir kanal yok.",
  },
];

export function VitrinItiraz() {
  return (
    <section className="bg-vitrin-fildisi py-20 sm:py-28">
      <div className="mx-auto w-full max-w-6xl px-5">
        <Beliren yon="olcek">
          <p className="etiket-caps text-yazi-sonuk">Sorun</p>
          <h2 className="mt-4 max-w-3xl font-display text-[clamp(30px,5vw,54px)] leading-[1.02] font-extrabold tracking-[-0.03em]">
            Müşterin geliyor.
            <br />
            <span className="text-vurgu">Peki sonra</span> ne oluyor?
          </h2>
          <p className="mt-6 max-w-xl text-[16px] leading-relaxed text-yazi-sonuk">
            Aşağıdakiler bizim iddiamız değil, muhtemelen senin zaten sorduğun
            sorular. Cevaplarını bilmiyorsan sorun kafende değil, kafeden sonra.
          </p>
        </Beliren>

        <Sirali adim={110} cocukSinifi="h-full" className="mt-12 grid gap-4 sm:grid-cols-2">
          {SORULAR.map((q) => (
            <div
              key={q.ust}
              className="h-full rounded-2xl border border-cizgi bg-yuzey p-7"
            >
              <p className="etiket-caps text-[10px] text-yazi-sonuk">{q.ust}</p>
              {/* ⚠️ Soru başlık boyutunda: kartın taşıdığı şey o, altındaki
                  cümle yalnızca bağlam. Ters olsaydı kart bir açıklama
                  paragrafı olurdu ve soru kaybolurdu. */}
              <p className="mt-2.5 font-display text-[20px] leading-tight font-bold tracking-tight">
                {q.soru}
              </p>
              <p className="mt-3 text-[14px] leading-relaxed text-yazi-sonuk">
                {q.alt}
              </p>
            </div>
          ))}
        </Sirali>

        <Beliren yon="yakin">
          <p className="mt-10 max-w-2xl border-l-2 border-vurgu pl-5 text-[16px] leading-relaxed">
            Sorun her zaman kafenin kendisi değil. Çoğu zaman eksik olan şey,
            müşteri kapıdan çıktıktan sonra ilişkiyi sürdüren{" "}
            <strong>bir sistem</strong>.
          </p>
        </Beliren>
      </div>
    </section>
  );
}
