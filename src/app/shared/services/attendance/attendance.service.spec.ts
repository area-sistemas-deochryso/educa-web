// * Tests for AttendanceService — validates attendance API gateway.
// #region Imports
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { AttendanceService } from './attendance.service';

// #endregion

// #region Tests
describe('AttendanceService', () => {
	let service: AttendanceService;
	let httpMock: HttpTestingController;

	beforeEach(() => {
		TestBed.configureTestingModule({
			providers: [
				AttendanceService,
				provideHttpClient(),
				provideHttpClientTesting(),
			],
		});
		service = TestBed.inject(AttendanceService);
		httpMock = TestBed.inject(HttpTestingController);
	});

	// #region Estudiante
	describe('estudiante', () => {
		it('should get mis asistencias', () => {
			service.getMisAsistencias(3, 2026).subscribe((data) => {
				expect(data).not.toBeNull();
			});

			const req = httpMock.expectOne((r) => r.url.includes('/estudiante/mis-asistencias'));
			expect(req.request.params.get('mes')).toBe('3');
			expect(req.request.params.get('anio')).toBe('2026');
			req.flush({ totalDias: 20 });
		});

		it('should return null on error', () => {
			service.getMisAsistencias().subscribe((data) => {
				expect(data).toBeNull();
			});

			httpMock.expectOne((r) => r.url.includes('/estudiante/mis-asistencias')).error(new ProgressEvent('error'));
		});
	});
	// #endregion

	// #region Apoderado
	describe('apoderado', () => {
		it('should get hijos', () => {
			service.getHijos().subscribe((hijos) => {
				expect(hijos).toHaveLength(1);
			});

			httpMock.expectOne((r) => r.url.includes('/apoderado/hijos')).flush([{ id: 1 }]);
		});

		it('should return empty on error', () => {
			service.getHijos().subscribe((hijos) => {
				expect(hijos).toEqual([]);
			});

			httpMock.expectOne((r) => r.url.includes('/apoderado/hijos')).error(new ProgressEvent('error'));
		});

		it('should get asistencia de hijo', () => {
			service.getAsistenciaHijo(1, 3, 2026).subscribe();

			const req = httpMock.expectOne((r) => r.url.includes('/apoderado/hijo/1/asistencias'));
			expect(req.request.params.get('mes')).toBe('3');
			req.flush({ totalDias: 15 });
		});
	});
	// #endregion

	// #region Profesor
	describe('profesor', () => {
		it('should get salones profesor', () => {
			service.getSalonesProfesor().subscribe((salones) => {
				expect(salones).toHaveLength(2);
			});

			httpMock.expectOne((r) => r.url.includes('/profesor/salones')).flush([{ id: 1 }, { id: 2 }]);
		});

		it('should get asistencias por grado', () => {
			service.getAsistenciasGrado('3ro', 'A', 3, 2026).subscribe();

			const req = httpMock.expectOne((r) => r.url.includes('/profesor/grado'));
			expect(req.request.params.get('grado')).toBe('3ro');
			expect(req.request.params.get('seccion')).toBe('A');
			req.flush([]);
		});

		it('should get asistencia dia', () => {
			const fecha = new Date(2026, 2, 21);
			service.getAsistenciaDia('3ro', 'A', fecha).subscribe();

			const req = httpMock.expectOne((r) => r.url.includes('/profesor/asistencia-dia'));
			expect(req.request.params.get('fecha')).toBe('2026-03-21');
			req.flush({ estudiantes: [], estadisticas: {} });
		});
	});
	// #endregion

	// #region Director
	describe('director', () => {
		it('should get salones director', () => {
			service.getSalonesDirector().subscribe((salones) => {
				expect(salones).toHaveLength(0);
			});

			httpMock.expectOne((r) => r.url.includes('/director/salones')).flush([]);
		});

		it('should get estadisticas director', () => {
			service.getEstadisticasDirector().subscribe((stats) => {
				expect(stats).not.toBeNull();
			});

			httpMock.expectOne((r) => r.url.includes('/director/estadisticas')).flush({ total: 100 });
		});

		it('should get reporte director with filters', () => {
			const fecha = new Date(2026, 2, 21);
			service.getReporteDirector(fecha, '3ro', 'A').subscribe();

			const req = httpMock.expectOne((r) => r.url.includes('/director/reporte'));
			expect(req.request.params.get('grado')).toBe('3ro');
			expect(req.request.params.get('seccion')).toBe('A');
			req.flush([]);
		});

		it('should get grados secciones disponibles', () => {
			service.getGradosSeccionesDisponibles().subscribe((gs) => {
				expect(gs).toHaveLength(2);
			});

			httpMock.expectOne((r) => r.url.includes('/director/salones')).flush([
				{ grado: '3ro', gradoCodigo: '3', seccion: 'A' },
				{ grado: '3ro', gradoCodigo: '3', seccion: 'B' },
			]);
		});

		it('should deduplicate grados secciones', () => {
			service.getGradosSeccionesDisponibles().subscribe((gs) => {
				expect(gs).toHaveLength(1);
			});

			httpMock.expectOne((r) => r.url.includes('/director/salones')).flush([
				{ grado: '3ro', gradoCodigo: '3', seccion: 'A' },
				{ grado: '3ro', gradoCodigo: '3', seccion: 'A' },
			]);
		});
	});
	// #endregion

	// #region Justificaciones
	describe('justificaciones', () => {
		it('should post justificacion', () => {
			const fecha = new Date(2026, 2, 21);
			service.justificarAsistencia(1, fecha, 'Enfermedad').subscribe((res) => {
				expect(res.success).toBe(true);
			});

			const req = httpMock.expectOne((r) => r.url.includes('/justificar'));
			expect(req.request.method).toBe('POST');
			expect(req.request.body.estudianteId).toBe(1);
			expect(req.request.body.fecha).toBe('2026-03-21');
			expect(req.request.body.quitar).toBe(false);
			req.flush({ success: true, message: 'ok' });
		});

		it('should handle error gracefully', () => {
			service.justificarAsistencia(1, new Date(), 'test').subscribe((res) => {
				expect(res.success).toBe(false);
			});

			httpMock.expectOne((r) => r.url.includes('/justificar')).error(new ProgressEvent('error'));
		});
	});
	// #endregion

	// #region Estados válidos
	describe('estados válidos', () => {
		it('should get estados validos', () => {
			service.getEstadosValidos().subscribe((estados) => {
				expect(estados).toHaveLength(2);
			});

			httpMock.expectOne((r) => r.url.includes('/estados-validos')).flush([
				{ codigo: 'P', descripcion: 'Presente' },
				{ codigo: 'F', descripcion: 'Falta' },
			]);
		});

		it('should return empty on error', () => {
			service.getEstadosValidos().subscribe((estados) => {
				expect(estados).toEqual([]);
			});

			httpMock.expectOne((r) => r.url.includes('/estados-validos')).error(new ProgressEvent('error'));
		});
	});
	// #endregion

	// #region PDF downloads
	describe('PDF downloads', () => {
		it('should download dia PDF', () => {
			const fecha = new Date(2026, 2, 21);
			service.descargarPdfAsistenciaDia('3ro', 'A', fecha).subscribe();

			const req = httpMock.expectOne((r) => r.url.includes('/asistencia-dia/pdf'));
			expect(req.request.responseType).toBe('blob');
			req.flush(new Blob());
		});

		it('should download mes PDF', () => {
			service.descargarPdfAsistenciaMes('3ro', 'A', 3, 2026).subscribe();

			const req = httpMock.expectOne((r) => r.url.includes('/asistencia-mes/pdf'));
			expect(req.request.params.get('mes')).toBe('3');
			req.flush(new Blob());
		});
	});
	// #endregion
});
// #endregion
