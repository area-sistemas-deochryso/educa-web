import { ComponentRef } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { describe, expect, it, beforeEach } from 'vitest';

import {
	DeferFailBannerComponent,
	DeferFailBannerState,
} from './defer-fail-banner.component';

const stateInfo: DeferFailBannerState = {
	visible: false,
	severity: 'info',
	contadorActual: 1,
	threshold: 5,
	correoEnmascarado: null,
	motivo: null,
};

const stateWarn: DeferFailBannerState = {
	visible: true,
	severity: 'warn',
	contadorActual: 3,
	threshold: 5,
	correoEnmascarado: null,
	motivo: null,
};

const stateDanger: DeferFailBannerState = {
	visible: true,
	severity: 'danger',
	contadorActual: 5,
	threshold: 5,
	correoEnmascarado: 'jo***@gmail.com',
	motivo: 'BOUNCE_MAILBOX_FULL',
};

describe('DeferFailBannerComponent', () => {
	let fixture: ComponentFixture<DeferFailBannerComponent>;
	let ref: ComponentRef<DeferFailBannerComponent>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({ imports: [DeferFailBannerComponent] }).compileComponents();
		fixture = TestBed.createComponent(DeferFailBannerComponent);
		ref = fixture.componentRef;
	});

	it('does not render when state.visible is false', () => {
		ref.setInput('state', stateInfo);
		fixture.detectChanges();
		const banner = fixture.nativeElement.querySelector('.defer-fail-banner');
		expect(banner).toBeNull();
	});

	it('renders with WARN modifier when severity is warn', () => {
		ref.setInput('state', stateWarn);
		fixture.detectChanges();
		const banner = fixture.nativeElement.querySelector('.defer-fail-banner');
		expect(banner).not.toBeNull();
		expect(banner.classList.contains('defer-fail-banner--warn')).toBe(true);
		expect(banner.classList.contains('defer-fail-banner--danger')).toBe(false);
	});

	it('renders with DANGER modifier and shows masked email + motive when severity is danger', () => {
		ref.setInput('state', stateDanger);
		fixture.detectChanges();
		const banner = fixture.nativeElement.querySelector('.defer-fail-banner');
		expect(banner.classList.contains('defer-fail-banner--danger')).toBe(true);
		const recent = fixture.nativeElement.querySelector('.defer-fail-banner__recent');
		expect(recent.textContent).toContain('jo***@gmail.com');
		expect(recent.textContent).toContain('BOUNCE_MAILBOX_FULL');
		expect(banner.getAttribute('aria-live')).toBe('assertive');
	});

	it('shows the counter "actual / threshold" when both fields are present', () => {
		ref.setInput('state', stateWarn);
		fixture.detectChanges();
		const counter = fixture.nativeElement.querySelector('.defer-fail-banner__counter');
		expect(counter.textContent).toContain('3 / 5');
	});
});
