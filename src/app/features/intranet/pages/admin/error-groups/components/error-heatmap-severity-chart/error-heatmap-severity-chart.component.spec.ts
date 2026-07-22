import { ComponentRef } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { HeatmapCalendarCell } from '../../models';
import { ErrorHeatmapSeverityChartComponent, buildSeries } from './error-heatmap-severity-chart.component';

describe('ErrorHeatmapSeverityChartComponent', () => {
	let fixture: ComponentFixture<ErrorHeatmapSeverityChartComponent>;
	let component: ErrorHeatmapSeverityChartComponent;
	let componentRef: ComponentRef<ErrorHeatmapSeverityChartComponent>;

	beforeEach(() => {
		TestBed.configureTestingModule({
			imports: [ErrorHeatmapSeverityChartComponent],
		});
		fixture = TestBed.createComponent(ErrorHeatmapSeverityChartComponent);
		component = fixture.componentInstance;
		componentRef = fixture.componentRef;
	});

	it('sin datos, no muestra el canvas y expone hasData() en false', () => {
		fixture.detectChanges();
		expect(component.hasData()).toBe(false);
	});

	// #region Drill-down equivalente al de la grilla reemplazada (brief 432 P68 F8.2)
	it('emite cellClick con la fecha ISO al clickear un punto del timeline con count > 0', () => {
		const spy = vi.fn();
		component.cellClick.subscribe(spy);

		component.onPointClick('2026-07-10', 5);

		expect(spy).toHaveBeenCalledWith('2026-07-10');
	});

	it('no emite cellClick para un punto sin ocurrencias (count === 0)', () => {
		const spy = vi.fn();
		component.cellClick.subscribe(spy);

		component.onPointClick('2026-07-11', 0);

		expect(spy).not.toHaveBeenCalled();
	});
	// #endregion

	// #region Serie apilada por severidad (brief 472 P68 F10)
	it('rellena con 0 las severidades ausentes en el diccionario del BE', () => {
		const cells: HeatmapCalendarCell[] = [
			{ date: '2026-07-10', count: 3, avgDurationMs: 80, countPorSeveridad: { CRITICAL: 3 } },
		];

		const { dates, series } = buildSeries(cells, '2026-07-10', '2026-07-10');

		expect(dates).toEqual(['2026-07-10']);
		expect(series.CRITICAL).toEqual([3]);
		expect(series.ERROR).toEqual([0]);
		expect(series.WARNING).toEqual([0]);
	});

	it('completa con ceros los días del rango sin celda en la respuesta del BE', () => {
		const cells: HeatmapCalendarCell[] = [
			{ date: '2026-07-10', count: 2, avgDurationMs: 50, countPorSeveridad: { ERROR: 2 } },
		];

		const { dates, series } = buildSeries(cells, '2026-07-09', '2026-07-11');

		expect(dates).toEqual(['2026-07-09', '2026-07-10', '2026-07-11']);
		expect(series.ERROR).toEqual([0, 2, 0]);
	});

	it('la suma de severidades por día coincide con count del BE', () => {
		const cells: HeatmapCalendarCell[] = [
			{
				date: '2026-07-10',
				count: 6,
				avgDurationMs: 100,
				countPorSeveridad: { CRITICAL: 2, ERROR: 1, WARNING: 3 },
			},
		];

		const { series } = buildSeries(cells, '2026-07-10', '2026-07-10');
		const total = series.CRITICAL[0] + series.ERROR[0] + series.WARNING[0];

		expect(total).toBe(6);
	});
	// #endregion

	it('setInput con calendarCells vacío mantiene hasData() en false sin lanzar', () => {
		componentRef.setInput('cells', []);
		expect(() => fixture.detectChanges()).not.toThrow();
		expect(component.hasData()).toBe(false);
	});
});
