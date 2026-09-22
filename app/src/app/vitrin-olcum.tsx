import Image from "next/image";
import { Beliren, Sirali } from "./vitrin-hareket";

/**
 * Ölçüm — Ü220.
 *
 * ── Neden ayrı bir bölüm ────────────────────────────────────
 *
 * Ürün sahibinin içerik listesinde vardı ve bizde yalnızca **dağınık**
 * hâlde bulunuyordu: bir kısmı paneldeki ekran görüntüsünde, bir kısmı
 * reklam karşılaştırmasının sağ sütununda, en önemli cümlesi ise
 * SSS'in **kapalı** bir akordeonunun içinde.
 *
 * ── 🔴 Asıl mesele o kapalı akordeon ────────────────────────
 *
 * *"Satışını otomatik ölçmüyoruz"* cümlesi bu ürünün en dürüst ve en
 * çok işe yarayan cümlelerinden biri ve tıklanmadan görünmüyordu.
 * İşletmeci bunu bizden duymazsa ilk ay sonunda kendisi fark ediyor —
 * ve o an güven bir kez kırılıyor. Sınırı önce söyleyen taraf olmak,
 * bu sayfanın baştan beri seçtiği yol.
 *
 * ── 🔴 SAYFANIN KURALI ARTIK BURADA YAZILI ──────────────────
 *
 * *"Söylediğimiz her şey üründe doğrulanabilir."* Bu cümle Dalga
 * 8'den beri *"Dürüst olalım"* bölümünün başındaydı; o bölüm Ü228'de
 * ürün sahibinin kararıyla kaldırıldı ve kural evsiz kalmasın diye
 * buraya taşındı. Vitrindeki her somut ifade — ekran görüntüleri,
 * başvurunun dört alanı, kasada onaylanan kupon — üründe
 * karşılanıyor; karşılanmayan bir şey yazılmıyor.
 *
 * ── Neden liste, neden rakam yok ────────────────────────────
 *
 * Ölçülen şeyler **isim** olarak sayılıyor, örnek rakamla değil.
 * Uydurma bir "%38 geri dönüş" yazmak beş dakikalık iş ve sayfanın
 * kuralını bozardı. Gerçek sayı işletmecinin kendi panelinde çıkacak.
 */

const OLCULENLER: { baslik: string; metin: string }[] = [
  {
    baslik: "Kaç kişi okuttu",
    metin: "Masadaki karekodu kaç kişi okuttu, hangi gün, hangi saat.",
  },
  {
    baslik: "Kaçı oynadı",
    metin: "Okutanların kaçı oyuna girdi ve hangi oyunu oynadı.",
  },
  {
    baslik: "Kaç kupon çıktı",
    metin: "Hangi ödülden kaç adet dağıtıldı — kataloğundaki hangi ürün tutuyor.",
  },
  {
    baslik: "Kaçı kasada kullanıldı",
    metin: "Dağıtılan kuponun kaçı gerçekten indirime döndü. Gider yalnızca bu.",
  },
  {
    baslik: "Kim ikinci kez geldi",
    metin: "Kupon kullanmak için tekrar gelen kişi ve iki geliş arasındaki süre.",
  },
  {
    baslik: "Ne kadar indirim verdin",
    metin: "Dönem boyunca kasada onaylanan toplam indirim ve günlük bütçene oranı.",
  },
];

export function VitrinOlcum() {
  return (
    <section
      id="olcum"
      className="scroll-mt-20 bg-vitrin-lacivert py-20 text-yuzey sm:py-28"
    >
      <div className="mx-auto w-full max-w-6xl px-5">
        <Beliren yon="olcek">
          <p className="etiket-caps text-white/45">Ölçüm</p>
          <h2 className="mt-4 max-w-3xl font-display text-[clamp(28px,4.6vw,50px)] leading-[1.04] font-extrabold tracking-[-0.03em]">
            “Looply bana ne
            <br />
            <span className="text-odul">kazandırdı?</span>”
          </h2>
          <p className="mt-6 max-w-xl text-[16px] leading-relaxed text-white/65">
            Bu sorunun cevabı panelde duruyor ve altı şeyden oluşuyor. Hiçbiri
            tahmin değil — hepsi ürünün kendi kaydından geliyor.
          </p>
        </Beliren>

        {/*
          ── Panelin kendisi — Ü232 ──────────────────────────

          Ürün sahibi: *"bu kısmı görselleştir."* Bölüm *"cevabı
          panelde duruyor"* diyordu ve **paneli göstermiyordu**; altı
          kutu ölçülen şeyleri sayıyordu ama okuyan kişi onların nerede
          göründüğünü görmüyordu.

          ⚠️ Kare gerçek: `/vitrin/rapor.png`, çalışan panelden
          çekildi (Ü221'de yeniden). Sayılar da uydurma değil —
          `npm run db:simule` ürünün kendi akışından geçen trafiği
          üretiyor.

          ⚠️ Görsel listeden ÖNCE: önce "işte o panel", sonra "içinde
          şunlar var". Ters sırada altı kutu havada kalırdı.

          ⚠️ Altın çerçeve lacivert zeminde sayfanın kurulu eşleşmesi
          (aynı cihaz kaydırmalı sahnenin yan kutusunda da var).
        */}
        <Beliren yon="yakin" className="mt-12">
          {/* 🔴 Çerçeve DIŞ KAPTA, görselin kendisinde değil:
              `overflow-hidden` çocuğun gölgesini kırpıyor ve altın
              kenar hiç basılmıyordu. Aynı tuzağa Ü218'de üçgen
              bloklarda da düşülmüştü (`clip-path` gölgeyi kırpar). */}
          <figure
            className="overflow-hidden rounded-2xl"
            style={{
              boxShadow: [
                "0 0 0 2.5px rgba(212,175,55,0.6)",
                "0 0 0 11px rgba(212,175,55,0.14)",
                "0 30px 70px -28px rgba(0,0,0,0.6)",
              ].join(", "),
            }}
          >
            <Image
              src="/vitrin/rapor.png"
              alt="Looply işletme paneli: dönem raporu, ziyaret sayısı, indirim gideri"
              width={1320}
              height={880}
              sizes="(max-width: 1024px) 100vw, 1100px"
              className="block h-auto w-full"
            />
          </figure>
        </Beliren>

        <Sirali adim={90} cocukSinifi="h-full" className="mt-14 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {OLCULENLER.map((o) => (
            <div
              key={o.baslik}
              className="h-full rounded-2xl bg-white/[0.06] px-6 py-6 ring-1 ring-white/10"
            >
              <h3 className="text-[16px] font-bold">{o.baslik}</h3>
              <p className="mt-2.5 text-[14px] leading-relaxed text-white/55">
                {o.metin}
              </p>
            </div>
          ))}
        </Sirali>

        {/*
          🔴 Sınır cümlesi — bölümün en önemli parçası.

          Listeden SONRA ve ayrı bir kutuda: önce ne ölçüldüğü, sonra
          neyin ölçülmediği. Ters sırada olsaydı bölüm bir özürle
          başlardı.

          ⚠️ Altın kenar, kırmızı ya da gri değil: bu bir uyarı değil,
          ürünün kendi hakkında söylediği doğru bir cümle.
        */}
        <Beliren yon="yakin">
          <div className="mt-10 rounded-2xl border border-odul/35 bg-odul/[0.07] px-6 py-6 sm:px-8">
            <p className="etiket-caps text-[10px] text-odul">Ölçmediğimiz şey</p>
            <p className="mt-3 max-w-3xl text-[15px] leading-relaxed text-white/80 sm:text-[16px]">
              <strong className="font-semibold text-yuzey">
                Toplam ciron burada yazmıyor.
              </strong>{" "}
              Yazar kasana bağlanmıyoruz, yani satışını otomatik ölçmüyoruz ve
              ölçüyormuş gibi de göstermiyoruz. Looply&apos;nin saydığı şey
              kapıdan giren kişi ve kasada kullanılan kupon; ciro bağlantısını
              kendi rakamlarınla sen kuruyorsun.
            </p>
          </div>
        </Beliren>
      </div>
    </section>
  );
}
