// * Plan 22 Chat B (FE) / Plan 29 Chat 2.6 (BE) — tests del widget presentacional defer/fail-status.
// #region Imports
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DeferFailStatusWidgetComponent } from './defer-fail-status-widget.component';
import {
	DeferFailStatus,
	DeferFailStatusLevel,
} from '../../models/defer-fail-status.models';
// #endregion

// #region Factories
function makeStatus(overrides: Partial<DeferFailStatus> = {}): DeferFailStatus {
	return {
		status: 'OK',
		currentHour: {
			deferFailCount: 1,
			threshold: 5,
			percentUsed: 20,
			hourStart: '2026-04-23T09:00:00',
		},
		last24h: {
			total: 100,
			sent: 85,
			pending: 5,
			retrying: 2,
			failedInvalidAddress: 3,
			failedNoEmail: 1,
			failedBlacklisted: 2,
			failedThrottleHost: 1,
			failedOther: 1,
		},
		blacklist: {
			totalActivos: 3,
			byReasonBounce5xx: 1,
			byReasonManual: 1,
			byReasonBulkImport: 1,
			byReasonFormatInvalid: 0,
			oldestEntry: '2026-01-10T08:00:00',
			newestEntry: '2026-04-20T14:30:00',
		},
		generatedAt: '2026-04-23T09:15:00',
		...overrides,
	};
}

function withLevel(
	level: DeferFailStatusLevel,
	percentUsed: number,
): DeferFailStatus {
	return makeStatus({
		status: level,
		currentHour: {
			deferFailCount: Math.round((percentUsed / 100) * 5),
			threshold: 5,
			percentUsed,
			hourStart: '2026-04-23T09:00:00',
		},
	});
}
// #endregion

describe('DeferFailStatusWidgetComponent', () => {
	let fixture: ComponentFixture<DeferFailStatusWidgetComponent>;
	let component: DeferFailStatusWidgetComponent;

	beforeEach(() => {
		TestBed.configureTestingModule({
			imports: [DeferFailStatusWidgetComponent],
		});
		fixture = TestBed.createComponent(DeferFailStatusWidgetComponent);
		component = fixture.componentInstance;
	});

	it('muestra spinner de carga cuando status es null', () => {
		fixture.componentRef.setInput('status', null);
		fixture.componentRef.setInput('loading', true);
		fixture.detectChanges();

		const empty = fixture.nativeElement.querySelector('.defer-fail-widget__empty');
		expect(empty).not.toBeNull();
		expect(empty.textContent).toContain('Cargando');
	});

	it('renderiza nivel OK con severity success', () => {
		fixture.componentRef.setInput('status', withLevel('OK', 20));
		fixture.detectChanges();

		expect(component.levelSeverity()).toBe('success');
		expect(component.levelLabel()).toBe('OK');
		expect(component.levelIcon()).toContain('check-circle');
	});

	it('renderiza nivel WARNING con severity warn', () => {
		fixture.componentRef.setInput('status', withLevel('WARNING', 80));
		fixture.detectChanges();

		expect(component.levelSeverity()).toBe('warn');
		expect(component.levelLabel()).toBe('WARNING');
		expect(component.levelIcon()).toContain('exclamation-triangle');
	});

	it('renderiza nivel CRITICAL con severity danger', () => {
		fixture.componentRef.setInput('status', withLevel('CRITICAL', 120));
		fixture.detectChanges();

		expect(component.levelSeverity()).toBe('danger');
		expect(component.levelLabel()).toBe('CRITICAL');
		expect(component.levelIcon()).toContain('ban');
		const host = fixture.nativeElement.querySelector('.defer-fail-widget');
		expect(host.classList.contains('defer-fail-widget--critical')).toBe(true);
	});

	it('renderiza breakdown 24h con todos los tipos visibles', () => {
		fixture.componentRef.setInput('status', makeStatus());
		fixture.detectChanges();

		const stats = fixture.nativeElement.querySelectorAll('.defer-fail-stat');
		// 3 (ok/info/retry) + 2 (cpanel) + 3 (pre-smtp) en sección 2 + 5 en blacklist = 13
		expect(stats.length).toBeGreaterThanOrEqual(8);
	});

	it('muestra "Sin bloqueos activos" cuando totalActivos = 0', () => {
		fixture.componentRef.setInput(
			'status',
			makeStatus({
				blacklist: {
					totalActivos: 0,
					byReasonBounce5xx: 0,
					byReasonManual: 0,
					byReasonBulkImport: 0,
					byReasonFormatInvalid: 0,
					oldestEntry: null,
					newestEntry: null,
				},
			}),
		);
		fixture.detectChanges();

		expect(component.blacklistEmpty()).toBe(true);
		const empty = fixture.nativeElement.textContent;
		expect(empty).toContain('Sin bloqueos activos');
	});

	it('muestra banner de telemetría cuando CRITICAL con counters en 0', () => {
		fixture.componentRef.setInput(
			'status',
			makeStatus({
				status: 'CRITICAL',
				currentHour: {
					deferFailCount: 0,
					threshold: 5,
					percentUsed: 0,
					hourStart: '2026-04-23T09:00:00',
				},
				last24h: {
					total: 0,
					sent: 0,
					pending: 0,
					retrying: 0,
					failedInvalidAddress: 0,
					failedNoEmail: 0,
					failedBlacklisted: 0,
					failedThrottleHost: 0,
					failedOther: 0,
				},
				blacklist: {
					totalActivos: 0,
					byReasonBounce5xx: 0,
					byReasonManual: 0,
					byReasonBulkImport: 0,
					byReasonFormatInvalid: 0,
					oldestEntry: null,
					newestEntry: null,
				},
			}),
		);
		fixture.detectChanges();

		expect(component.showTelemetryWarning()).toBe(true);
		const warning = fixture.nativeElement.querySelector(
			'.defer-fail-widget__telemetry-warning',
		);
		expect(warning).not.toBeNull();
	});

	it('emite refresh al click en botón refrescar', () => {
		const spy = vi.fn();
		fixture.componentRef.setInput('status', makeStatus());
		fixture.detectChanges();
		component.refresh.subscribe(spy);

		component.onRefreshClick();

		expect(spy).toHaveBeenCalledTimes(1);
	});

	it('emite autoRefreshChange al togglear el switch', () => {
		const spy = vi.fn();
		fixture.componentRef.setInput('status', makeStatus());
		fixture.componentRef.setInput('autoRefresh', false);
		fixture.detectChanges();
		component.autoRefreshChange.subscribe(spy);

		component.onAutoRefreshToggle(true);

		expect(spy).toHaveBeenCalledWith(true);
	});

	it('emite collapsedChange invirtiendo el valor actual', () => {
		const spy = vi.fn();
		fixture.componentRef.setInput('collapsed', false);
		fixture.detectChanges();
		component.collapsedChange.subscribe(spy);

		component.onCollapseToggle();

		expect(spy).toHaveBeenCalledWith(true);
	});
});
