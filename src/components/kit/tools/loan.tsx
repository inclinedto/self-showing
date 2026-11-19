"use client";

import { SegmentedControl } from "@once-ui-system/core";
import { Fragment, useMemo, useState } from "react";
import {
  calculate,
  formatMoney,
  groupByYear,
  type LoanMethod,
  type LoanPart,
  type ScheduleRow,
  summarize,
} from "@/lib/kit/loan";
import { Check, ErrorText, kit, Panel, Select, Stat, Stats, TextInput } from "../ui";
import styles from "./loan.module.scss";

const METHOD_LABEL: Record<LoanMethod, string> = { annuity: "等额本息", linear: "等额本金" };

const YEAR_OPTIONS = Array.from({ length: 30 }, (_, index) => ({
  value: String(index + 1),
  label: `${index + 1} 年（${(index + 1) * 12} 期）`,
}));

function parsePart(amount: string, rate: string, name: string): LoanPart | string {
  const wan = Number(amount.trim());
  const annualRate = Number(rate.trim());
  if (!amount.trim() || !Number.isFinite(wan) || wan <= 0)
    return `请填写${name}金额（大于 0 的数字）`;
  if (wan > 100000) return `${name}金额太大了，最多 100000 万元`;
  if (!rate.trim() || !Number.isFinite(annualRate) || annualRate < 0 || annualRate > 36) {
    return `${name}年利率要在 0% 到 36% 之间`;
  }
  return { principal: wan * 10000, annualRate };
}

function Row({ row }: { row: ScheduleRow }) {
  return (
    <tr>
      <td>{row.period}</td>
      <td>{formatMoney(row.payment, false)}</td>
      <td>{formatMoney(row.principal, false)}</td>
      <td>{formatMoney(row.interest, false)}</td>
      <td>{formatMoney(row.remaining, false)}</td>
    </tr>
  );
}

export default function LoanTool() {
  const [amount, setAmount] = useState("100");
  const [years, setYears] = useState("30");
  const [rate, setRate] = useState("3.1");
  const [method, setMethod] = useState<LoanMethod>("annuity");
  const [combo, setCombo] = useState(false);
  const [fundAmount, setFundAmount] = useState("50");
  const [fundRate, setFundRate] = useState("2.85");
  const [view, setView] = useState("all");

  const months = Number(years) * 12;
  const commercial = parsePart(amount, rate, combo ? "商业贷款" : "贷款");
  const fund = combo ? parsePart(fundAmount, fundRate, "公积金贷款") : null;
  const error =
    typeof commercial === "string" ? commercial : typeof fund === "string" ? fund : undefined;

  const result = useMemo(() => {
    const parts = [
      parsePart(amount, rate, ""),
      ...(combo ? [parsePart(fundAmount, fundRate, "")] : []),
    ];
    if (parts.some((part) => typeof part === "string")) return null;
    const valid = parts as LoanPart[];
    const rows = calculate(valid, months, method);
    const other = summarize(calculate(valid, months, method === "annuity" ? "linear" : "annuity"));
    return {
      summary: summarize(rows),
      otherInterest: other.totalInterest,
      groups: groupByYear(rows),
    };
  }, [amount, rate, combo, fundAmount, fundRate, months, method]);

  const otherMethod = method === "annuity" ? "linear" : "annuity";
  const interestGap = result ? result.otherInterest - result.summary.totalInterest : 0;
  const shownGroups = result
    ? view === "all"
      ? result.groups
      : result.groups.filter((group) => String(group.year) === view)
    : [];

  return (
    <div className={kit.stack}>
      <Panel title="贷款信息">
        <div className={kit.grid3}>
          <TextInput
            label={combo ? "商业贷款金额（万元）" : "贷款金额（万元）"}
            inputMode="decimal"
            value={amount}
            onChange={setAmount}
          />
          <Select label="贷款年限" value={years} onChange={setYears} options={YEAR_OPTIONS} />
          <TextInput
            label={combo ? "商贷年利率（%）" : "年利率（%）"}
            inputMode="decimal"
            value={rate}
            onChange={setRate}
            hint="以合同利率为准（LPR + 加点）"
          />
        </div>
        <SegmentedControl
          selected={method}
          onToggle={(value) => setMethod(value as LoanMethod)}
          buttons={[
            { value: "annuity", label: "等额本息" },
            { value: "linear", label: "等额本金" },
          ]}
        />
        <p className={kit.hint}>
          等额本息每月还款一样多，前期利息占比高；等额本金每月还的本金一样，月供逐月递减，总利息更少。
        </p>
        <Check label="组合贷款（商业贷款 + 公积金贷款）" checked={combo} onChange={setCombo} />
        {combo && (
          <div className={kit.grid2}>
            <TextInput
              label="公积金贷款金额（万元）"
              inputMode="decimal"
              value={fundAmount}
              onChange={setFundAmount}
            />
            <TextInput
              label="公积金年利率（%）"
              inputMode="decimal"
              value={fundRate}
              onChange={setFundRate}
            />
          </div>
        )}
        {error && <ErrorText>{error}</ErrorText>}
      </Panel>

      {result && (
        <Panel title={`计算结果 · ${METHOD_LABEL[method]}`}>
          <div className={styles.money} aria-live="polite">
            <Stats>
              <Stat label="首月月供" value={formatMoney(result.summary.firstPayment)} />
              {method === "linear" && (
                <Stat label="末月月供" value={formatMoney(result.summary.lastPayment)} />
              )}
              <Stat label="支付利息" value={formatMoney(result.summary.totalInterest)} />
              <Stat label="还款总额" value={formatMoney(result.summary.totalPayment)} />
              <Stat label="贷款总额" value={formatMoney(result.summary.principal)} />
            </Stats>
          </div>
          {method === "linear" && (
            <p className={kit.hint}>每月递减约 {formatMoney(result.summary.monthlyDecrease)}。</p>
          )}
          {Math.abs(interestGap) >= 0.005 && (
            <p className={kit.hint}>
              选{METHOD_LABEL[otherMethod]}，利息会{interestGap > 0 ? "多" : "少"}{" "}
              <strong>{formatMoney(Math.abs(interestGap))}</strong>
              {otherMethod === "linear" ? "，但前期月供更高。" : "，但每月月供更平稳。"}
            </p>
          )}
        </Panel>
      )}

      {result && (
        <Panel
          title="还款计划表"
          actions={
            <Select
              label="查看"
              value={view}
              onChange={setView}
              options={[
                { value: "all", label: "全部（按年分组）" },
                ...result.groups.map((group) => ({
                  value: String(group.year),
                  label: `只看第 ${group.year} 年`,
                })),
              ]}
            />
          }
        >
          <div className={kit.tableWrap} style={{ maxHeight: 480, overflowY: "auto" }}>
            <table className={kit.table}>
              <thead>
                <tr>
                  <th scope="col">期数</th>
                  <th scope="col">月供（元）</th>
                  <th scope="col">本金</th>
                  <th scope="col">利息</th>
                  <th scope="col">剩余本金</th>
                </tr>
              </thead>
              <tbody>
                {shownGroups.map((group) => (
                  <Fragment key={group.year}>
                    {group.rows.map((row) => (
                      <Row key={row.period} row={row} />
                    ))}
                    <tr className={styles.subtotal}>
                      <td>第 {group.year} 年合计</td>
                      <td>{formatMoney(group.payment, false)}</td>
                      <td>{formatMoney(group.principal, false)}</td>
                      <td>{formatMoney(group.interest, false)}</td>
                      <td>{formatMoney(group.rows.at(-1)?.remaining ?? 0, false)}</td>
                    </tr>
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
          <p className={kit.hint}>
            按月利率 = 年利率 ÷ 12 计算，结果仅供参考，实际以银行还款计划为准。
          </p>
        </Panel>
      )}
    </div>
  );
}
