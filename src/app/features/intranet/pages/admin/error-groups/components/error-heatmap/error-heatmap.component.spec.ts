import { ComponentRef } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { HeatmapCalendarCell } from '../../models';
import { ErrorHeatmapComponent } from './error-heatmap.component';

describe('ErrorHeatmapComponent', () => {
	let fixture: ComponentFixture<ErrorHeatmapComponent>;
	let component: ErrorHeatmapComponent;
	let componentRef: ComponentRef<ErrorHeatmapComponent>;

	beforeEach(() => {
		TestBed.configureTestingModule({
			imports: [ErrorHeatmapComponent],
		});
		fixture = TestBed.createComponent(ErrorHeatmapComponent);
		component = fixture.componentInstance;
		componentRef = fixture.componentRef;
	});

	// #region Drill-down del heatmap (brief 432 — P68 F8.2)
	it('emite cellClick con la fecha ISO al clickear una celda de calendario con count > 0', () => {
		const cells: HeatmapCalendarCell[] = [
			{ date: '2026-07-10', count: 5, avgDurationMs: 120 },
		];
		componentRef.setInput('calendarCells', cells);
		componentRef.setInput('totalDays', 30);
		componentRef.setInput('endDate', new Date('2026-07-10T00:00:00'));
		fixture.detectChanges();

		const spy = vi.fn();
		component.cellClick.subscribe(spy);

		const targetCell = component
			.calendarGrid()
			.flat()
			.find((c) => c.dateIso === '2026-07-10');

		expect(targetCell).toBeDefined();
		component.onCalendarCellClick(targetCell!);

		expect(spy).toHaveBeenCalledWith('2026-07-10');
	});

	it('no emite cellClick para una celda sin ocurrencias (count === 0)', () => {
		// Un cell fuera de la ventana visible evita el early-return de calendarGrid()
		// ante `raw.length === 0`, sin afectar el count de los días mostrados.
		const cells: HeatmapCalendarCell[] = [
			{ date: '2026-01-01', count: 3, avgDurationMs: 50 },
		];
		componentRef.setInput('calendarCells', cells);
		componentRef.setInput('totalDays', 30);
		componentRef.setInput('endDate', new Date('2026-07-10T00:00:00'));
		fixture.detectChanges();

		const spy = vi.fn();
		component.cellClick.subscribe(spy);

		const emptyCell = component.calendarGrid().flat().find((c) => c.date && c.count === 0);
		expect(emptyCell).toBeDefined();
		component.onCalendarCellClick(emptyCell!);

		expect(spy).not.toHaveBeenCalled();
	});
	// #endregion
});
