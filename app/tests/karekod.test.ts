import "../scripts/_env";
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import { Karekod, karekodSurumu } from "@/components/karekod";

/**
 * BASILI KAREKOD — Ü246.
 *
 * ── Neden bunun testi var ───────────────────────────────────
 *
 * Bu projedeki hataların çoğu ekranda görülüp düzeltiliyor. Basılı
 * karekod öyle değil: **yanlış olduğu, binlerce etiket basıldıktan ve
 * masalara yapıştırıldıktan sonra** anlaşılır. Geri alınamaz.
 *
 * Bu yüzden burada sınanan şey görünüm değil, kodun **okunabilir
 * kalmasının koşulları**.
 *
 * ── Okunurluk nasıl ölçüldü ─────────────────────────────────
 *
 * Node'da QR çözücü yok ve yalnızca bunun için bağımlılık eklenmedi.
 * Ölçüm tarayıcıda yapıldı: bileşenin gerçek SVG çıktısı tuvale
 * basılıp jsQR (ZXing algoritmasının JS portu) ile çözüldü.
 *
 *   temiz okuma   → hepsi 800/400/200/120/100 pikselde okundu
 *   yerel leke    → 600 piksellik kodun veri alanına dolu daire, 20 deneme
 *
 * Ölçüm iki kez yapıldı; ikincisi alan adı `looplybusiness.com` olunca
 * (sürüm 5 → 6) tekrarlandı ve sayılar **iyileşti**: daha çok modül,
 * daha çok hata düzeltme kelimesi.
 *
 *     yarıçap      sürüm 6 · Loopy   sürüm 6 · sade   sürüm 5 · Loopy
 *       1–2             20/20             20/20            20/20
 *         3             19/20             17/20            19/20
 *         4             18/20             18/20            17/20
 *         5             17/20             16/20            16/20
 *         6             17/20             16/20            15/20
 *         8             12/20              2/20             8/20
 *
 * (Sürüm 5'te %10,9'luk büyük rozet de ölçüldü: 4 modülde 15/20,
 * 5'te 11/20, 8'de 4/20 — yani rozetsiz koddan bile kötü. Rozet o
 * yüzden %7,1'de tutuldu.)
 *
 * 🔴 İki sonuç ve ikisi de karara girdi:
 *
 *   · **Loopy'li kod sade koddan daha dayanıklı.** Rozet modül yiyor
 *     ama seviye `M`den `H`ye çıkıyor ve kazanç kaybı fazlasıyla
 *     karşılıyor.
 *   · **Ama yalnızca küçük kalırsa.** %10,9'luk rozet orta hasarda
 *     rozetsiz koddan bile kötü — `H`nin bütün kazancını yiyor.
 *
 * ⚠️ Üçüncü bir bulgu: rozetin **içindeki resim önemli değil**.
 * Ölçüm önce ince mavi bir işaretle, sonra dolu koyu bir karakterle
 * yapıldı ve sonuçlar birebir aynı çıktı. Bir kod kelimesi 8 modül ve
 * içinden biri bozuksa kelime gidiyor; rozet ister beyaz ister dolu
 * olsun dokunduğu kelimeleri zaten kaybediyor. "Logoyu açık renk
 * yaparsak daha az zarar verir" doğru değil.
 *
 * ⚠️ Aşağıdaki testler o ölçümü tekrarlamıyor (çözücü yok); ölçümün
 * **geçerli kalmasının koşullarını** bekçiliyorlar. Koşullar bozulursa
 * ölçüm yeniden yapılmalı.
 */

/**
 * Gerçek basılı adres — alan adı ve 16 haneli kod dahil.
 *
 * ⚠️ Alan adı burada SABİT YAZILI ve öyle olmalı: testin işi basılan
 * şeyin okunabilir kaldığını sınamak ve basılan şey bu adres.
 */
const ADRES = "https://looplybusiness.com/m/ec3ebc4b9c1d3931";

describe("basılı karekod (Ü246)", () => {
  test("🔴 sürüm 6'yı GEÇMİYOR — 7'de hizalama deseni rozetin altına giriyor", () => {
    /*
      🔴 Bu testin bekçilik ettiği şey rozetin güvenli olup olmadığı ve
      sınır **tam burada**, bir sonraki sürümde.

      Hizalama desenleri sürüme göre yerleşiyor:

        sürüm 5 (37×37)  koordinatlar {6, 30}   → merkez (18,18) BOŞ ✅
        sürüm 6 (41×41)  koordinatlar {6, 34}   → merkez (20,20) BOŞ ✅
        sürüm 7 (45×45)  koordinatlar {6,22,38} → (22,22) TAM MERKEZ 🔴

      7. sürümde merkezdeki desen rozetin altında kalıyor ve hizalama
      deseni **hata düzeltmeyle kurtarılmıyor**: çözücü kodun
      geometrisini ona bakarak oturtuyor. Kaybolursa `H` seviyesi bile
      kurtarmaz — kod hiç okunmaz.

      ⚠️ Sürümü yükselten tek şey adresin uzaması. Bugün 45 karakter
      ve 6. sürümdeyiz, yani **13 karakterlik payımız kaldı** (6. sürüm
      `H`de 58 bayt tutuyor). Alan adı uzatılır ya da koda hane
      eklenirse bu test düşer ve düşmesi gerekir.

      Düştüğünde yapılacak şey adresi kısaltmak; rozeti küçültmek
      değil. Merkezdeki desen kapatılamaz.
    */
    assert.ok(
      karekodSurumu(ADRES, true) <= 6,
      `sürüm ${karekodSurumu(ADRES, true)} — 7'de merkezde hizalama deseni var, rozet onu kapatır`,
    );

    // Uzun bir adres sınırı gerçekten aşıyor — testin bağlayıcı
    // olduğunun kanıtı.
    const uzun = `https://www.looplybusiness.com.tr/m/${"a".repeat(40)}`;
    assert.ok(
      karekodSurumu(uzun, true) > 6,
      "uzun adres bile sürümü yükseltmiyor — test bir şey sınamıyor",
    );
  });

  test("rozet istenince hata düzeltme H'ye çıkıyor", () => {
    /*
      Seviye bileşende rozete **bağlı** ve ayrı verilemiyor. Doğrudan
      okunamadığı için dolaylı ölçülüyor: aynı veri `H`de daha çok yer
      kapladığı için sürüm yükseliyor.
    */
    assert.ok(
      karekodSurumu(ADRES, true) > karekodSurumu(ADRES, false),
      "rozetli kod sade kodla aynı sürümde — seviye yükselmemiş",
    );
  });

  test("maskot gerçekten çiziliyor — boş rozet sessizce geçmesin", () => {
    /*
      🔴 Rozetin içi boş kalsa kod yine okunurdu ve test yine yeşil
      yanardı: ölçümün gösterdiği gibi zarar rozetin alanından
      geliyor, içeriğinden değil. Yani "Loopy kayboldu" hatası
      **hiçbir şeyi kırmadan** yayına çıkabilirdi.

      ⚠️ Adres de sınanıyor: dosya adı değişirse `<image>` duruyor
      ama tarayıcı boş kare çiziyor.
    */
    const svg = renderToStaticMarkup(
      Karekod({ deger: ADRES, boyut: 512, etiket: "sınav", isaret: true }),
    );
    assert.match(svg, /<image[^>]+href="\/avatar\/loopy-mutlu-karekod\.webp"/);
  });

  test("rozet sembolün %8'inden azını kapatıyor", () => {
    /*
      🔴 %8 keyfî bir sayı değil: ölçülen iki noktadan biri (%7,1)
      altında, öteki (%10,9) üstünde ve ikincisi rozetsiz koddan bile
      kötü çıktı. Sınır aradan geçiyor.

      Rozet büyütülürse yukarıdaki tablo artık o kodu anlatmıyor ve
      tarayıcıdaki sınav yeniden koşturulmalı.

      Ölçü SVG'nin kendisinden okunuyor, sabitten değil: sabit doğru
      ama çizim onu kullanmayı bıraksa test yine yeşil yanardı.
    */
    const svg = renderToStaticMarkup(
      Karekod({ deger: ADRES, boyut: 512, etiket: "sınav", isaret: true }),
    );

    const kutu = svg.match(/viewBox="0 0 ([\d.]+) [\d.]+"/);
    assert.ok(kutu, "viewBox okunamadı");
    const toplam = Number(kutu[1]);

    // Rozet, beyaz zeminden sonraki ikinci `rect` — yuvarlatılmış olan.
    const rozet = svg.match(/<rect x="([\d.]+)" y="[\d.]+" width="([\d.]+)" height="([\d.]+)" rx=/);
    assert.ok(rozet, "rozet dikdörtgeni bulunamadı — rozet çizilmiyor");
    const [, , en, boy] = rozet.map(Number);

    const pay = (en * boy) / (toplam * toplam);
    assert.ok(
      pay < 0.08,
      `rozet sembolün %${(pay * 100).toFixed(1)}'ini kapatıyor — ölçüm bu aralıkta yapılmadı`,
    );
    assert.ok(pay > 0.03, `rozet %${(pay * 100).toFixed(1)} — Loopy okunmayacak kadar küçük`);
  });

  test("rozet merkezde — bulucu desenlerine dokunmuyor", () => {
    /*
      Üç köşedeki bulucu desenleri ve aralarındaki zamanlama çizgisi
      hata düzeltmenin dışında. Rozet oraya taşarsa kod hiç okunmaz.
    */
    const svg = renderToStaticMarkup(
      Karekod({ deger: ADRES, boyut: 512, etiket: "sınav", isaret: true }),
    );
    const toplam = Number(svg.match(/viewBox="0 0 ([\d.]+) /)![1]);
    const r = svg.match(/<rect x="([\d.]+)" y="([\d.]+)" width="([\d.]+)" height="([\d.]+)" rx=/)!;
    const [x, y, en, boy] = [Number(r[1]), Number(r[2]), Number(r[3]), Number(r[4])];

    // Bulucu deseni + ayırıcı: sessiz alandan sonra 8 modül.
    const guvenli = 4 + 8;
    assert.ok(x > guvenli, `rozet sola ${x} modülde başlıyor — bulucu desenine giriyor`);
    assert.ok(y > guvenli, `rozet yukarı ${y} modülde başlıyor — bulucu desenine giriyor`);
    assert.ok(x + en < toplam - guvenli, "rozet sağdaki bulucu desenine giriyor");
    assert.ok(y + boy < toplam - guvenli, "rozet alttaki bulucu desenine giriyor");
  });

  test("SVG tek başına açılabiliyor — xmlns var", () => {
    /*
      Ölçüldü: `xmlns` olmadan tarayıcı SVG'yi `<img>` olarak
      yüklemeyi reddediyor. Satır içi HTML'de gerekmiyor ama kafe kodu
      dosya olarak kaydedip matbaaya gönderdiğinde gerekiyor.
    */
    const svg = renderToStaticMarkup(
      Karekod({ deger: ADRES, boyut: 512, etiket: "sınav", isaret: true }),
    );
    assert.ok(svg.includes('xmlns="http://www.w3.org/2000/svg"'), "xmlns yok");
  });

  test("ekrandaki kupon karekodu ROZETSİZ kalıyor", () => {
    /*
      ⚠️ Kasiyer telefon ekranından tarıyor: ekran küçük, parlıyor,
      parmak izli. Orada rozet bir şey katmadan modülleri inceltir.
      Varsayılan `false` ve öyle kalmalı.
    */
    const svg = renderToStaticMarkup(
      Karekod({ deger: "kpn_abc123", boyut: 220, etiket: "kupon" }),
    );
    assert.ok(!svg.includes("rx="), "kupon karekodunda rozet var");
  });
});
