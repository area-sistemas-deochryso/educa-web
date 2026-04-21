// * Tests for consolidated-pdf.helper (Plan 25 Chat 4).
// * Covers buildPdfExcelMenuItems (3-item menu contract) and the
// * getTodosSalonesObservable / getTodosSalonesExcelObservable switch dispatch.
// * Single source of truth for the menu structure used across the 5 migrated pages,
// * per "aprendizaje transferible #2" of the Chat 4 handoff.

// #region Imports
import { describe, expect, it, vi } from 'vitest';
import { of } from 'rxjs';

import type { AttendanceService } from '@core/services';
import {
	buildPdfExcelMenuItems,
	getConsolidadoFileName,
	getInicioSemana,
	getTodosSalonesExcelObservable,
	getTodosSalonesObservable,
} from './consolidated-pdf.helper';
// #endregion

describe('buildPdfExcelMenuItems', () => {
	const mkActions = () => ({
		verPdf: vi.fn(),
		descargarPdf: vi.fn(),
		descargarExcel: vi.fn(),
	});

	it('builds menu with 3 items (Ver PDF / Descargar PDF / Descargar Excel)', () => {
		const items = buildPdfExcelMenuItems(mkActions());

		expect(items).toHaveLength(3);
		expect(items[0].label).toBe('Ver PDF');
		expect(items[1].label).toBe('Descargar PDF');
		expect(items[2].label).toBe('Descargar Excel');
	});

	it('uses the pdf/excel icons in the expected order', () => {
		const items = buildPdfExcelMenuItems(mkActions());

		expect(items[0].icon).toBe('pi pi-file-pdf');
		expect(items[1].icon).toBe('pi pi-file-pdf');
		expect(items[2].icon).toBe('pi pi-file-excel');
	});

	it('dispatches to the right callback when each item command runs', () => {
		const actions = mkActions();

		const items = buildPdfExcelMenuItems(actions);
		items[0].command?.({} as never);
		items[1].command?.({} as never);
		items[2].command?.({} as never);

		expect(actions.verPdf).toHaveBeenCalledTimes(1);
		expect(actions.descargarPdf).toHaveBeenCalledTimes(1);
		expect(actions.descargarExcel).toHaveBeenCalledTimes(1);
	});

	it('appends labelSuffix when provided', () => {
		const items = buildPdfExcelMenuItems({
			...mkActions(),
			labelSuffix: '(del mes)',
		});

		expect(items[0].label).toBe('Ver PDF (del mes)');
		expect(items[1].label).toBe('Descargar PDF (del mes)');
		expect(items[2].label).toBe('Descargar Excel (del mes)');
	});

	it('does not append a space-only prefix when labelSuffix is missing', () => {
		const items = buildPdfExcelMenuItems(mkActions());

		// Sin labelSuffix los labels NO deben terminar en espacio extra.
		for (const item of items) {
			expect(item.label).not.toMatch(/\s$/);
		}
	});
});

describe('getTodosSalonesObservable', () => {
	const mkService = () =>
		({
			descargarPdfTodosSalonesDia: vi.fn().mockReturnValue(of(new Blob())),
			descargarPdfTodosSalonesSemana: vi.fn().mockReturnValue(of(new Blob())),
			descargarPdfTodosSalonesMes: vi.fn().mockReturnValue(of(new Blob())),
			descargarPdfTodosSalonesAnio: vi.fn().mockReturnValue(of(new Blob())),
		}) as Partial<AttendanceService> as AttendanceService;

	const fecha = new Date(2026, 3, 20); // 20-abr-2026 (lunes)

	it('routes "todos-dia" to descargarPdfTodosSalonesDia', () => {
		const service = mkService();
		getTodosSalonesObservable(service, 'todos-dia', fecha);

		expect(service.descargarPdfTodosSalonesDia).toHaveBeenCalledWith(fecha);
	});

	it('routes "todos-semana" to descargarPdfTodosSalonesSemana with computed Monday', () => {
		const service = mkService();
		getTodosSalonesObservable(service, 'todos-semana', fecha);

		const monday = getInicioSemana(fecha);
		expect(service.descargarPdfTodosSalonesSemana).toHaveBeenCalledWith(monday);
	});

	it('routes "todos-mes" with mes+anio derived from fecha', () => {
		const service = mkService();
		getTodosSalonesObservable(service, 'todos-mes', fecha);

		expect(service.descargarPdfTodosSalonesMes).toHaveBeenCalledWith(4, 2026);
	});

	it('routes "todos-anio" with anio derived from fecha', () => {
		const service = mkService();
		getTodosSalonesObservable(service, 'todos-anio', fecha);

		expect(service.descargarPdfTodosSalonesAnio).toHaveBeenCalledWith(2026);
	});

	it('returns null for "salon-*" tipos (only handles consolidated)', () => {
		const service = mkService();

		expect(getTodosSalonesObservable(service, 'salon-dia', fecha)).toBeNull();
		expect(getTodosSalonesObservable(service, 'salon-mes', fecha)).toBeNull();
		expect(getTodosSalonesObservable(service, 'salon-anio', fecha)).toBeNull();
	});
});

describe('getTodosSalonesExcelObservable', () => {
	const mkService = () =>
		({
			descargarExcelTodosSalonesDia: vi.fn().mockReturnValue(of(new Blob())),
			descargarExcelTodosSalonesSemana: vi.fn().mockReturnValue(of(new Blob())),
			descargarExcelTodosSalonesMes: vi.fn().mockReturnValue(of(new Blob())),
			descargarExcelTodosSalonesAnio: vi.fn().mockReturnValue(of(new Blob())),
		}) as Partial<AttendanceService> as AttendanceService;

	const fecha = new Date(2026, 3, 20);

	it('routes "todos-dia" to descargarExcelTodosSalonesDia', () => {
		const service = mkService();
		getTodosSalonesExcelObservable(service, 'todos-dia', fecha);

		expect(service.descargarExcelTodosSalonesDia).toHaveBeenCalledWith(fecha);
	});

	it('routes "todos-mes" with mes+anio derived from fecha', () => {
		const service = mkService();
		getTodosSalonesExcelObservable(service, 'todos-mes', fecha);

		expect(service.descargarExcelTodosSalonesMes).toHaveBeenCalledWith(4, 2026);
	});

	it('mirrors the PDF switch (paridad estructural)', () => {
		// Protege contra drift: si alguien agrega un nuevo tipo consolidado al PDF
		// helper, el Excel helper debe agregarlo también. Este test verifica que
		// los dos switches cubren exactamente los mismos 4 tipos "todos-*".
		const service = {
			descargarPdfTodosSalonesDia: vi.fn().mockReturnValue(of(new Blob())),
			descargarPdfTodosSalonesSemana: vi.fn().mockReturnValue(of(new Blob())),
			descargarPdfTodosSalonesMes: vi.fn().mockReturnValue(of(new Blob())),
			descargarPdfTodosSalonesAnio: vi.fn().mockReturnValue(of(new Blob())),
			descargarExcelTodosSalonesDia: vi.fn().mockReturnValue(of(new Blob())),
			descargarExcelTodosSalonesSemana: vi.fn().mockReturnValue(of(new Blob())),
			descargarExcelTodosSalonesMes: vi.fn().mockReturnValue(of(new Blob())),
			descargarExcelTodosSalonesAnio: vi.fn().mockReturnValue(of(new Blob())),
		} as Partial<AttendanceService> as AttendanceService;
		const tipos = ['todos-dia', 'todos-semana', 'todos-mes', 'todos-anio'] as const;

		for (const tipo of tipos) {
			expect(getTodosSalonesObservable(service, tipo, fecha)).not.toBeNull();
			expect(getTodosSalonesExcelObservable(service, tipo, fecha)).not.toBeNull();
		}
	});
});

describe('getConsolidadoFileName', () => {
	const fecha = new Date(2026, 3, 20); // 20-abr-2026

	it('uses ".pdf" extension by default', () => {
		expect(getConsolidadoFileName('todos-dia', fecha)).toMatch(/\.pdf$/);
	});

	it('accepts "xlsx" as extension', () => {
		expect(getConsolidadoFileName('todos-dia', fecha, 'xlsx'))
			.toMatch(/\.xlsx$/);
	});

	it('formats consolidado mensual with year-MM pattern', () => {
		expect(getConsolidadoFileName('todos-mes', fecha, 'xlsx'))
			.toBe('Reporte_TodosSalones_2026-04.xlsx');
	});

	it('formats consolidado anual with just year', () => {
		expect(getConsolidadoFileName('todos-anio', fecha, 'xlsx'))
			.toBe('Reporte_TodosSalones_2026.xlsx');
	});
});
