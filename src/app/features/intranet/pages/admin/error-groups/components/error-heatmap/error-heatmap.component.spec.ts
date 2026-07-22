import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ErrorHeatmapComponent } from './error-heatmap.component';

describe('ErrorHeatmapComponent', () => {
	let fixture: ComponentFixture<ErrorHeatmapComponent>;
	let component: ErrorHeatmapComponent;

	beforeEach(() => {
		TestBed.configureTestingModule({
			imports: [ErrorHeatmapComponent],
		});
		fixture = TestBed.createComponent(ErrorHeatmapComponent);
		component = fixture.componentInstance;
	});

	// #region Drill-down del heatmap-calendario (brief 432 P68 F8.2)
	// Reemplazado por `ErrorHeatmapSeverityChartComponent` (brief 472 P68 F10) — el gate
	// de count > 0 se prueba ahí (`onPointClick`). Acá solo se prueba el reenvío al padre.
	it('reenvía cellClick del chart de severidad tal cual, sin transformar la fecha', () => {
		fixture.detectChanges();

		const spy = vi.fn();
		component.cellClick.subscribe(spy);

		component.onSeverityChartCellClick('2026-07-10');

		expect(spy).toHaveBeenCalledWith('2026-07-10');
	});
	// #endregion
});
