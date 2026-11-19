import { FEATURE_KEYS, FEATURES, FREE_QUOTAS, MEMBER_QUOTAS } from "@/resources/plans";
import styles from "./QuotaTable.module.scss";

export function QuotaTable({ includeFreeTools = false }: { includeFreeTools?: boolean }) {
  return (
    <div className={styles.wrap}>
      <table className={styles.table}>
        <caption className="visually-hidden">每日额度对比</caption>
        <thead>
          <tr>
            <th scope="col">每日额度</th>
            <th scope="col">免费版</th>
            <th scope="col">会员</th>
          </tr>
        </thead>
        <tbody>
          {FEATURE_KEYS.map((key) => (
            <tr key={key}>
              <th scope="row">{FEATURES[key].label}</th>
              <td>
                {FREE_QUOTAS[key]} {FEATURES[key].unit}
              </td>
              <td className={styles.member}>
                {MEMBER_QUOTAS[key]} {FEATURES[key].unit}
              </td>
            </tr>
          ))}
          {includeFreeTools && (
            <tr>
              <th scope="row">格式转换</th>
              <td>不限次</td>
              <td className={styles.member}>不限次</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
