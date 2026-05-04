// #region Imports
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { provideZonelessChangeDetection, signal } from '@angular/core';
import { WalStatusFacade } from '@core/services';
import { WalMigrationBannerComponent } from './wal-migration-banner.component';
// #endregion

describe('WalMigrationBannerComponent', () => {
	let fixture: ComponentFixture<WalMigrationBannerComponent>;

	// Signals de control del mock
	let hasMigrations: ReturnType<typeof signal<boolean>>;
	let migrationCount: ReturnType<typeof signal<number>>;
	const discardMigrationEntries = vi.fn().mockResolvedValue(2);

	beforeEach(() => {
		hasMigrations = signal(true);
		migrationCount = signal(2);
		discardMigrationEntries.mockClear();

		TestBed.configureTestingModule({
			imports: [WalMigrationBannerComponent],
			providers: [
				provideZonelessChangeDetection(),
				{
					provide: WalStatusFacade,
					useValue: {
						hasMigrations: hasMigrations.asReadonly(),
						migrationCount: migrationCount.asReadonly(),
						discardMigrationEntries,
					},
				},
			],
		});

		fixture = TestBed.createComponent(WalMigrationBannerComponent);
		fixture.detectChanges();
	});

	it('se crea correctamente', () => {
		expect(fixture.componentInstance).toBeTruthy();
	});

	it('muestra el banner cuando hasMigrations es true', () => {
		const banner = fixture.nativeElement.querySelector('.migration-banner');
		expect(banner).not.toBeNull();
	});

	it('oculta el banner cuando hasMigrations es false', async () => {
		hasMigrations.set(false);
		fixture.detectChanges();
		const banner = fixture.nativeElement.querySelector('.migration-banner');
		expect(banner).toBeNull();
	});

	it('muestra el conteo de migraciones en el texto', () => {
		const text: string = fixture.nativeElement.textContent ?? '';
		expect(text).toContain('2');
	});

	it('dismiss oculta el banner sin llamar al facade', () => {
		fixture.componentInstance.dismiss();
		fixture.detectChanges();
		const banner = fixture.nativeElement.querySelector('.migration-banner');
		expect(banner).toBeNull();
		expect(discardMigrationEntries).not.toHaveBeenCalled();
	});

	it('reaparece si hasMigrations sigue en true y se recrea el componente', () => {
		// dismiss cierra el banner en esta instancia
		fixture.componentInstance.dismiss();
		fixture.detectChanges();
		expect(fixture.nativeElement.querySelector('.migration-banner')).toBeNull();

		// una nueva instancia del componente no tiene _dismissed en true
		const fixture2 = TestBed.createComponent(WalMigrationBannerComponent);
		fixture2.detectChanges();
		expect(fixture2.nativeElement.querySelector('.migration-banner')).not.toBeNull();
	});

	it('discardEntries llama a walStatus.discardMigrationEntries', async () => {
		await fixture.componentInstance.discardEntries();
		expect(discardMigrationEntries).toHaveBeenCalledTimes(1);
	});

	it('a11y: el banner tiene role="alert"', () => {
		const banner: HTMLElement | null = fixture.nativeElement.querySelector('.migration-banner');
		expect(banner?.getAttribute('role')).toBe('alert');
	});

	it('a11y: el botón de dismiss tiene aria-label', () => {
		const dismiss: HTMLElement | null =
			fixture.nativeElement.querySelector('.migration-banner__dismiss');
		expect(dismiss?.getAttribute('aria-label')).toBeTruthy();
	});

	it('a11y: el icono está marcado con aria-hidden="true"', () => {
		const icon: HTMLElement | null =
			fixture.nativeElement.querySelector('.migration-banner__icon');
		expect(icon?.getAttribute('aria-hidden')).toBe('true');
	});
});
