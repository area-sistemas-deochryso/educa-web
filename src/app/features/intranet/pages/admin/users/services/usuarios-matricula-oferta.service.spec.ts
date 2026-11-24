import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ErrorHandlerService, UserPermissionsService } from '@core/services';
import { SwService } from '@core/services/sw';
import { PagosApiService } from '@features/intranet/pages/admin/pagos/services';
import { UsersMatriculaOfertaService } from './usuarios-matricula-oferta.service';
import { UsersStore } from './usuarios.store';

interface Escenario {
	puedePagos: boolean;
	enLinea: boolean;
	buscarEstudiantes: ReturnType<typeof vi.fn>;
}

function crear({ puedePagos, enLinea, buscarEstudiantes }: Escenario) {
	const dialogVisible = signal(true);
	const store = {
		dialogVisible,
		salones: signal([{ salonId: 7, anio: 2027 }]),
		setLoading: vi.fn(),
		closeDialog: vi.fn(() => dialogVisible.set(false)),
	};
	const errorHandler = { showWarning: vi.fn() };
	TestBed.configureTestingModule({
		providers: [
			UsersMatriculaOfertaService,
			{ provide: UsersStore, useValue: store },
			{ provide: UserPermissionsService, useValue: { hasCapability: (c: string) => puedePagos && c === 'PAGOS_API_MANAGE' } },
			{ provide: SwService, useValue: { isOnline: enLinea } },
			{ provide: PagosApiService, useValue: { buscarEstudiantes } },
			{ provide: ErrorHandlerService, useValue: errorHandler },
		],
	});
	return { service: TestBed.inject(UsersMatriculaOfertaService), store, errorHandler, dialogVisible };
}

const base: Escenario = { puedePagos: true, enLinea: true, buscarEstudiantes: vi.fn() };

describe('UsersMatriculaOfertaService', () => {
	beforeEach(() => TestBed.resetTestingModule());

	describe('anioParaOfertar', () => {
		it('un Estudiante con salón, con permiso de pagos y en línea: ofrece con el año del salón', () => {
			const { service } = crear(base);
			expect(service.anioParaOfertar({ rol: 'Estudiante', salonId: 7 })).toBe(2027);
		});

		it('sin permiso de pagos, sin conexión, sin salón o de otro rol: no ofrece (el alta sigue como siempre)', () => {
			expect(crear({ ...base, puedePagos: false }).service.anioParaOfertar({ rol: 'Estudiante', salonId: 7 })).toBeNull();
			TestBed.resetTestingModule();
			expect(crear({ ...base, enLinea: false }).service.anioParaOfertar({ rol: 'Estudiante', salonId: 7 })).toBeNull();
			TestBed.resetTestingModule();
			const { service } = crear(base);
			expect(service.anioParaOfertar({ rol: 'Estudiante', salonId: undefined })).toBeNull();
			expect(service.anioParaOfertar({ rol: 'Profesor', salonId: 7 })).toBeNull();
			expect(service.anioParaOfertar({ rol: 'Estudiante', salonId: 99 })).toBeNull();
		});
	});

	describe('abrir', () => {
		it('resuelve el id por DNI exacto y abre el paso 2 con el nombre y el año', async () => {
			const buscarEstudiantes = vi.fn(() => of([{ estudianteId: 15, nombreCompleto: 'Pérez, Ana', salon: null }]));
			const { service, store } = crear({ ...base, buscarEstudiantes });

			await service.abrir('12345678', 2027);

			expect(buscarEstudiantes).toHaveBeenCalledWith('12345678', 2);
			expect(service.oferta()).toEqual({ estudianteId: 15, nombre: 'Pérez, Ana', anio: 2027 });
			expect(store.setLoading).toHaveBeenCalledWith(false);
			expect(store.closeDialog).not.toHaveBeenCalled();
		});

		it('si el DNI no da una coincidencia única, cierra el diálogo con un aviso: el alta ya quedó hecha', async () => {
			const buscarEstudiantes = vi.fn(() => of([]));
			const { service, store, errorHandler } = crear({ ...base, buscarEstudiantes });

			await service.abrir('12345678', 2027);

			expect(service.oferta()).toBeNull();
			expect(store.closeDialog).toHaveBeenCalled();
			expect(errorHandler.showWarning).toHaveBeenCalledOnce();
		});

		it('si la búsqueda falla, mismo camino: aviso y cierre, nunca queda cargando', async () => {
			const buscarEstudiantes = vi.fn(() => throwError(() => ({ status: 500 })));
			const { service, store, errorHandler } = crear({ ...base, buscarEstudiantes });

			await service.abrir('12345678', 2027);

			expect(store.setLoading).toHaveBeenCalledWith(false);
			expect(errorHandler.showWarning).toHaveBeenCalledOnce();
		});
	});

	describe('terminar', () => {
		it('si se omitió y quedó sin cargo, avisa suave con el nombre; en todo caso cierra el diálogo', async () => {
			const buscarEstudiantes = vi.fn(() => of([{ estudianteId: 15, nombreCompleto: 'Pérez, Ana', salon: null }]));
			const { service, store, errorHandler } = crear({ ...base, buscarEstudiantes });
			await service.abrir('12345678', 2027);

			service.terminar({ generado: false, sinCargo: true });

			expect(store.closeDialog).toHaveBeenCalled();
			expect(errorHandler.showWarning).toHaveBeenCalledWith(expect.any(String), expect.stringContaining('Pérez, Ana'));
		});

		it('si se generó, cierra sin avisar', async () => {
			const buscarEstudiantes = vi.fn(() => of([{ estudianteId: 15, nombreCompleto: 'Pérez, Ana', salon: null }]));
			const { service, errorHandler, store } = crear({ ...base, buscarEstudiantes });
			await service.abrir('12345678', 2027);

			service.terminar({ generado: true, sinCargo: false });

			expect(store.closeDialog).toHaveBeenCalled();
			expect(errorHandler.showWarning).not.toHaveBeenCalled();
		});
	});

	it('cerrar el diálogo por cualquier vía descarta el paso 2 (no reaparece en el próximo alta)', async () => {
		const buscarEstudiantes = vi.fn(() => of([{ estudianteId: 15, nombreCompleto: 'Pérez, Ana', salon: null }]));
		const { service, dialogVisible } = crear({ ...base, buscarEstudiantes });
		TestBed.tick();
		await service.abrir('12345678', 2027);
		expect(service.oferta()).not.toBeNull();

		dialogVisible.set(false);
		TestBed.tick();

		expect(service.oferta()).toBeNull();
	});
});
