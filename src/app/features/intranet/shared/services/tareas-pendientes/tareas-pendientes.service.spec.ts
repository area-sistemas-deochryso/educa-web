import { TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { beforeEach, describe, expect, it } from 'vitest';
import { testProviders } from '@test';
import { ViewAsContextService } from '@core/services/view-as';
import type { TareaPendienteDto } from '@data/models';
import { TareasPendientesService } from './tareas-pendientes.service';

const tarea = (tareaId: number, esNueva: boolean): TareaPendienteDto => ({
	tareaId,
	titulo: `T${tareaId}`,
	cursoNombre: 'Curso',
	horarioId: 1,
	esNueva,
});

describe('TareasPendientesService', () => {
	const activeContext = signal<unknown>(null);
	let service: TareasPendientesService;
	let http: HttpTestingController;

	const cargar = (tareas: TareaPendienteDto[]) => {
		service.refresh();
		http.expectOne((r) => r.url.endsWith('/mis-tareas-pendientes')).flush(tareas);
	};

	beforeEach(() => {
		activeContext.set(null);
		TestBed.configureTestingModule({
			providers: [...testProviders, { provide: ViewAsContextService, useValue: { activeContext } }],
		});
		service = TestBed.inject(TareasPendientesService);
		http = TestBed.inject(HttpTestingController);
	});

	it('cuenta solo las tareas nuevas', () => {
		cargar([tarea(1, true), tarea(2, false), tarea(3, true)]);

		expect(service.loaded()).toBe(true);
		expect(service.nuevasCount()).toBe(2);
		expect([...service.nuevasIds()]).toEqual([1, 3]);
	});

	it('si el endpoint falla, degrada a vacío y marca como cargado', () => {
		service.refresh();
		http.expectOne((r) => r.url.endsWith('/mis-tareas-pendientes')).flush(null, { status: 500, statusText: 'Error' });

		expect(service.tareas()).toEqual([]);
		expect(service.loaded()).toBe(true);
	});

	it('marcarVista apaga la tarea de inmediato y avisa al BE', () => {
		cargar([tarea(1, true)]);

		service.marcarVista(1);

		expect(service.nuevasCount()).toBe(0);
		const req = http.expectOne((r) => r.url.endsWith('/tarea/1/vista'));
		expect(req.request.method).toBe('POST');
		req.flush(null, { status: 204, statusText: 'No Content' });
		expect(service.nuevasCount()).toBe(0);
	});

	it('marcarVista revierte si el BE falla', () => {
		cargar([tarea(1, true)]);

		service.marcarVista(1);
		http.expectOne((r) => r.url.endsWith('/tarea/1/vista')).flush(null, { status: 500, statusText: 'Error' });

		expect(service.nuevasCount()).toBe(1);
	});

	it('marcarVista no llama al BE si la tarea no es nueva', () => {
		cargar([tarea(1, false)]);

		service.marcarVista(1);

		http.expectNone((r) => r.url.endsWith('/tarea/1/vista'));
	});

	it('en "ver como" no registra vistas: el BE las rechaza y un admin no debe apagar el aviso', () => {
		cargar([tarea(1, true)]);
		activeContext.set({ rol: 'Estudiante' });

		service.marcarVista(1);

		http.expectNone((r) => r.url.endsWith('/tarea/1/vista'));
		expect(service.nuevasCount()).toBe(1);
	});
});
