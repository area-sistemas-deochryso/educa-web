// * Behavior tests para SchedulesApiService — verifica cada endpoint HTTP y su payload/URL.
// #region Imports
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import {
	HttpTestingController,
	provideHttpClientTesting,
} from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';

import { SchedulesApiService } from './horarios-api.service';
import type {
	HorarioCreateDto,
	HorarioUpdateDto,
	HorarioAsignarProfesorDto,
	HorarioAsignarEstudiantesDto,
	ImportarHorarioItem,
	HorariosEstadisticas,
} from '../models/horario.interface';
import type { ProfesorListDto } from '../models/profesor.interface';
import type { DiaSemana } from '../models/horario.interface';
// #endregion

// #region Fixtures
const mockHorario: any = {
	id: 1,
	diaSemana: 1,
	horaInicio: '08:00',
	horaFin: '09:00',
	estado: true,
	salonId: 10,
	cursoId: 100,
	profesorId: 200,
	cantidadEstudiantes: 20,
};

const mockHorarios: any[] = [mockHorario];

const mockProfesor: ProfesorListDto = {
	id: 200,
	nombre: 'Ana',
	apellidos: 'Torres',
	dni: '12345678',
	estado: true,
};

const mockEstadisticas: HorariosEstadisticas = {
	totalHorarios: 5,
	horariosActivos: 4,
	horariosInactivos: 1,
	horariosConProfesor: 4,
	horariosSinProfesor: 1,
	horariosSinEstudiantes: 0,
	horariosConConflicto: 0,
};

const mockImportResult: any = {
	procesados: 3,
	creados: 2,
	actualizados: 1,
	errores: [],
};
// #endregion

// #region Tests
describe('SchedulesApiService', () => {
	let service: SchedulesApiService;
	let http: HttpClient;
	let httpMock: HttpTestingController;

	beforeEach(() => {
		TestBed.configureTestingModule({
			providers: [provideHttpClient(), provideHttpClientTesting()],
		});

		service = TestBed.inject(SchedulesApiService);
		http = TestBed.inject(HttpClient);
		httpMock = TestBed.inject(HttpTestingController);
	});

	afterEach(() => {
		httpMock.verify();
	});

	// #region CRUD Básico
	describe('getAll', () => {
		it('should GET all horarios', () => {
			service.getAll().subscribe((horarios) => {
				expect(horarios).toEqual(mockHorarios);
			});

			const req = httpMock.expectOne('/api/horario');
			expect(req.request.method).toBe('GET');
			req.flush(mockHorarios);
		});
	});

	describe('getById', () => {
		it('should GET horario by id', () => {
			service.getById(1).subscribe((horario) => {
				expect(horario).toEqual(mockHorario);
			});

			const req = httpMock.expectOne('/api/horario/1');
			expect(req.request.method).toBe('GET');
			req.flush(mockHorario);
		});
	});

	describe('create', () => {
		const dto: HorarioCreateDto = {
			diaSemana: 1,
			horaInicio: '08:00',
			horaFin: '09:00',
			salonId: 10,
			cursoId: 100,
			usuarioReg: 'admin',
		};

		it('should POST new horario', () => {
			service.create(dto).subscribe((horario) => {
				expect(horario).toEqual(mockHorario);
			});

			const req = httpMock.expectOne('/api/horario');
			expect(req.request.method).toBe('POST');
			expect(req.request.body).toEqual(dto);
			req.flush(mockHorario);
		});
	});

	describe('update', () => {
		const dto: HorarioUpdateDto = {
			id: 1,
			diaSemana: 1,
			horaInicio: '08:00',
			horaFin: '09:00',
			salonId: 10,
			cursoId: 100,
			usuarioMod: 'admin',
		};

		it('should PUT updated horario', () => {
			service.update(1, dto).subscribe((horario) => {
				expect(horario).toEqual(mockHorario);
			});

			const req = httpMock.expectOne('/api/horario/1');
			expect(req.request.method).toBe('PUT');
			expect(req.request.body).toEqual(dto);
			req.flush(mockHorario);
		});
	});

	describe('delete', () => {
		it('should DELETE horario by id', () => {
			service.delete(1).subscribe((deleted) => {
				expect(deleted).toBe(true);
			});

			const req = httpMock.expectOne('/api/horario/1');
			expect(req.request.method).toBe('DELETE');
			req.flush(true);
		});
	});

	describe('toggleEstado', () => {
		it('should PUT toggle estado', () => {
			service.toggleEstado(1).subscribe((toggled) => {
				expect(toggled).toBe(true);
			});

			const req = httpMock.expectOne('/api/horario/1/toggle-estado');
			expect(req.request.method).toBe('PUT');
			req.flush(true);
		});
	});
	// #endregion

	// #region Consultas Especializadas
	describe('getBySalon', () => {
		it('should GET horarios by salon', () => {
			service.getBySalon(10).subscribe((horarios) => {
				expect(horarios).toEqual(mockHorarios);
			});

			const req = httpMock.expectOne('/api/horario/salon/10');
			expect(req.request.method).toBe('GET');
			req.flush(mockHorarios);
		});
	});

	describe('getByProfesor', () => {
		it('should GET horarios by profesor', () => {
			service.getByProfesor(200).subscribe((horarios) => {
				expect(horarios).toEqual(mockHorarios);
			});

			const req = httpMock.expectOne('/api/horario/profesor/200');
			expect(req.request.method).toBe('GET');
			req.flush(mockHorarios);
		});
	});

	describe('getByDiaSemana', () => {
		it('should GET horarios by dia de semana', () => {
			service.getByDiaSemana(1).subscribe((horarios) => {
				expect(horarios).toEqual(mockHorarios);
			});

			const req = httpMock.expectOne('/api/horario/dia/1');
			expect(req.request.method).toBe('GET');
			req.flush(mockHorarios);
		});
	});

	describe('getProfesoresCandidatos', () => {
		it('should GET profesor candidatos', () => {
			service.getProfesoresCandidatos(10).subscribe((profesores) => {
				expect(profesores).toEqual([mockProfesor]);
			});

			const req = httpMock.expectOne('/api/horario/10/profesores-candidatos');
			expect(req.request.method).toBe('GET');
			req.flush([mockProfesor]);
		});
	});

	describe('getEstudiantesDisponibles', () => {
		it('should GET estudiantes disponibles', () => {
			const mockEstudiantes: any[] = [{ id: 300, nombre: 'Est 1' }];
			service.getEstudiantesDisponibles(10).subscribe((estudiantes) => {
				expect(estudiantes).toEqual(mockEstudiantes);
			});

			const req = httpMock.expectOne('/api/horario/10/estudiantes-disponibles');
			expect(req.request.method).toBe('GET');
			req.flush(mockEstudiantes);
		});
	});
	// #endregion

	// #region Asignaciones
	describe('asignarProfesor', () => {
		const dto: HorarioAsignarProfesorDto = {
			horarioId: 10,
			profesorId: 200,
			usuarioMod: 'admin',
		};

		it('should POST asignar profesor', () => {
			service.asignarProfesor(dto).subscribe((result) => {
				expect(result).toBe(true);
			});

			const req = httpMock.expectOne('/api/horario/asignar-profesor');
			expect(req.request.method).toBe('POST');
			expect(req.request.body).toEqual(dto);
			req.flush(true);
		});
	});

	describe('asignarEstudiantes', () => {
		const dto: HorarioAsignarEstudiantesDto = {
			horarioId: 10,
			estudianteIds: [300, 301],
			usuarioReg: 'admin',
		};

		it('should POST asignar estudiantes', () => {
			service.asignarEstudiantes(dto).subscribe((result) => {
				expect(result).toBe(true);
			});

			const req = httpMock.expectOne('/api/horario/asignar-estudiantes');
			expect(req.request.method).toBe('POST');
			expect(req.request.body).toEqual(dto);
			req.flush(true);
		});
	});

	describe('asignarTodosEstudiantes', () => {
		it('should POST asignar todos estudiantes', () => {
			service.asignarTodosEstudiantes(10, 'admin').subscribe((result) => {
				expect(result).toBe(true);
			});

			const req = httpMock.expectOne(
				'/api/horario/10/asignar-todos-estudiantes?usuarioReg=admin',
			);
			expect(req.request.method).toBe('POST');
			req.flush(true);
		});
	});

	describe('desasignarProfesor', () => {
		it('should PUT desasignar profesor', () => {
			service.desasignarProfesor(10, 'admin').subscribe((result) => {
				expect(result).toBe(true);
			});

			const req = httpMock.expectOne(
				'/api/horario/10/desasignar-profesor?usuarioMod=admin',
			);
			expect(req.request.method).toBe('PUT');
			req.flush(true);
		});
	});

	describe('desasignarEstudiante', () => {
		it('should DELETE estudiante from horario', () => {
			service.desasignarEstudiante(10, 300).subscribe((result) => {
				expect(result).toBe(true);
			});

			const req = httpMock.expectOne('/api/horario/10/estudiante/300');
			expect(req.request.method).toBe('DELETE');
			req.flush(true);
		});
	});
	// #endregion

	// #region Import
	describe('importarHorarios', () => {
		const items: ImportarHorarioItem[] = [
			{ diaSemana: 1, horaInicio: '08:00', horaFin: '09:00', salonId: 10, cursoId: 100 },
		];

		it('should POST importar horarios', () => {
			service.importarHorarios(items).subscribe((result) => {
				expect(result).toEqual(mockImportResult);
			});

			const req = httpMock.expectOne('/api/horario/importar');
			expect(req.request.method).toBe('POST');
			expect(req.request.body).toEqual({ items });
			req.flush(mockImportResult);
		});
	});
	// #endregion

	// #region Estadísticas
	describe('getEstadisticas', () => {
		it('should return null when endpoint not implemented (of(null))', () => {
			service.getEstadisticas().subscribe((estadisticas) => {
				expect(estadisticas).toBeNull();
			});

			// No HTTP request should be made since it uses of(null)
			httpMock.expectNone('/api/horarios/estadisticas');
		});
	});
	// #endregion

	// #region Error handling
	describe('error handling', () => {
		it('should handle HTTP error on getAll', () => {
			let error: HttpErrorResponse | null = null;

			service.getAll().subscribe({
				error: (err) => {
					error = err;
				},
			});

			const req = httpMock.expectOne('/api/horario');
			req.flush('Server error', { status: 500, statusText: 'Server Error' });

			expect(error).toBeTruthy();
			expect(error?.status).toBe(500);
		});
	});
	// #endregion
});
// #endregion
