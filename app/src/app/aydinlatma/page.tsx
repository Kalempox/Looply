import Link from "next/link";
import { RIZA_SURUMU, rizaTarihiYazi } from "@/lib/riza-surumu";

export const metadata = { title: "Aydınlatma metni · Looply" };

/**
 * F1 · KVKK aydınlatma metni.
 *
 * Kayıt formundaki **zorunlu** onay kutusu bu adrese bakıyor
 * (`app/src/app/giris/form.tsx`). Sayfa yazılmadığı sürece kayıt akışında
 * kırık bağlantı vardı: oyuncu okumadan onayladığını işaretliyordu ve
 * okumak isteyen 404 görüyordu. Açık rızanın "bilgilendirilmiş" olması
 * şartı bu bağlantının çalışmasına bağlı.
 *
 * ⚠️ **Metin hukuk incelemesinden geçmedi.** Düzen ve taahhütler ürünün
 * bugünkü davranışını doğru anlatıyor (şifreli numara, kafeye özel anonim
 * kod, mesafe saklanır adres saklanmaz) ama nihai hâli avukattan gelecek.
 * `docs/05-acik-sorular.md` içinde açık madde olarak duruyor.
 *
 * Tasarım: `docs/tasarim/_govde/aydinlatma.html`.
 */
export default function AydinlatmaSayfasi() {
  return (
    <main className="min-h-dvh bg-zemin text-yazi">
      <div className="mx-auto w-full max-w-md px-5 py-10 sm:py-14">
        <header className="mb-8 border-b border-cizgi pb-6">
          <div className="etiket-caps text-vurgu">KVKK</div>
          <h1 className="mt-2 font-display text-3xl leading-tight font-bold tracking-[-0.02em]">
            Aydınlatma metni
          </h1>
          {/*
            ⚠️ Tarih **elle yazılmıyor**, rıza sürümünden türüyor (Ü112).
            Önce iki ayrı yerde elle duruyorlardı ve ayrıştılar: metin
            değişti, ikisi de ağustosta kaldı. Oyuncu bugünkü metni
            onaylarken deftere ağustostaki sürüm yazılıyordu.
          */}
          <p className="mt-2 font-data text-[11px] font-medium text-yazi-sonuk tabular">
            Son güncelleme {rizaTarihiYazi()} · {RIZA_SURUMU}
          </p>
        </header>

        {/* Okuyanın aradığı cevap en üstte — gerisi onu açıyor. */}
        <div className="mb-8 rounded-2xl border border-vurgu bg-yuzey p-4">
          <p className="text-[16px] leading-relaxed">
            Telefon numaran şifreli saklanır ve üye işletmelerle paylaşılmaz. Kafeler seni
            yalnızca sana özel anonim bir kodla görür.
          </p>
        </div>

        <article className="flex flex-col gap-8">
          <Bolum baslik="Hangi verileri işliyoruz">
            <p>
              Hesabını açarken ad, soyad, cep telefonu numaran ve doğum yılın alınır. Oynadıkça
              oyun oturumların, kazandığın puan ve kuponlar, hangi kafede bulunduğun ve — izin
              verirsen — konum doğrulaması sırasındaki mesafe bilgisi işlenir.
            </p>
            <ul className="mt-3 flex flex-col gap-2">
              <Madde>Kimlik: ad, soyad, doğum yılı</Madde>
              <Madde>İletişim: cep telefonu numarası — şifrelenmiş olarak</Madde>
              <Madde>İşlem: oyun oturumları, puan hareketleri, kuponlar</Madde>
              <Madde>Konum: yalnızca kafeye yakınlık doğrulaması için, izin verirsen</Madde>
            </ul>
          </Bolum>

          <Bolum baslik="Neden işliyoruz">
            <p>
              Hesabını açmak, kazandığın ödülü sana bağlamak ve kasada doğru kişiye teslim
              edildiğini doğrulamak için. Konum bilgisi yalnızca ödülün gerçekten kafede
              kazanıldığını göstermek için kullanılır; saklanan şey mesafedir, adres değil.
            </p>
            {/* Ü279: masa oturumu gün boyu açık, "hâlâ kafede mi" sorusunu
                taze konum cevaplıyor — okumanın sıklığı söylenmeli. */}
            <p className="mt-3">
              Kafedeyken, uygulama açık olduğu sürece konumun birkaç dakikada bir ve her oyun
              ya da çark öncesinde yeniden kontrol edilir; ödül ancak hâlâ kafedeysen verilir.
              Uygulama kapalıyken konumun okunmaz.
            </p>
          </Bolum>

          <Bolum baslik="Diğer oyuncular ne görür">
            <p>
              Bulunduğun kafenin sıralama tablosunda adın ve soyadının{" "}
              <Guclu>yalnızca baş harfi</Guclu> görünür — örneğin{" "}
              <span className="font-data text-[14px] text-yazi">Mert Y***</span>. Yıldız
              sayısı sabittir, soyadının uzunluğunu ele vermez. Telefonun ve doğum yılın{" "}
              <Guclu>hiçbir koşulda</Guclu> gösterilmez.
            </p>
            <p className="mt-3">
              Bunu istemiyorsan <Guclu>Verilerim</Guclu> ekranından kapatabilirsin;
              sıralamada kalırsın, adın yerine o kafeye özel anonim kodun görünür.
            </p>
          </Bolum>

          <Bolum baslik="Kimlerle paylaşıyoruz">
            <p>
              Üye işletmelerle <Guclu>hiçbir kimlik bilgisi paylaşılmaz</Guclu>. Kafe seni
              yalnızca o kafeye özel bir kodla görür ve bu kod her kafede farklıdır; iki kafe
              kendi kayıtlarını birleştirip aynı kişiyi izleyemez. SMS gönderimi için yalnızca
              operatör hizmet sağlayıcısıyla numaran paylaşılır.
            </p>
          </Bolum>

          <Bolum baslik="Ne kadar saklıyoruz">
            <p>
              Kimlik ve iletişim bilgilerin hesabın açık olduğu sürece tutulur, hesabını
              silmenden 30 gün sonra geri döndürülemez şekilde silinir. Kupon ve puan kayıtları
              ticari kayıt zorunluluğu gereği kalır ama kimliğinle bağı koparılır.
            </p>
          </Bolum>

          <Bolum baslik="Haklarınız">
            <p>
              Hakkında tuttuğumuz verileri <Guclu>görme</Guclu>,{" "}
              <Guclu>dosya olarak indirme</Guclu>, <Guclu>silme</Guclu> ve verdiğin{" "}
              <Guclu>izinleri geri alma</Guclu> hakkını uygulamadaki{" "}
              <Guclu>Verilerim</Guclu> ekranından tek başına kullanabilirsin — talep
              göndermene gerek yok.
            </p>
            <p className="mt-3">
              Ad veya soyadında bir yanlışlık varsa <Guclu>düzeltme</Guclu> için aşağıdaki
              adrese yazman yeterli; en geç 30 gün içinde dönüş yapılır.
            </p>
          </Bolum>

          {/*
            ⚠️ Veri sorumlusunun **tüzel kişi** bilgileri (tam unvan, vergi
            no, kayıtlı adres, MERSİS) henüz girilmedi — `docs/24` §9'da
            `[DOLDUR]` olarak duruyor ve hukuk incelemesinden (S20) önce
            tamamlanmalı. KVKK, veri sorumlusunun kimliğinin metinde açıkça
            yazmasını istiyor; "LOOPLY" tek başına yeterli değil.
          */}
          <Bolum baslik="Bize nasıl ulaşırsınız">
            <p>
              Veri sorumlusu: <Guclu>LOOPLY</Guclu>. Sorularını, düzeltme
              taleplerini ve KVKK başvurularını{" "}
              <span className="font-data text-[14px] text-yazi">
                kvkk@looplybusiness.com
              </span>{" "}
              adresine iletebilirsin. Başvurulara en geç 30 gün içinde dönülür.
            </p>
          </Bolum>
        </article>

        <Link
          href="/giris"
          className="mt-8 block border-t border-cizgi pt-6 text-[16px] text-vurgu"
        >
          ← Geri dön
        </Link>
      </div>
    </main>
  );
}

/* ── Parçalar ──────────────────────────────────────────── */

function Bolum({ baslik, children }: { baslik: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-3 font-display text-lg leading-tight font-semibold">{baslik}</h2>
      <div className="text-[16px] leading-[1.7] text-yazi-sonuk">{children}</div>
    </section>
  );
}

function Madde({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="mt-2.5 h-1 w-1 shrink-0 rounded-full bg-yazi-sonuk" aria-hidden />
      <span>{children}</span>
    </li>
  );
}

function Guclu({ children }: { children: React.ReactNode }) {
  return <strong className="font-semibold text-yazi">{children}</strong>;
}
