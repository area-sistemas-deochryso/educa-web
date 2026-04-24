// * Plan 24 Chat 3 — tests del banner de progreso del sync CrossChex.
// #region Imports
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';
import { signal } from '@angular/core';
import { beforeEach, describe, expect, it } from 'vitest';

import { CrossChexSyncStatusService } from '@core/services/signalr';
import {
	CrossChexSyncStatusDto,
	SyncEstado,
} from '@core/services/signalr';
import { CrossChexSyncBannerComponent } from './crosschex-sync-banner.component';
// #endregion

// #region Fake service

function buildDto(over: Partial<CrossChexSyncStatusDto> = {}): CrossChexSyncStatusDto {
	return {
		jobId: 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6',
		estado: 'RUNNING',
		pagina: null,
		totalPaginas: null,
		fase: null,
		mensaje: null,
		iniciadoEn: '2026-04-24T10:00:00',
		finalizadoEn: null,
		error: null,
		...over,
	};
}

function createFakeService(initial: CrossChexSyncStatusDto | null) {
	const statusSig = signal<CrossChexSyncStatusDto | null>(initial);
	return {
		_sig: statusSig,
		status: statusSig.asReadonly(),
		hasActiveJob: signal(
			initial !== null && initial.estado !== 'COMPLETED' && initial.estado !== 'FAILED',
		).asReadonly(),
		isActive: signal(false).asReadonly(),
		trackingJobId: signal<string | null>(null).asReadonly(),
		terminal$: new Subject(),
		startTracking: () => Promise.resolve(),
		stopTracking: () => Promise.resolve(),
		rehydrate: () => Promise.resolve(),
	};
}

function setupFixture(initial: CrossChexSyncStatusDto | null): {
	fixture: ComponentFixture<CrossChexSyncBannerComponent>;
	component: CrossChexSyncBannerComponent;
} {
	const fake = createFakeService(initial);

	TestBed.configureTestingModule({
		imports: [CrossChexSyncBannerComponent],
		providers: [{ provide: CrossChexSyncStatusService, useValue: fake }],
	});

	const fixture = TestBed.createComponent(CrossChexSyncBannerComponent);
	fixture.detectChanges();
	return { fixture, component: fixture.componentInstance };
}

// #endregion

describe('CrossChexSyncBannerComponent', () => {
	it('no renderiza nada cuando status es null', () => {
		const { fixture } = setupFixture(null);
		expect(fixture.nativeElement.textContent).toBe('');
	});

	it('no renderiza cuando status es COMPLETED (se oculta al terminar)', () => {
		const { fixture, component } = setupFixture(buildDto({ estado: 'COMPLETED' }));
		expect(component.visible()).toBe(false);
		expect(fixture.nativeElement.querySelector('.sync-banner')).toBeNull();
	});

	it('QUEUED → indeterminate=true, mensaje "Encolando sincronización…"', () => {
		const { component } = setupFixture(buildDto({ estado: 'QUEUED' }));
		expect(component.visible()).toBe(true);
		expect(component.indeterminate()).toBe(true);
		expect(component.mensaje()).toBe('Encolando sincronización…');
		expect(component.percent()).toBe(0);
	});

	it('RUNNING sin páginas → indeterminate=true, mensaje "Iniciando…" default', () => {
		const { component } = setupFixture(
			buildDto({ estado: 'RUNNING', pagina: null, totalPaginas: null }),
		);
		expect(component.indeterminate()).toBe(true);
		expect(component.mensaje()).toBe('Iniciando…');
	});

	it('RUNNING con páginas → indeterminate=false, % calculado, mensaje dinámico', () => {
		const { component } = setupFixture(
			buildDto({ estado: 'RUNNING', pagina: 3, totalPaginas: 5 }),
		);
		expect(component.indeterminate()).toBe(false);
		expect(component.percent()).toBe(60);
		expect(component.mensaje()).toContain('Descargando página 3/5');
	});

	it('FAILED → banner rojo + muestra error del DTO + botón Reintentar', () => {
		const { fixture, component } = setupFixture(
			buildDto({ estado: 'FAILED', error: 'Timeout upstream' }),
		);
		expect(component.isFailed()).toBe(true);
		expect(component.mensaje()).toBe('Timeout upstream');

		const banner: HTMLElement = fixture.nativeElement.querySelector('.sync-banner');
		expect(banner).not.toBeNull();
		expect(banner.classList.contains('sync-banner--failed')).toBe(true);

		const retryBtn = fixture.nativeElement.querySelector('button[aria-label*="Reintentar"]');
		expect(retryBtn).not.toBeNull();
	});

	it('emite retry al clickear botón Reintentar', () => {
		const { fixture, component } = setupFixture(
			buildDto({ estado: 'FAILED', error: 'Error' }),
		);

		let retryEmitted = false;
		component.retry.subscribe(() => (retryEmitted = true));

		const retryBtn: HTMLButtonElement = fixture.nativeElement.querySelector(
			'button[aria-label*="Reintentar"]',
		);
		retryBtn.click();

		expect(retryEmitted).toBe(true);
	});

	it('renderiza la fase cuando existe', () => {
		const { fixture, component } = setupFixture(
			buildDto({ estado: 'RUNNING', fase: 'DESCARGANDO', pagina: 1, totalPaginas: 2 }),
		);
		expect(component.fase()).toBe('DESCARGANDO');
		const faseEl = fixture.nativeElement.querySelector('.sync-banner__fase');
		expect(faseEl?.textContent?.trim()).toBe('DESCARGANDO');
	});

	it('aria-live="polite" en el banner para screen readers', () => {
		const { fixture } = setupFixture(buildDto({ estado: 'QUEUED' }));
		const banner = fixture.nativeElement.querySelector('.sync-banner');
		expect(banner.getAttribute('aria-live')).toBe('polite');
	});

	it.each([
		['QUEUED' as SyncEstado, 'isQueued'],
		['RUNNING' as SyncEstado, 'isRunning'],
		['FAILED' as SyncEstado, 'isFailed'],
	])('computed del estado %s se activa correctamente', (estado, prop) => {
		const { component } = setupFixture(buildDto({ estado }));
		const flag = component[prop as keyof CrossChexSyncBannerComponent] as () => boolean;
		expect(flag()).toBe(true);
	});
});
