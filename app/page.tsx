import { redirect } from "next/navigation";

/** ルートはトップページ（ゲームの紹介とモード選択）へ */
export default function Home() {
  redirect("/login");
}
