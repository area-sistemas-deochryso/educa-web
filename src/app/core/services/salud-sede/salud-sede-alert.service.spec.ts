// #region Imports
import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthService } from '@core/services/auth';
import { ErrorHandlerService } from '@core/services/error';
import { NotificationsSoundService } from '@core/services/notifications';
import { SaludSedeAlertService } from './salud-sede-alert.service';
// #endregion

describe('SaludSedeAlertService', () => {
	let dimensionesSaludCritica: ReturnType<typeof signal<string[]>>;
	let errorHandler: { showWarning: ReturnType<typeof vi.fn> };
	let notificationsSound: { playSound: ReturnType<typeof vi.fn> };

	function setup(initial: string[] = []): void {
		dimensionesSaludCritica = signal(initial);
		errorHandler = { showWarning: vi.fn() };
		notificationsSound = { playSound: vi.fn() };

		TestBed.configureTestingModule({
			providers: [
				SaludSedeAlertService,
				{ provide: AuthService, useValue: { dimensionesSaludCritica } },
				{ provide: ErrorHandlerService, useValue: errorHandler },
				{ provide: NotificationsSoundService, useValue: notificationsSound },
			],
		});
	}

	beforeEach(() => {
		vi.useRealTimers();
		TestBed.resetTestingModule();
	});

	it('no dispara alerta cuando no hay dimensiones críticas (rol no-Administrativo o sede sana)', () => {
		setup([]);
		TestBed.inject(SaludSedeAlertService);
		TestBed.tick();

		expect(errorHandler.showWarning).not.toHaveBeenCalled();
		expect(notificationsSound.playSound).not.toHaveBeenCalled();
	});

	it('dispara alerta visual + sonora cuando el login/refresh trae dimensiones en Crítico', () => {
		setup(['Infraestructura']);
		TestBed.inject(SaludSedeAlertService);
		TestBed.tick();

		expect(errorHandler.showWarning).toHaveBeenCalledOnce();
		expect(errorHandler.showWarning.mock.calls[0][1]).toContain('Infraestructura');
		expect(notificationsSound.playSound).toHaveBeenCalledOnce();
	});

	it('vuelve a disparar en cada cambio del signal (nuevo login/refresh) mientras siga crítico', () => {
		setup(['Profesorado']);
		TestBed.inject(SaludSedeAlertService);
		TestBed.tick();
		expect(errorHandler.showWarning).toHaveBeenCalledOnce();

		// Simula un refresh posterior que vuelve a traer la misma dimensión crítica.
		dimensionesSaludCritica.set(['Profesorado']);
		TestBed.tick();

		expect(errorHandler.showWarning).toHaveBeenCalledTimes(2);
		expect(notificationsSound.playSound).toHaveBeenCalledTimes(2);
	});
});
