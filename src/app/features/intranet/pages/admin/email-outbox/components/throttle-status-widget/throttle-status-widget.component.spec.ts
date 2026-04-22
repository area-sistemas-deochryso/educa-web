// * Plan 22 Chat B — smoke tests del widget presentacional throttle-status.
// #region Imports
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ThrottleStatusWidgetComponent } from './throttle-status-widget.component';
import { ThrottleStatus } from '../../models/throttle-status.models';
// #endregion

// #region Factories
function makeStatus(overrides: Partial<ThrottleStatus> = {}): ThrottleStatus {
	return {
		senders: [
			{ address: 's0@***.com', index: 0, count: 10, limit: 50, saturated: false },
			{ address: 's1@***.com', index: 1, count: 50, limit: 50, saturated: true },
			{ address: 's2@***.com', index: 2, count: 0, limit: 50, saturated: false },
		],
		domainCount: 60,
		domainLimit: 200,
		perSenderLimit: 50,
		throttleEnabled: true,
		nowUtc: '2026-04-22T12:00:00',
		...overrides,
	};
}
// #endregion

describe('ThrottleStatusWidgetComponent', () => {
	let fixture: ComponentFixture<ThrottleStatusWidgetComponent>;
	let component: ThrottleStatusWidgetComponent;

	beforeEach(() => {
		TestBed.configureTestingModule({
			imports: [ThrottleStatusWidgetComponent],
		});
		fixture = TestBed.createComponent(ThrottleStatusWidgetComponent);
		component = fixture.componentInstance;
	});

	it('renderiza N cards per-sender + 1 card de dominio cuando hasData', () => {
		fixture.componentRef.setInput('status', makeStatus());
		fixture.detectChanges();

		const senderCards = fixture.nativeElement.querySelectorAll('.throttle-card--sender');
		expect(senderCards.length).toBe(3);

		const domainCard = fixture.nativeElement.querySelector('.throttle-card--domain');
		expect(domainCard).not.toBeNull();
	});

	it('marca severity danger cuando el sender está saturado', () => {
		fixture.componentRef.setInput('status', makeStatus());
		fixture.detectChanges();

		const severity = component.severityFor(50, 50);
		expect(severity).toBe('danger');
		const label = component.labelFor(50, 50);
		expect(label).toBe('Saturado');
	});

	it('muestra mensaje "Throttle deshabilitado" cuando ThrottleEnabled=false', () => {
		fixture.componentRef.setInput(
			'status',
			makeStatus({ throttleEnabled: false, senders: [] }),
		);
		fixture.detectChanges();

		const disabledNotice = fixture.nativeElement.querySelector('.throttle-widget__disabled');
		expect(disabledNotice).not.toBeNull();
		expect(disabledNotice.textContent).toContain('Throttle deshabilitado');
		// Y NO se renderizan cards de sender.
		expect(fixture.nativeElement.querySelectorAll('.throttle-card--sender').length).toBe(0);
	});

	it('pinta card de dominio como "near-limit" cuando ratio >= 0.9', () => {
		fixture.componentRef.setInput('status', makeStatus({ domainCount: 185 }));
		fixture.detectChanges();

		expect(component.domainNearLimit()).toBe(true);
		const warning = fixture.nativeElement.querySelector('.throttle-card__warning');
		expect(warning).not.toBeNull();
		expect(warning.textContent).toContain('Acercándose');
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
