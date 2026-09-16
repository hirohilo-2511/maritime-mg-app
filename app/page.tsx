import { redirect } from "next/navigation";

/** ルートはログイン画面へ（認証は未実装のためモック） */
export default function Home() {
  redirect("/login");
}
