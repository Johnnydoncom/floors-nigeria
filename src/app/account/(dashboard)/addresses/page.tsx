import type { Metadata } from "next";
import { getAddresses } from "@/lib/api/account";
import { AddressBook } from "@/components/account/AddressBook";

export const metadata: Metadata = { title: "Addresses" };

export default async function AddressesPage() {
  const addresses = await getAddresses();

  return (
    <section>
      <AddressBook addresses={addresses} />
    </section>
  );
}
