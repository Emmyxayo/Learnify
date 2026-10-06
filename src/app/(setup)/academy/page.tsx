import type { Metadata } from "next";
import { CreateAcademy } from "@ui/patterns/academy/create-academy";

export const metadata: Metadata = { title: "Name your academy — Learnify" };

export default function Page() {
  return <CreateAcademy />;
}
