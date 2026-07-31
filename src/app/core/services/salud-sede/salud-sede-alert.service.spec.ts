// #region Imports
import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthService } from '@core/services/auth';
import { NotificationsSoundService } from '@core/services/notifications';
import { SaludSedeAlertService } from './salud-sede-alert.service';
// #endregion

describe('SaludSedeAlertService', () => {
	let dimensionesSaludCritica: ReturnType<typeof signal<string[]>>;
	let notificationsSound: { playSound: ReturnType<typeof vi.fn> };

	function setup(initial: string[] = []): void {
		dimensionesSaludCritica = signal(initial);
		notificationsSound = { playSound: vi.fn() };

		TestBed.configureTestingModule({
			providers: [
				SaludSedeAlertService,
				{ provide: AuthService, useValue: { dimensionesSaludCritica } },
				{ provide: NotificationsSoundService, useValue: notificationsSound },
			],
		});
	}

	beforeEach(() => {
		vi.useRealTimers();
		TestBed.resetTestingModule();
	});

	it('no muestra el banner cuando no hay dimensiones críticas (rol no-Administrativo o sede sana)', () => {
		setup([]);
		const service = TestBed.inject(SaludSedeAlertService);
		TestBed.tick();

		expect(service.visible()).toBe(false);
		expect(notificationsSound.playSound).not.toHaveBeenCalled();
	});

	it('muestra el banner + sonido cuando el login/refresh trae dimensiones en Crítico', () => {
		setup(['Infraestructura']);
		const service = TestBed.inject(SaludSedeAlertService);
		TestBed.tick();

		expect(service.visible()).toBe(true);
		expect(service.mensaje()).toContain('Infraestructura');
		expect(notificationsSound.playSound).toHaveBeenCalledOnce();
	});

	it('vuelve a sonar en cada cambio del signal (nuevo login/refresh) mientras siga crítico', () => {
		setup(['Profesorado']);
		TestBed.inject(SaludSedeAlertService);
		TestBed.tick();
		expect(notificationsSound.playSound).toHaveBeenCalledOnce();

		// Simula un refresh posterior que vuelve a traer la misma dimensión crítica.
		dimensionesSaludCritica.set(['Profesorado']);
		TestBed.tick();

		expect(notificationsSound.playSound).toHaveBeenCalledTimes(2);
	});

	it('dismiss() oculta el banner hasta el próximo cambio a crítico', () => {
		setup(['Profesorado']);
		const service = TestBed.inject(SaludSedeAlertService);
		TestBed.tick();
		expect(service.visible()).toBe(true);

		service.dismiss();
		expect(service.visible()).toBe(false);

		dimensionesSaludCritica.set(['Infraestructura']);
		TestBed.tick();
		expect(service.visible()).toBe(true);
	});
});
