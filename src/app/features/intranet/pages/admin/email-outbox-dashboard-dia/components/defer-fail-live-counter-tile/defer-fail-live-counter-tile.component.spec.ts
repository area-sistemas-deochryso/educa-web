import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { DeferFailLiveCounterTileComponent } from './defer-fail-live-counter-tile.component';
import { DeferFailStatus } from '@features/intranet/pages/admin/email-outbox/models/defer-fail-status.models';

function makeStatus(over: Partial<DeferFailStatus> = {}): DeferFailStatus {
	return {
		status: 'OK',
		currentHour: { deferFailCount: 1, threshold: 5, percentUsed: 20, hourStart: '2026-04-30T10:00:00' },
		last24h: {
			total: 0, sent: 0, pending: 0, retrying: 0,
			failedInvalidAddress: 0, failedNoEmail: 0, failedBlacklisted: 0,
			failedThrottleHost: 0, failedOther: 0,
		},
		blacklist: {
			totalActivos: 0, byReasonBounce5xx: 0, byReasonManual: 0,
			byReasonBulkImport: 0, byReasonFormatInvalid: 0,
			oldestEntry: null, newestEntry: null,
		},
		generatedAt: '2026-04-30T10:15:00',
		...over,
	};
}

describe('DeferFailLiveCounterTileComponent', () => {
	let fixture: ComponentFixture<DeferFailLiveCounterTileComponent>;
	let component: DeferFailLiveCounterTileComponent;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [DeferFailLiveCounterTileComponent],
		}).compileComponents();
		fixture = TestBed.createComponent(DeferFailLiveCounterTileComponent);
		component = fixture.componentInstance;
	});

	it('actualiza counter cuando cambia el input (sin refresh)', () => {
		fixture.componentRef.setInput('status', makeStatus());
		fixture.detectChanges();
		expect(component.counter()).toBe(1);
		expect(component.level()).toBe('success');

		fixture.componentRef.setInput(
			'status',
			makeStatus({
				status: 'CRITICAL',
				currentHour: { deferFailCount: 5, threshold: 5, percentUsed: 100, hourStart: '2026-04-30T10:00:00' },
			}),
		);
		fixture.detectChanges();
		expect(component.counter()).toBe(5);
		expect(component.level()).toBe('danger');
		expect(component.levelLabel()).toBe('CRITICAL');
	});

	it('marca level WARNING cuando el status es WARNING', () => {
		fixture.componentRef.setInput(
			'status',
			makeStatus({
				status: 'WARNING',
				currentHour: { deferFailCount: 4, threshold: 5, percentUsed: 80, hourStart: '2026-04-30T10:00:00' },
			}),
		);
		fixture.detectChanges();
		expect(component.level()).toBe('warn');
		expect(component.percent()).toBe(80);
	});
});
