"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  formatMoney,
  formatMoneyCompact,
  formatMoneySigned,
  type Currency,
} from "@/lib/format";

export type Language = "ja" | "en";

export type AppSettings = {
  /** 表示通貨（ゲーム内の値は常に USD で保持する） */
  currency: Currency;
  /** 表示言語。現状は日本語のみ対応 */
  language: Language;
};

const defaultSettings: AppSettings = {
  currency: "USD",
  language: "ja",
};

type SettingsContextValue = {
  settings: AppSettings;
  updateSettings: (patch: Partial<AppSettings>) => void;
};

const SettingsContext = createContext<SettingsContextValue | null>(null);

/**
 * 表示設定。ゲームの進行状態とは独立しているため、
 * ゲームをリセットしても設定は保持される。
 */
export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);

  const updateSettings = useCallback((patch: Partial<AppSettings>) => {
    setSettings((prev) => ({ ...prev, ...patch }));
  }, []);

  const value = useMemo(
    () => ({ settings, updateSettings }),
    [settings, updateSettings],
  );

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) {
    throw new Error("useSettings は SettingsProvider の内側で使用してください");
  }
  return ctx;
}

/**
 * 表示通貨を適用した金額フォーマッタ。
 * 引数は常に USD で渡す。
 */
export function useMoney() {
  const { settings } = useSettings();
  const { currency } = settings;

  return useMemo(
    () => ({
      currency,
      money: (usd: number) => formatMoney(usd, currency),
      moneyCompact: (usd: number) => formatMoneyCompact(usd, currency),
      moneySigned: (usd: number) => formatMoneySigned(usd, currency),
    }),
    [currency],
  );
}
