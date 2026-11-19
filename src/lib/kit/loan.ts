/** Mortgage maths for 等额本息 (equal payments) and 等额本金 (equal principal). Amounts in 元, unrounded. */

export type LoanMethod = "annuity" | "linear";

export type LoanInput = {
  principal: number;
  annualRate: number;
  months: number;
  method: LoanMethod;
};

export type ScheduleRow = {
  period: number;
  payment: number;
  principal: number;
  interest: number;
  remaining: number;
};

export function monthlyRate(annualRatePercent: number): number {
  return annualRatePercent / 12 / 100;
}

/** P·r·(1+r)^n / ((1+r)^n − 1), or P/n when the rate is zero. */
export function annuityPayment(principal: number, annualRate: number, months: number): number {
  const r = monthlyRate(annualRate);
  if (r === 0) return principal / months;
  const growth = (1 + r) ** months;
  return (principal * r * growth) / (growth - 1);
}

export function buildSchedule({ principal, annualRate, months, method }: LoanInput): ScheduleRow[] {
  const r = monthlyRate(annualRate);
  const fixedPayment = annuityPayment(principal, annualRate, months);
  const fixedPrincipal = principal / months;
  const rows: ScheduleRow[] = [];
  let remaining = principal;
  for (let period = 1; period <= months; period++) {
    const interest = remaining * r;
    let principalPart = method === "annuity" ? fixedPayment - interest : fixedPrincipal;
    if (period === months) principalPart = remaining;
    remaining = period === months ? 0 : remaining - principalPart;
    rows.push({
      period,
      payment: principalPart + interest,
      principal: principalPart,
      interest,
      remaining,
    });
  }
  return rows;
}

/** Adds two schedules month by month (公积金 + 商贷 组合贷). */
export function combineSchedules(a: ScheduleRow[], b: ScheduleRow[]): ScheduleRow[] {
  const length = Math.max(a.length, b.length);
  const empty = { payment: 0, principal: 0, interest: 0, remaining: 0 };
  return Array.from({ length }, (_, index) => {
    const x = a[index] ?? empty;
    const y = b[index] ?? empty;
    return {
      period: index + 1,
      payment: x.payment + y.payment,
      principal: x.principal + y.principal,
      interest: x.interest + y.interest,
      remaining: x.remaining + y.remaining,
    };
  });
}

export type LoanSummary = {
  principal: number;
  totalInterest: number;
  totalPayment: number;
  firstPayment: number;
  lastPayment: number;
  /** How much the payment drops each month (等额本金); 0 for 等额本息. */
  monthlyDecrease: number;
};

export function summarize(rows: ScheduleRow[]): LoanSummary {
  let principal = 0;
  let totalInterest = 0;
  for (const row of rows) {
    principal += row.principal;
    totalInterest += row.interest;
  }
  const firstPayment = rows[0]?.payment ?? 0;
  const secondPayment = rows[1]?.payment ?? firstPayment;
  return {
    principal,
    totalInterest,
    totalPayment: principal + totalInterest,
    firstPayment,
    lastPayment: rows.at(-1)?.payment ?? 0,
    monthlyDecrease: Math.max(0, firstPayment - secondPayment),
  };
}

export type LoanPart = { principal: number; annualRate: number };

export function calculate(parts: LoanPart[], months: number, method: LoanMethod): ScheduleRow[] {
  return parts
    .map((part) => buildSchedule({ ...part, months, method }))
    .reduce<ScheduleRow[]>(
      (total, rows) => (total.length ? combineSchedules(total, rows) : rows),
      [],
    );
}

export type YearGroup = {
  year: number;
  rows: ScheduleRow[];
  payment: number;
  principal: number;
  interest: number;
};

export function groupByYear(rows: ScheduleRow[]): YearGroup[] {
  const groups: YearGroup[] = [];
  for (const row of rows) {
    const year = Math.ceil(row.period / 12);
    let group = groups[year - 1];
    if (!group) {
      group = { year, rows: [], payment: 0, principal: 0, interest: 0 };
      groups.push(group);
    }
    group.rows.push(row);
    group.payment += row.payment;
    group.principal += row.principal;
    group.interest += row.interest;
  }
  return groups;
}

export function formatMoney(value: number, symbol = true): string {
  const safe = Math.abs(value) < 0.005 ? 0 : value;
  const text = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(safe);
  return symbol ? `¥${text}` : text;
}
