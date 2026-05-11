// #region Imports
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { provideZonelessChangeDetection, signal, computed } from '@angular/core';
import { WalStatusFacade } from '@core/services';
import { WalDegradedBannerComponent } from './wal-degraded-banner.component';
import type { WalBannerMessage, WalCircuitState, WalMode } from '@core/services/wal';
// #endregion

interface BannerVm {
	mode: WalMode;
	circuitState: WalCircuitState;
	isDegraded: boolean;
	bannerMessage: WalBannerMessage;
}

describe('WalDegradedBannerComponent', () => {
	let fixture: ComponentFixture<WalDegradedBannerComponent>;
	let mode: ReturnType<typeof signal<WalMode>>;
	let circuitState: ReturnType<typeof signal<WalCircuitState>>;
	const forceRetry = vi.fn().mockResolvedValue(undefined);

	beforeEach(() => {
		mode = signal<WalMode>('persistent');
		circuitState = signal<WalCircuitState>('closed');
		forceRetry.mockClear();

		const vm = computed<BannerVm>(() => {
			const m = mode();
			const c = circuitState();
			const bannerMessage: WalBannerMessage =
				m === 'ephemeral' || m === 'frozen'
					? 'ephemeral'
					: c === 'open'
						? 'circuit-open'
						: null;
			return {
				mode: m,
				circuitState: c,
				isDegraded: m !== 'persistent' || c === 'open',
				bannerMessage,
			};
		});

		TestBed.configureTestingModule({
			imports: [WalDegradedBannerComponent],
			providers: [
				provideZonelessChangeDetection(),
				{
					provide: WalStatusFacade,
					useValue: { vm, forceRetry },
				},
			],
		});

		fixture = TestBed.createComponent(WalDegradedBannerComponent);
		fixture.detectChanges();
	});

	it('se crea correctamente', () => {
		expect(fixture.componentInstance).toBeTruthy();
	});

	it('NO renderiza el banner cuando el WAL está sano (closed + persistent)', () => {
		const banner = fixture.nativeElement.querySelector('.wal-degraded-banner');
		expect(banner).toBeNull();
	});

	it('renderiza el mensaje "circuit-open" cuando el circuit está open', () => {
		circuitState.set('open');
		fixture.detectChanges();
		const banner = fixture.nativeElement.querySelector('.wal-degraded-banner');
		expect(banner).not.toBeNull();
		expect(banner?.textContent).toContain('Sincronización pausada');
	});

	it('renderiza el mensaje "ephemeral" cuando el modo es ephemeral', () => {
		mode.set('ephemeral');
		fixture.detectChanges();
		const banner = fixture.nativeElement.querySelector('.wal-degraded-banner');
		expect(banner).not.toBeNull();
		expect(banner?.textContent).toContain('Modo reducido');
	});

	it('aplica la clase --ephemeral cuando el modo es no-persistent', () => {
		mode.set('ephemeral');
		fixture.detectChanges();
		const banner = fixture.nativeElement.querySelector('.wal-degraded-banner');
		expect(banner?.classList.contains('wal-degraded-banner--ephemeral')).toBe(true);
	});

	it('muestra el botón "Reintentar ahora" solo en modo circuit-open', () => {
		circuitState.set('open');
		fixture.detectChanges();
		const btn = fixture.nativeElement.querySelector('button');
		expect(btn).not.toBeNull();
		expect(btn?.textContent).toContain('Reintentar ahora');
	});

	it('NO muestra el botón "Reintentar ahora" en modo ephemeral', () => {
		mode.set('ephemeral');
		fixture.detectChanges();
		const btn = fixture.nativeElement.querySelector('button');
		expect(btn).toBeNull();
	});

	it('clic en "Reintentar ahora" llama a walStatus.forceRetry', async () => {
		circuitState.set('open');
		fixture.detectChanges();
		await fixture.componentInstance.onForceRetry();
		expect(forceRetry).toHaveBeenCalledTimes(1);
	});

	it('a11y: el banner tiene role="status"', () => {
		circuitState.set('open');
		fixture.detectChanges();
		const banner: HTMLElement | null = fixture.nativeElement.querySelector(
			'.wal-degraded-banner',
		);
		expect(banner?.getAttribute('role')).toBe('status');
	});

	it('a11y: el icono está marcado con aria-hidden="true"', () => {
		circuitState.set('open');
		fixture.detectChanges();
		const icon: HTMLElement | null = fixture.nativeElement.querySelector(
			'.wal-degraded-banner__icon',
		);
		expect(icon?.getAttribute('aria-hidden')).toBe('true');
	});
});
