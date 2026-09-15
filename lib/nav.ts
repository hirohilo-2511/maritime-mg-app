import type { IconName } from "@/components/ui/Icon";

export type NavItem = {
  label: string;
  href: string;
  icon: IconName;
  /** true の場合、サイドバー右端に今ターンの船主要求件数を表示する */
  showRequestCount?: boolean;
  /** true の場合、マーケティング予算が未確定のときに注意バッジを表示する */
  showBudgetStatus?: boolean;
  /** true の場合、未購入の調査レポート件数を表示する */
  showResearchCount?: boolean;
};

export const navItems: NavItem[] = [
  { label: "ダッシュボード", href: "/dashboard", icon: "dashboard" },
  {
    label: "マーケティング予算",
    href: "/marketing-budget",
    icon: "budget",
    showBudgetStatus: true,
  },
  {
    label: "市場調査",
    href: "/market-research",
    icon: "research",
    showResearchCount: true,
  },
  {
    label: "顧客プロファイル",
    href: "/customer-profiles",
    icon: "customers",
    showRequestCount: true,
  },
];

export const secondaryNavItems: NavItem[] = [
  { label: "設定", href: "/settings", icon: "settings" },
];
