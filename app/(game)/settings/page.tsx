"use client";

import { useState, type FormEvent } from "react";
import {
  MAX_TEAMS,
  MAX_TURNS,
  useGame,
} from "@/components/game/GameProvider";
import { useMoney, useSettings } from "@/components/game/SettingsProvider";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { JPY_PER_USD } from "@/lib/format";
import { company } from "@/lib/mock-data";
import { researchReports } from "@/lib/research";

/** 設定項目 1 行 */
function SettingRow({
  label,
  description,
  children,
}: {
  label: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-navy-100 py-3.5 last:border-b-0">
      <div className="min-w-0 max-w-sm">
        <p className="text-[13px] font-bold text-navy-900">{label}</p>
        {description ? (
          <p className="mt-0.5 text-[11px] leading-relaxed text-navy-400">
            {description}
          </p>
        ) : null}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

/** 択一選択のセグメントコントロール */
function Segmented<T extends string | number>({
  options,
  value,
  onChange,
  ariaLabel,
}: {
  options: { value: T; label: string; disabled?: boolean; title?: string }[];
  value: T;
  onChange: (value: T) => void;
  ariaLabel: string;
}) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className="inline-flex rounded-lg border border-navy-200 bg-white p-0.5"
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={String(option.value)}
            type="button"
            onClick={() => onChange(option.value)}
            disabled={option.disabled}
            title={option.title}
            aria-pressed={active}
            className={`rounded-md px-3 py-1.5 text-[12px] font-semibold transition-colors disabled:cursor-not-allowed disabled:text-navy-300 ${
              active
                ? "bg-navy-800 text-white"
                : "text-navy-600 hover:bg-navy-50"
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

export default function SettingsPage() {
  const {
    state,
    modeConfig,
    isFinalTurn,
    setTotalTurns,
    addTeam,
    removeTeam,
    jumpToTurn,
    resetGame,
  } = useGame();
  const { settings, updateSettings } = useSettings();
  const { money } = useMoney();

  const [teamName, setTeamName] = useState("");
  const [confirmingReset, setConfirmingReset] = useState(false);

  function handleAddTeam(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    addTeam(teamName);
    setTeamName("");
  }

  const turnOptions = Array.from({ length: MAX_TURNS }, (_, i) => i + 1);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* セッション情報 */}
      <Card>
        <CardHeader
          title="セッション情報"
          description="現在の進行状況"
          icon={<Icon name="anchor" className="h-5 w-5" />}
          action={
            isFinalTurn ? (
              <Badge tone="warning">最終ターン</Badge>
            ) : (
              <Badge tone="info">進行中</Badge>
            )
          }
        />
        <CardBody>
          <dl className="grid gap-2.5 sm:grid-cols-2">
            {[
              { label: "自社", value: company.name },
              {
                label: "ターン",
                value: `${state.turn}年目 / 全${state.totalTurns}年`,
              },
              { label: "利用可能資金", value: money(state.availableFunds) },
              { label: "信頼度スコア", value: `${state.trustScore} / 100` },
              {
                label: "購入済みレポート",
                value: `${state.researchPurchases.length} / ${researchReports.length}`,
              },
              {
                label: "マーケティング予算",
                value: state.marketingCommitted ? "確定済み" : "未確定",
              },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-lg border border-navy-200/70 bg-navy-50/60 px-3.5 py-2.5"
              >
                <dt className="text-[10px] font-semibold tracking-widest text-navy-400">
                  {item.label}
                </dt>
                <dd className="tabular mt-1 truncate text-[13px] font-bold text-navy-900">
                  {item.value}
                </dd>
              </div>
            ))}
          </dl>
        </CardBody>
      </Card>

      {/* セッション設定 */}
      <Card>
        <CardHeader
          title="セッション設定"
          description="ファシリテーターがゲーム開始前に設定する項目"
          icon={<Icon name="settings" className="h-5 w-5" />}
        />
        <CardBody>
          <SettingRow
            label="総ターン数"
            description={`ターンデータは${MAX_TURNS}年分まで用意されています。進行済みのターンより短くはできません。`}
          >
            <Segmented
              ariaLabel="総ターン数"
              value={state.totalTurns}
              onChange={setTotalTurns}
              options={turnOptions
                .filter((n) => n >= 3)
                .map((n) => ({
                  value: n,
                  label: `${n}年`,
                  disabled: n < state.turn,
                  title:
                    n < state.turn
                      ? `${state.turn}年目まで進行済みのため選択できません`
                      : undefined,
                }))}
            />
          </SettingRow>

          <div className="py-3.5">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="text-[13px] font-bold text-navy-900">参加チーム</p>
              <p className="tabular text-[11px] text-navy-400">
                {state.teams.length} / {MAX_TEAMS} チーム
              </p>
            </div>
            <p className="mt-0.5 text-[11px] text-navy-400">
              同一セッションで対戦するチーム。プロトタイプでは表示のみで、AI
              対戦は未実装です。
            </p>

            <ul className="mt-2.5 space-y-1.5">
              {state.teams.map((team, index) => (
                <li
                  key={team}
                  className="flex items-center gap-2 rounded-lg border border-navy-200/70 bg-white px-3 py-2"
                >
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-navy-100 text-[11px] font-bold text-navy-600">
                    {index + 1}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-[13px] text-navy-700">
                    {team}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeTeam(index)}
                    aria-label={`${team} を削除`}
                    className="rounded-md p-1 text-navy-400 transition-colors hover:bg-rose-50 hover:text-rose-600"
                  >
                    <Icon name="close" className="h-4 w-4" />
                  </button>
                </li>
              ))}
              {state.teams.length === 0 ? (
                <li className="rounded-lg bg-navy-50 px-3.5 py-2.5 text-[12px] text-navy-500">
                  チームが登録されていません。
                </li>
              ) : null}
            </ul>

            <form onSubmit={handleAddTeam} className="mt-2.5 flex gap-2">
              <input
                type="text"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                placeholder="チーム名を入力"
                aria-label="追加するチーム名"
                maxLength={40}
                className="min-w-0 flex-1 rounded-lg border border-navy-200 bg-white px-3 py-2 text-[13px] text-navy-900 placeholder:text-navy-300 focus:border-sea-500 focus:outline-2 focus:outline-offset-0 focus:outline-sea-500/30"
              />
              <Button
                type="submit"
                variant="secondary"
                disabled={
                  !teamName.trim() || state.teams.length >= MAX_TEAMS
                }
              >
                追加
              </Button>
            </form>
          </div>
        </CardBody>
      </Card>

      {/* 表示設定 */}
      <Card>
        <CardHeader
          title="表示設定"
          description="この端末での表示に関する設定（ゲームのリセットでは初期化されません）"
          icon={<Icon name="globe" className="h-5 w-5" />}
        />
        <CardBody>
          <SettingRow
            label="表示通貨"
            description={`ゲーム内の金額は USD で保持し、表示時に換算します（固定レート 1 USD = ${JPY_PER_USD} JPY）。`}
          >
            <Segmented
              ariaLabel="表示通貨"
              value={settings.currency}
              onChange={(currency) => updateSettings({ currency })}
              options={[
                { value: "USD", label: "USD ($)" },
                { value: "JPY", label: "JPY (¥)" },
              ]}
            />
          </SettingRow>

          <SettingRow
            label="表示言語"
            description="英語表示は未対応です（UI 文言の国際化は今後の対応予定）。"
          >
            <Segmented
              ariaLabel="表示言語"
              value={settings.language}
              onChange={(language) => updateSettings({ language })}
              options={[
                { value: "ja", label: "日本語" },
                {
                  value: "en",
                  label: "English",
                  disabled: true,
                  title: "未対応",
                },
              ]}
            />
          </SettingRow>
        </CardBody>
      </Card>

      {/* ファシリテーター向けコントロール */}
      <Card>
        <CardHeader
          title="進行コントロール"
          description="ファシリテーター・デモ用の操作"
          icon={<Icon name="shield" className="h-5 w-5" />}
          action={<Badge tone="warning">ファシリテーター</Badge>}
        />
        <CardBody>
          <SettingRow
            label="ターンの移動"
            description="決算を行わずにターンだけを移動します。資金と信頼度は変化しません（デモ用）。"
          >
            <Segmented
              ariaLabel="ターンの移動"
              value={state.turn}
              onChange={jumpToTurn}
              options={turnOptions.map((n) => ({
                value: n,
                label: `${n}年目`,
                disabled: n > state.totalTurns,
                title:
                  n > state.totalTurns
                    ? `総ターン数が${state.totalTurns}年に設定されています`
                    : undefined,
              }))}
            />
          </SettingRow>

          <div className="py-3.5">
            <p className="text-[13px] font-bold text-navy-900">
              ゲームをリセット
            </p>
            <p className="mt-0.5 text-[11px] leading-relaxed text-navy-400">
              {modeConfig.label}の1年目の初期状態（資金{" "}
              {money(modeConfig.initialFunds)} / 信頼度{" "}
              {modeConfig.initialTrust}
              ）に戻します。購入済みレポート、マーケティング履歴、参加チームの変更もすべて破棄されます。
            </p>

            {confirmingReset ? (
              <div className="mt-2.5 rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-3">
                <p className="flex items-start gap-2 text-[13px] text-rose-700">
                  <Icon name="alert" className="mt-0.5 h-4 w-4 shrink-0" />
                  現在の進行状況は復元できません。リセットを実行しますか？
                </p>
                <div className="mt-2.5 flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => {
                      resetGame();
                      setConfirmingReset(false);
                    }}
                  >
                    リセットを実行
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setConfirmingReset(false)}
                  >
                    キャンセル
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                variant="secondary"
                size="md"
                className="mt-2.5"
                onClick={() => setConfirmingReset(true)}
              >
                <Icon name="alert" className="h-4 w-4" />
                リセットする
              </Button>
            )}
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
