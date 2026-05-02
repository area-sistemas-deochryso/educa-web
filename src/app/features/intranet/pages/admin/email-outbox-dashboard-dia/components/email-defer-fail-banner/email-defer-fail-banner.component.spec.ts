import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { describe, expect, it, beforeEach, vi } from 'vitest';

vi.mock('@config/environment', () => ({
	environment: { features: { emailDeferAlerts: true } },
}));

import { EmailMonitoreoFacade } from '../../services/email-monitoreo.facade';

import { EmailDeferFailBannerComponent } from './email-defer-fail-banner.component';

interface VmShape {
	deferFailStatus: { status: 'OK' | 'WARNING' | 'CRITICAL'; currentHour: { deferFailCount: number; threshold: number } } | null;
	lastBlacklistEventAt: number | null;
}

function buildFacadeMock(initial: VmShape) {
	const vm = signal(initial);
	const startHub = vi.fn().mockResolvedValue(undefined);
	return {
		vm,
		startHub,
		set(next: VmShape): void {
			vm.set(next);
		},
	};
}

describe('EmailDeferFailBannerComponent', () => {
	let fixture: ComponentFixture<EmailDeferFailBannerComponent>;
	let facadeMock: ReturnType<typeof buildFacadeMock>;

	function setup(initial: VmShape): void {
		facadeMock = buildFacadeMock(initial);
		TestBed.configureTestingModule({
			imports: [EmailDeferFailBannerComponent],
			providers: [{ provide: EmailMonitoreoFacade, useValue: facadeMock }],
		});
		fixture = TestBed.createComponent(EmailDeferFailBannerComponent);
	}

	beforeEach(() => {
		TestBed.resetTestingModule();
	});

	it('does not render when status is OK and no recent blacklist', () => {
		setup({ deferFailStatus: { status: 'OK', currentHour: { deferFailCount: 0, threshold: 5 } }, lastBlacklistEventAt: null });
		fixture.detectChanges();
		const banner = fixture.nativeElement.querySelector('.email-defer-fail-banner');
		expect(banner).toBeNull();
	});

	it('renders WARN when status is WARNING', () => {
		setup({ deferFailStatus: { status: 'WARNING', currentHour: { deferFailCount: 3, threshold: 5 } }, lastBlacklistEventAt: null });
		fixture.detectChanges();
		const banner = fixture.nativeElement.querySelector('.email-defer-fail-banner');
		expect(banner.classList.contains('email-defer-fail-banner--warn')).toBe(true);
		expect(banner.classList.contains('email-defer-fail-banner--danger')).toBe(false);
		expect(fixture.nativeElement.querySelector('.email-defer-fail-banner__counter').textContent).toContain('3 / 5');
	});

	it('renders DANGER when status is CRITICAL', () => {
		setup({ deferFailStatus: { status: 'CRITICAL', currentHour: { deferFailCount: 5, threshold: 5 } }, lastBlacklistEventAt: null });
		fixture.detectChanges();
		const banner = fixture.nativeElement.querySelector('.email-defer-fail-banner');
		expect(banner.classList.contains('email-defer-fail-banner--danger')).toBe(true);
		expect(banner.getAttribute('aria-live')).toBe('assertive');
	});

	it('renders WARN when there is a recent BlacklistEntryCreated even with status OK', () => {
		setup({ deferFailStatus: { status: 'OK', currentHour: { deferFailCount: 0, threshold: 5 } }, lastBlacklistEventAt: Date.now() });
		fixture.detectChanges();
		const banner = fixture.nativeElement.querySelector('.email-defer-fail-banner');
		expect(banner.classList.contains('email-defer-fail-banner--warn')).toBe(true);
		expect(fixture.nativeElement.querySelector('.email-defer-fail-banner__recent')).not.toBeNull();
	});

	it('hides again when recent blacklist is older than the 5 min TTL', () => {
		setup({
			deferFailStatus: { status: 'OK', currentHour: { deferFailCount: 0, threshold: 5 } },
			lastBlacklistEventAt: Date.now() - 6 * 60 * 1000,
		});
		fixture.detectChanges();
		const banner = fixture.nativeElement.querySelector('.email-defer-fail-banner');
		expect(banner).toBeNull();
	});

	it('calls facade.startHub() on init when feature flag is enabled', () => {
		setup({ deferFailStatus: null, lastBlacklistEventAt: null });
		fixture.detectChanges();
		// environment.development.ts has emailDeferAlerts=true (vitest config uses dev env).
		expect(facadeMock.startHub).toHaveBeenCalledTimes(1);
	});
});
