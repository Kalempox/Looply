import { redirect } from "next/navigation";
import Link from "next/link";
import { withBypass } from "@/db/context";
import * as oturum from "@/domain/session";
import { idIleBul, gorunum } from "@/domain/player";
import { Sayfa, Baslik, Uyari } from "@/components/ui";
import {
  VeriIndirmeDugmesi,
  IzinAnahtari,
  HatirlatmaAnahtari,
  HesapSilme,
  AdGorunurluguAnahtari,
} from "./kontroller";

export const dynamic = "force-dynamic";

/**
 * "Verilerim" — KVKK m.11 hakları (G25).
 *
 * Hangi verinin tutulduğu, kimin gördüğü ve ne kadar kalacağı burada
 * düz bir dille yazıyor. Haklar da aynı ekranda kullanılabiliyor:
 * görme, taşıma, izin geri alma, silme.
 */
export default async function Verilerim() {
  const o = await oturum.oku();
  if (!o || o.rol !== "oyuncu") redirect("/giris");

  const oyuncu = await idIleBul(o.ozneId);
  if (!oyuncu) redirect("/giris");
  const g = gorunum(oyuncu);

  const durum = await withBypass("verilerim ekranı", async (db) => {
    const pazarlama = await db.one(
      `SELECT 1 FROM player_consents
        WHERE player_id = $1 AND kind = 'commercial_message' AND revoked_at IS NULL`,
      [o.ozneId],
    );
    const hatirlatma = await db.one(
      `SELECT 1 FROM player_consents
        WHERE player_id = $1 AND kind = 'service_reminder' AND revoked_at IS NULL`,
      [o.ozneId],
    );
    const kafeler = await db.all<{ kafe: string; kod: string }>(
      `SELECT c.name AS kafe, a.code AS kod
         FROM player_aliases a JOIN cafes c ON c.id = a.cafe_id
        WHERE a.player_id = $1 ORDER BY c.name`,
      [o.ozneId],
    );
    const silme = await db.one<{ deletion_requested_at: Date | null }>(
      `SELECT deletion_requested_at FROM players WHERE id = $1`,
      [o.ozneId],
    );
    const adGorunur = await db.one<{ v: boolean }>(
      `SELECT leaderboard_name_visible AS v FROM players WHERE id = $1`,
      [o.ozneId],
    );
    return {
      pazarlamaAcik: !!pazarlama,
      hatirlatmaAcik: !!hatirlatma,
      adGorunur: !!adGorunur?.v,
      kafeler,
      silmeTarihi: silme?.deletion_requested_at ?? null,
    };
  });

  return (
    <Sayfa>
      <Baslik ust="KVKK">Verilerim</Baslik>

      {durum.silmeTarihi && (
        <div className="mb-7">
          <Uyari tur="bekle">
            Hesabın silinmek üzere. Kişisel bilgilerin{" "}
            {new Date(durum.silmeTarihi.getTime() + 30 * 86_400_000).toLocaleDateString("tr-TR", {
              day: "numeric",
              month: "long",
            })}{" "}
            tarihinde geri döndürülemez şekilde silinecek. O tarihe kadar vazgeçebilirsin.
          </Uyari>
        </div>
      )}

      <Bolum baslik="Hakkında tuttuğumuz bilgiler">
        <dl className="divide-y divide-cizgi border-y border-cizgi">
          <Satir k="Ad soyad" v={`${g.ad} ${g.soyad}`} />
          <Satir k="Telefon" v={g.telefonMaskeli} not="şifreli saklanır" />
          <Satir
            k="Kayıt tarihi"
            v={oyuncu.olusturuldu.toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" })}
          />
        </dl>
        <p className="mt-3 text-[13px] leading-relaxed text-yazi-sonuk">
          Bu bilgiler hesabın açık olduğu sürece tutulur, hesabını silmenden 30 gün sonra
          geri döndürülemez şekilde silinir.
        </p>
      </Bolum>

      <Bolum baslik="Üye işletmelerin gördüğü">
        {durum.kafeler.length === 0 ? (
          <p className="text-[14px] text-yazi-sonuk">Henüz hiçbir kafede oyun oynamadın.</p>
        ) : (
          <ul className="divide-y divide-cizgi border-y border-cizgi">
            {durum.kafeler.map((k) => (
              <li key={k.kod} className="flex items-center justify-between py-3">
                <span className="text-[15px]">{k.kafe}</span>
                <span className="font-data text-[13px] text-vurgu">{k.kod}</span>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-3 text-[13px] leading-relaxed text-yazi-sonuk">
          Kafeler adını, soyadını veya telefonunu <strong className="text-yazi">görmez</strong>.
          Yalnızca yukarıdaki koda ve oyun hareketine bakarlar. Her kafede kodun farklıdır;
          iki kafe kendi aralarında seni eşleştiremez.
        </p>
      </Bolum>

      <Bolum baslik="Masa tahtı">
        <AdGorunurluguAnahtari acik={durum.adGorunur} />
        <p className="mt-3 text-[13px] leading-relaxed text-yazi-sonuk">
          Bir masanın tahtına oturduğunda <strong className="text-yazi">yalnızca adın</strong>{" "}
          görünür — soyadın hiçbir koşulda gösterilmez. Kapatırsan tahtta kalırsın, adın
          yerine o kafeye özel anonim kodun görünür.
        </p>
      </Bolum>

      <Bolum baslik="Kampanya mesajları">
        <IzinAnahtari acik={durum.pazarlamaAcik} />
        <div className="mt-3">
          <HatirlatmaAnahtari acik={durum.hatirlatmaAcik} />
        </div>
        <p className="mt-3 text-[13px] leading-relaxed text-yazi-sonuk">
          Bu izin hizmetin şartı değil — kapalıyken de oynayabilir, ödül kazanabilirsin.
        </p>
      </Bolum>

      <Bolum baslik="Verilerimi indir">
        <VeriIndirmeDugmesi />
        <p className="mt-3 text-[13px] leading-relaxed text-yazi-sonuk">
          Hakkında tuttuğumuz her şeyi JSON dosyası olarak indirirsin: hesap bilgilerin,
          rızaların, puan hareketlerin, kuponların ve sana gönderilen mesajların listesi.
        </p>
      </Bolum>

      <Bolum baslik="Hesabımı sil">
        <HesapSilme silmeTalebiVar={!!durum.silmeTarihi} />
        <p className="mt-3 text-[13px] leading-relaxed text-yazi-sonuk">
          Kişisel bilgilerin 30 gün içinde silinir. Kupon ve puan kayıtları ticari kayıt
          zorunluluğu gereği kalır ama <strong className="text-yazi">kimliğinle bağı kopar</strong>.
        </p>
      </Bolum>

      <nav className="mt-12 border-t border-cizgi pt-6">
        <Link href="/oyna" className="text-[14px] text-vurgu underline">
          ← Ana ekrana dön
        </Link>
      </nav>
    </Sayfa>
  );
}

function Bolum({ baslik, children }: { baslik: string; children: React.ReactNode }) {
  return (
    <section className="mb-10">
      <h2 className="mb-3 etiket-caps text-yazi-sonuk">
        {baslik}
      </h2>
      {children}
    </section>
  );
}

function Satir({ k, v, not }: { k: string; v: string; not?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-3">
      <dt className="text-[14px] text-yazi-sonuk">{k}</dt>
      <dd className="text-right">
        <span className="block text-[15px]">{v}</span>
        {not && <span className="font-data text-[10px] text-yazi-sonuk">{not}</span>}
      </dd>
    </div>
  );
}
