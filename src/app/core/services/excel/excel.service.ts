import { Injectable } from '@angular/core';
import { logger } from '@core/helpers';

// #region Types
export interface ExcelColumnDef {
	header: string;
	key: string;
	width: number;
}

export interface ExcelHeaderStyle {
	bold: boolean;
	fontColor: string;
	bgColor: string;
	height: number;
}

export interface ExcelExportConfig<T> {
	sheetName: string;
	columns: ExcelColumnDef[];
	data: T[];
	fileName: string;
	headerStyle?: ExcelHeaderStyle;
}

export interface ExcelImportResult<T> {
	sheetName: string;
	data: T[];
}
// #endregion

const DEFAULT_HEADER_STYLE: ExcelHeaderStyle = {
	bold: true,
	fontColor: 'FFFFFFFF',
	bgColor: 'FF4F46E5',
	height: 25,
};

// #region Service
@Injectable({ providedIn: 'root' })
export class ExcelService {
	// #region Export

	async exportToXlsx<T extends Record<string, unknown>>(config: ExcelExportConfig<T>): Promise<void> {
		const ExcelJS = await this.loadExcelJS();

		if (ExcelJS) {
			this.exportWithExcelJS(ExcelJS, config);
			return;
		}

		// Fallback: CSV nativo (se abre en Excel sin problemas)
		logger.warn('ExcelJS no disponible — exportando como CSV');
		this.exportAsCsv(config);
	}

	// #endregion

	// #region Import

	async parseXlsx(buffer: ArrayBuffer): Promise<ExcelImportResult<Record<string, unknown>>[]> {
		const XLSX = await this.loadXLSX();

		if (XLSX) {
			const wb = XLSX.read(buffer, { type: 'array' });
			return wb.SheetNames.map((sheetName: string) => ({
				sheetName,
				data: XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { defval: '' }) as Record<string, unknown>[],
			}));
		}

		// Fallback: intentar parsear como CSV (el usuario puede exportar desde Excel a CSV)
		logger.warn('xlsx no disponible — intentando parsear como CSV');
		return this.parseAsCsv(buffer);
	}

	// #endregion

	// #region ExcelJS export (librería)

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	private async exportWithExcelJS(ExcelJS: any, config: ExcelExportConfig<Record<string, unknown>>): Promise<void> {
		const workbook = new ExcelJS.Workbook();
		const sheet = workbook.addWorksheet(config.sheetName);
		const style = config.headerStyle ?? DEFAULT_HEADER_STYLE;

		sheet.columns = config.columns.map((c) => ({
			header: c.header,
			key: c.key,
			width: c.width,
		}));

		const headerRow = sheet.getRow(1);
		headerRow.font = { bold: style.bold, color: { argb: style.fontColor } };
		headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: style.bgColor } };
		headerRow.alignment = { horizontal: 'center', vertical: 'middle' };
		headerRow.height = style.height;

		for (const row of config.data) {
			sheet.addRow(row);
		}

		const buffer = await workbook.xlsx.writeBuffer();
		this.downloadBlob(
			new Blob([buffer instanceof ArrayBuffer ? buffer : new Uint8Array(buffer)], {
				type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
			}),
			config.fileName,
		);
	}

	// #endregion

	// #region Fallback CSV export (sin dependencias)

	private exportAsCsv<T extends Record<string, unknown>>(config: ExcelExportConfig<T>): void {
		const BOM = '\uFEFF'; // Para que Excel interprete UTF-8
		const separator = ';'; // Punto y coma funciona mejor con Excel en español

		const header = config.columns.map((c) => this.escapeCsvField(c.header, separator)).join(separator);

		const rows = config.data.map((row) =>
			config.columns.map((col) => this.escapeCsvField(String(row[col.key] ?? ''), separator)).join(separator),
		);

		const csv = BOM + [header, ...rows].join('\r\n');
		const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
		const csvFileName = config.fileName.replace(/\.xlsx$/i, '.csv');
		this.downloadBlob(blob, csvFileName);
	}

	private escapeCsvField(value: string, separator: string): string {
		if (value.includes(separator) || value.includes('"') || value.includes('\n')) {
			return `"${value.replace(/"/g, '""')}"`;
		}
		return value;
	}

	// #endregion

	// #region Fallback CSV import (sin dependencias)

	private parseAsCsv(buffer: ArrayBuffer): ExcelImportResult<Record<string, unknown>>[] {
		const text = new TextDecoder('utf-8').decode(buffer);
		const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0);

		if (lines.length < 2) return [];

		// Detectar separador (punto y coma o coma)
		const separator = lines[0].includes(';') ? ';' : ',';
		const headers = this.parseCsvLine(lines[0], separator);

		const data: Record<string, unknown>[] = [];
		for (let i = 1; i < lines.length; i++) {
			const values = this.parseCsvLine(lines[i], separator);
			const row: Record<string, unknown> = {};
			headers.forEach((h, idx) => {
				row[h] = values[idx] ?? '';
			});
			data.push(row);
		}

		return [{ sheetName: 'Sheet1', data }];
	}

	private parseCsvLine(line: string, separator: string): string[] {
		const fields: string[] = [];
		let current = '';
		let inQuotes = false;

		for (let i = 0; i < line.length; i++) {
			const char = line[i];

			if (inQuotes) {
				if (char === '"' && line[i + 1] === '"') {
					current += '"';
					i++; // Saltar comilla escapada
				} else if (char === '"') {
					inQuotes = false;
				} else {
					current += char;
				}
			} else {
				if (char === '"') {
					inQuotes = true;
				} else if (char === separator) {
					fields.push(current.trim());
					current = '';
				} else {
					current += char;
				}
			}
		}
		fields.push(current.trim());
		return fields;
	}

	// #endregion

	// #region Lazy loaders

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	private async loadExcelJS(): Promise<any | null> {
		try {
			const mod = await import('exceljs');
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const resolved = mod as any;
			const WorkbookClass = resolved.Workbook ?? resolved.default?.Workbook;
			return { Workbook: WorkbookClass };
		} catch {
			return null;
		}
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	private async loadXLSX(): Promise<any | null> {
		try {
			return await import('xlsx');
		} catch {
			return null;
		}
	}

	// #endregion

	// #region Helpers

	private downloadBlob(blob: Blob, fileName: string): void {
		const url = URL.createObjectURL(blob);
		const link = document.createElement('a');
		link.href = url;
		link.download = fileName;
		link.click();
		URL.revokeObjectURL(url);
	}

	// #endregion
}
// #endregion
