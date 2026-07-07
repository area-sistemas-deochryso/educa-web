// * Brief 102 — tests del widget presentacional Runtime Health.
// #region Imports
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { describe, expect, it, beforeEach } from 'vitest';

import { RuntimeHealthWidgetComponent } from './runtime-health-widget.component';
import { RuntimeHealthSnapshot, SaturationPattern } from '../../models/runtime-health.models';
// #endregion

// #region Factories
function makeSnapshot(
	overrides: Partial<RuntimeHealthSnapshot> = {},
): RuntimeHealthSnapshot {
	return {
		generatedAt: '2026-05-05T10:00:00',
		pattern: 'OK',
		patternReason: 'all metrics within thresholds',
		threadPool: {
			workerThreadsBusy: 5,
			workerThreadsMax: 100,
			completionPortBusy: 0,
			completionPortMax: 100,
			queueLength: 0,
			completedItemsCount: 12345,
		},
		requests: {
			inFlight: 2,
			p50Ms: 8,
			p95Ms: 32,
			p99Ms: 64,
			countLast5Min: 250,
		},
		gc: {
			gen0Collections: 100,
			gen1Collections: 20,
			gen2Collections: 2,
			heapSizeBytes: 50 * 1024 * 1024,
			totalAllocatedBytes: 500 * 1024 * 1024,
		},
		...overrides,
	};
}

function withPattern(pattern: SaturationPattern): RuntimeHealthSnapshot {
	return makeSnapshot({ pattern });
}
// #endregion

describe('RuntimeHealthWidgetComponent', () => {
	let fixture: ComponentFixture<RuntimeHealthWidgetComponent>;
	let component: RuntimeHealthWidgetComponent;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [RuntimeHealthWidgetComponent],
		}).compileComponents();

		fixture = TestBed.createComponent(RuntimeHealthWidgetComponent);
		component = fixture.componentInstance;
	});

	it('renderiza estado vacío sin snapshot ni loading', () => {
		fixture.componentRef.setInput('snapshot', null);
		fixture.componentRef.setInput('loading', false);
		fixture.detectChanges();

		const text = fixture.nativeElement.textContent as string;
		expect(text).toContain('Sin datos');
	});

	it('renderiza tag con label OK cuando el patrón es OK', () => {
		fixture.componentRef.setInput('snapshot', withPattern('OK'));
		fixture.detectChanges();

		expect(component.patternLabel()).toBe('OK');
		expect(component.patternSeverity()).toBe('success');
		expect(component.showTelemetryWarning()).toBe(false);
	});

	it('mapea STARVATION → severity warn + icon clock', () => {
		fixture.componentRef.setInput('snapshot', withPattern('STARVATION'));
		fixture.detectChanges();

		expect(component.patternSeverity()).toBe('warn');
		expect(component.patternIcon()).toBe('pi pi-clock');
	});

	it('mapea OVERLOAD → severity danger + icon exclamation', () => {
		fixture.componentRef.setInput('snapshot', withPattern('OVERLOAD'));
		fixture.detectChanges();

		expect(component.patternSeverity()).toBe('danger');
		expect(component.patternIcon()).toBe('pi pi-exclamation-triangle');
	});

	it('detecta fallback INV-S07 — UNKNOWN con counters en 0', () => {
		const empty: RuntimeHealthSnapshot = {
			generatedAt: '2026-05-05T10:00:00',
			pattern: 'UNKNOWN',
			patternReason: 'telemetry failure',
			threadPool: {
				workerThreadsBusy: 0,
				workerThreadsMax: 0,
				completionPortBusy: 0,
				completionPortMax: 0,
				queueLength: 0,
				completedItemsCount: 0,
			},
			requests: { inFlight: 0, p50Ms: 0, p95Ms: 0, p99Ms: 0, countLast5Min: 0 },
			gc: {
				gen0Collections: 0,
				gen1Collections: 0,
				gen2Collections: 0,
				heapSizeBytes: 0,
				totalAllocatedBytes: 0,
			},
		};
		fixture.componentRef.setInput('snapshot', empty);
		fixture.detectChanges();

		expect(component.showTelemetryWarning()).toBe(true);
	});

	it('convierte heapSizeBytes a MB correctamente', () => {
		const snap = makeSnapshot({
			gc: {
				gen0Collections: 0,
				gen1Collections: 0,
				gen2Collections: 0,
				heapSizeBytes: 100 * 1024 * 1024,
				totalAllocatedBytes: 1024 * 1024 * 1024,
			},
		});
		fixture.componentRef.setInput('snapshot', snap);
		fixture.detectChanges();

		expect(component.heapMb()).toBe(100);
		expect(component.totalAllocatedMb()).toBe(1024);
	});

	it('emite refresh al hacer click en el botón', () => {
		fixture.componentRef.setInput('snapshot', makeSnapshot());
		let emitted = false;
		component.refresh.subscribe(() => (emitted = true));
		component.onRefreshClick();
		expect(emitted).toBe(true);
	});

	it('emite collapsedChange al togglear', () => {
		fixture.componentRef.setInput('collapsed', false);
		let value: boolean | undefined;
		component.collapsedChange.subscribe((v) => (value = v));
		component.onCollapsedToggle();
		expect(value).toBe(true);
	});
});
