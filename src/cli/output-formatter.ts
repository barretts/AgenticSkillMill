export class OutputFormatter {
  static formatJson(data: unknown): string {
    return JSON.stringify(data, null, 2);
  }

  static formatTable(
    headers: string[],
    rows: string[][],
    columnWidths?: number[],
  ): string {
    const widths =
      columnWidths ||
      headers.map((h, i) =>
        Math.max(h.length, ...rows.map((r) => (r[i] || '').length)),
      );

    const separator = widths.map((w) => '-'.repeat(w + 2)).join('+');
    const formatRow = (cells: string[]) =>
      cells.map((c, i) => ` ${(c || '').padEnd(widths[i])} `).join('|');

    return [formatRow(headers), separator, ...rows.map(formatRow)].join('\n');
  }

  static formatKeyValue(pairs: Record<string, string | number | boolean>): string {
    const maxKey = Math.max(...Object.keys(pairs).map((k) => k.length));
    return Object.entries(pairs)
      .map(([k, v]) => `  ${k.padEnd(maxKey)}  ${v}`)
      .join('\n');
  }
}
