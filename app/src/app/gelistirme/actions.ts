"use server";

import { revalidatePath } from "next/cache";
import { notFound } from "next/navigation";
import { defteriTemizle } from "@/sms/gelistirme-defteri";
import { kodEkrandaGosterilir } from "@/sms";

export async function defteriTemizleEylemi(): Promise<void> {
  // Canlıda bu eylem hiç çalışmaz — sayfa gibi eylem de kapalı
  if (!kodEkrandaGosterilir()) notFound();
  defteriTemizle();
  revalidatePath("/gelistirme");
}
