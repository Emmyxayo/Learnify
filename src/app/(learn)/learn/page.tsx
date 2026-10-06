import type { Metadata } from "next";
import { MyLearning } from "@ui/patterns/learn/my-learning";

export const metadata: Metadata = { title: "Your courses — Learnify" };

export default function Page() {
  return <MyLearning />;
}
