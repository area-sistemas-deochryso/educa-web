// #region Imports
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { provideZonelessChangeDetection } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

import { SwService } from '@core/services/sw';
import { SwUpdateBannerComponent } from './sw-update-banner.component';
// #endregion

describe('SwUpdateBannerComponent', () => {
	let fixture: ComponentFixture<SwUpdateBannerComponent>;
	let updateAvailable$: BehaviorSubject<boolean>;
	const update = vi.fn().mockResolvedValue(undefined);

	beforeEach(() => {
		updateAvailable$ = new BehaviorSubject<boolean>(false);
		update.mockClear();

		TestBed.configureTestingModule({
			imports: [SwUpdateBannerComponent],
			providers: [
				provideZonelessChangeDetection(),
				{
					provide: SwService,
					useValue: {
						updateAvailable$: updateAvailable$.asObservable(),
						update,
					},
				},
			],
		});

		fixture = TestBed.createComponent(SwUpdateBannerComponent);
		fixture.detectChanges();
	});

	it('se crea correctamente', () => {
		expect(fixture.componentInstance).toBeTruthy();
	});

	it('NO renderiza el banner cuando no hay update disponible', () => {
		const banner = fixture.nativeElement.querySelector('.sw-update-banner');
		expect(banner).toBeNull();
	});

	it('renderiza el banner cuando el SW reporta nueva versión', () => {
		updateAvailable$.next(true);
		fixture.detectChanges();
		const banner = fixture.nativeElement.querySelector('.sw-update-banner');
		expect(banner).not.toBeNull();
		expect(banner?.textContent).toContain('Nueva versión disponible');
	});

	it('muestra el CTA "Recargar para actualizar" con el banner', () => {
		updateAvailable$.next(true);
		fixture.detectChanges();
		const btn = fixture.nativeElement.querySelector('button');
		expect(btn).not.toBeNull();
		expect(btn?.textContent).toContain('Recargar para actualizar');
	});

	it('clic en el CTA llama a SwService.update', async () => {
		updateAvailable$.next(true);
		fixture.detectChanges();
		await fixture.componentInstance.onReload();
		expect(update).toHaveBeenCalledTimes(1);
	});

	it('a11y: el banner tiene role="status"', () => {
		updateAvailable$.next(true);
		fixture.detectChanges();
		const banner: HTMLElement | null =
			fixture.nativeElement.querySelector('.sw-update-banner');
		expect(banner?.getAttribute('role')).toBe('status');
	});

	it('a11y: el icono está marcado con aria-hidden="true"', () => {
		updateAvailable$.next(true);
		fixture.detectChanges();
		const icon: HTMLElement | null = fixture.nativeElement.querySelector(
			'.sw-update-banner__icon',
		);
		expect(icon?.getAttribute('aria-hidden')).toBe('true');
	});
});
