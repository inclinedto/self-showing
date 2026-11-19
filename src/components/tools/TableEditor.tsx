"use client";

import { Button, Column, IconButton, Input, Row, Tag, Text, useToast } from "@once-ui-system/core";
import { copyAsTsv, exportCsv } from "@/lib/export";
import type { ExtractedTable } from "@/lib/types";
import styles from "./TableEditor.module.scss";

type TableEditorProps = {
  table: ExtractedTable;
  fileName: string;
  onChange: (table: ExtractedTable) => void;
  onRemove: () => void;
};

export function TableEditor({ table, fileName, onChange, onRemove }: TableEditorProps) {
  const { addToast } = useToast();

  const setHeader = (column: number, value: string) =>
    onChange({ ...table, headers: table.headers.map((h, i) => (i === column ? value : h)) });

  const setCell = (row: number, column: number, value: string) =>
    onChange({
      ...table,
      rows: table.rows.map((cells, r) =>
        r === row ? cells.map((cell, c) => (c === column ? value : cell)) : cells,
      ),
    });

  const addRow = () => onChange({ ...table, rows: [...table.rows, table.headers.map(() => "")] });

  const removeRow = (row: number) =>
    onChange({ ...table, rows: table.rows.filter((_, r) => r !== row) });

  const copy = async () => {
    try {
      await copyAsTsv(table);
      addToast({ variant: "success", message: "已复制，可直接粘贴到 Excel / WPS" });
    } catch {
      addToast({ variant: "danger", message: "复制失败，请改用下载" });
    }
  };

  return (
    <Column
      fillWidth
      gap="12"
      padding="16"
      radius="l"
      border="neutral-alpha-weak"
      background="surface"
    >
      <Row fillWidth gap="12" vertical="center" s={{ direction: "column", vertical: "start" }}>
        <Row flex={1} fillWidth>
          <Input
            id={`title-${table.id}`}
            label="表格标题"
            value={table.title}
            onChange={(event) => onChange({ ...table, title: event.target.value })}
          />
        </Row>
        <Row gap="8" vertical="center">
          <Tag size="s" variant="neutral" label={table.source} />
          <Text variant="body-default-xs" onBackground="neutral-weak">
            {table.rows.length} 行 × {table.headers.length} 列
          </Text>
          <IconButton
            icon="clipboard"
            variant="secondary"
            size="s"
            tooltip="复制表格"
            onClick={copy}
          />
          <IconButton
            icon="download"
            variant="secondary"
            size="s"
            tooltip="下载 CSV"
            onClick={() => exportCsv(table, fileName)}
          />
          <IconButton
            icon="trash"
            variant="secondary"
            size="s"
            tooltip="删除表格"
            onClick={onRemove}
          />
        </Row>
      </Row>
      <div className={styles.scroller}>
        <table className={styles.table}>
          <thead>
            <tr>
              {table.headers.map((header, column) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: cells have no ids; inputs are controlled
                <th key={`h-${column}`}>
                  <input
                    value={header}
                    aria-label={`第 ${column + 1} 列表头`}
                    onChange={(event) => setHeader(column, event.target.value)}
                  />
                </th>
              ))}
              <th aria-label="操作" />
            </tr>
          </thead>
          <tbody>
            {table.rows.map((cells, row) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: rows have no ids; inputs are controlled
              <tr key={`r-${row}`}>
                {cells.map((cell, column) => (
                  // biome-ignore lint/suspicious/noArrayIndexKey: cells have no ids; inputs are controlled
                  <td key={`c-${row}-${column}`}>
                    <input
                      value={cell}
                      aria-label={`第 ${row + 1} 行第 ${column + 1} 列`}
                      onChange={(event) => setCell(row, column, event.target.value)}
                    />
                  </td>
                ))}
                <td>
                  <div className={styles.rowAction}>
                    <IconButton
                      icon="close"
                      variant="ghost"
                      size="s"
                      tooltip="删除这一行"
                      onClick={() => removeRow(row)}
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Row>
        <Button variant="tertiary" size="s" prefixIcon="plus" onClick={addRow}>
          添加一行
        </Button>
      </Row>
    </Column>
  );
}
