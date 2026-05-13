export declare class OutputFormatter {
    static formatJson(data: unknown): string;
    static formatTable(headers: string[], rows: string[][], columnWidths?: number[]): string;
    static formatKeyValue(pairs: Record<string, string | number | boolean>): string;
}
//# sourceMappingURL=output-formatter.d.ts.map