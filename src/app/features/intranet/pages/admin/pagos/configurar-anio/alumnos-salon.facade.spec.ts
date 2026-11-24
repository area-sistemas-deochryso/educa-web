import { TestBed } from '@angular/core/testing';
import { Subject, of, throwError } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import type { SalonAdminListDto } from '@data/models';
import type { SalonEstudianteListDto } from '@features/intranet/pages/admin/classrooms/models';
import { ClassroomsAdminApiService } from '@features/intranet/pages/admin/classrooms/services';
import { SalonEstudiantesApiService } from '@features/intranet/pages/admin/classrooms/services/salon-estudiantes-api.service';
import { AlumnosSalonFacade } from './alumnos-salon.facade';
import { TODOS_LOS_SALONES } from './alumnos-salon.logic';

const salon = (id: number, seccion: string) => ({ id, grado: '1° Primaria', gradoOrden: 1, seccion, sede: 'Central' }) as SalonAdminListDto;
const alumno = (estudianteId: number): SalonEstudianteListDto => ({ estudianteId, dni: `${estudianteId}`, nombreCompleto: `Alumno ${estudianteId}`, estadoMatricula: 'Activa' });

function crear(salonesApi: Record<string, unknown> = {}, alumnosApi: Record<string, unknown> = {}) {
	TestBed.configureTestingModule({
		providers: [
			AlumnosSalonFacade,
			{ provide: ClassroomsAdminApiService, useValue: { getSalonesAdmin: () => of([]), ...salonesApi } },
			{ provide: SalonEstudiantesApiService, useValue: { listarPorSalon: () => of([]), ...alumnosApi } },
		],
	});
	return TestBed.inject(AlumnosSalonFacade);
}

describe('AlumnosSalonFacade', () => {
	it('carga los salones del año regular (no de verano) y deja «Todos» primero', () => {
		const getSalonesAdmin = vi.fn(() => of([salon(2, 'B'), salon(1, 'A')]));
		const facade = crear({ getSalonesAdmin });

		facade.cargarSalones(2027);

		expect(getSalonesAdmin).toHaveBeenCalledWith(2027, false);
		expect(facade.opciones()[0]).toBe(TODOS_LOS_SALONES);
		expect(facade.opciones().map((o) => o.salonId)).toEqual([null, 1, 2]);
	});

	it('si los salones no cargan, avisa y deja solo «Todos» (se puede generar para todo el año)', () => {
		const facade = crear({ getSalonesAdmin: () => throwError(() => ({ status: 500 })) });

		facade.cargarSalones(2027);

		expect(facade.opciones()).toEqual([TODOS_LOS_SALONES]);
		expect(facade.error()).toContain('No se pudieron cargar los salones');
	});

	it('al elegir un salón carga sus alumnos y al volver a «Todos» los limpia', () => {
		const listarPorSalon = vi.fn(() => of([alumno(1), alumno(2)]));
		const facade = crear({}, { listarPorSalon });

		facade.elegirSalon(9);
		expect(listarPorSalon).toHaveBeenCalledWith(9);
		expect(facade.alumnos().map((a) => a.estudianteId)).toEqual([1, 2]);
		expect(facade.cargandoAlumnos()).toBe(false);

		facade.elegirSalon(null);
		expect(facade.alumnos()).toEqual([]);
		expect(facade.cargandoAlumnos()).toBe(false);
	});

	it('descarta la respuesta de un salón viejo si ya se eligió otro', () => {
		const salon1 = new Subject<SalonEstudianteListDto[]>();
		const salon2 = new Subject<SalonEstudianteListDto[]>();
		const facade = crear({}, { listarPorSalon: (id: number) => (id === 1 ? salon1 : salon2).asObservable() });

		facade.elegirSalon(1);
		facade.elegirSalon(2);
		salon1.next([alumno(1)]);
		salon2.next([alumno(2)]);

		expect(facade.alumnos().map((a) => a.estudianteId)).toEqual([2]);
	});

	it('si los alumnos no cargan, avisa en línea y deja la lista vacía', () => {
		const facade = crear({}, { listarPorSalon: () => throwError(() => ({ status: 500 })) });

		facade.elegirSalon(9);

		expect(facade.alumnos()).toEqual([]);
		expect(facade.error()).toBe('No se pudieron cargar los alumnos del salón.');
		expect(facade.cargandoAlumnos()).toBe(false);
	});
});
