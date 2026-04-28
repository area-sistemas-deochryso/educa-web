// * Tests for Plan 27 · INV-C11 — admin banner component.
// #region Imports
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { provideZonelessChangeDetection } from '@angular/core';

import { AttendanceScopeBannerComponent } from './attendance-scope-banner.component';
// #endregion

describe('AttendanceScopeBannerComponent', () => {
	let fixture: ComponentFixture<AttendanceScopeBannerComponent>;

	beforeEach(() => {
		TestBed.configureTestingModule({
			imports: [AttendanceScopeBannerComponent],
			providers: [provideZonelessChangeDetection()],
		});

		fixture = TestBed.createComponent(AttendanceScopeBannerComponent);
		fixture.detectChanges();
	});

	it('se crea correctamente', () => {
		expect(fixture.componentInstance).toBeTruthy();
	});

	it('renderiza el filtro temporal y menciona "5to Primaria en adelante"', () => {
		const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
		expect(text).toContain('Filtro temporal activo');
		expect(text).toContain('5to Primaria en adelante');
		expect(text).toContain('CrossChex');
	});

	it('a11y: tiene role="note" para lectores de pantalla', () => {
		const banner = (fixture.nativeElement as HTMLElement).querySelector('.scope-banner');
		expect(banner?.getAttribute('role')).toBe('note');
	});

	it('a11y: el icono está marcado con aria-hidden="true"', () => {
		const icon = (fixture.nativeElement as HTMLElement).querySelector('.scope-banner__icon');
		expect(icon?.getAttribute('aria-hidden')).toBe('true');
	});
});
