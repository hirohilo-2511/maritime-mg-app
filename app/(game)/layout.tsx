import type { ReactNode } from "react";
import { AppShell } from "@/components/game/AppShell";

/** ログイン後のゲーム画面共通レイアウト（サイドバー + トップヘッダー） */
export default function GameLayout({ children }: { children: ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
