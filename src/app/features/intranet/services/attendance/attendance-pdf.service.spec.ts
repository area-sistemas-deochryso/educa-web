import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { AttendancePdfService } from './attendance-pdf.service';
import { AttendanceService } from '@intranet-shared/services';
import { DestroyRef } from '@angular/core';
import { of, throwError } from 'rxjs';

// Mock de AttendanceService
const mockAttendanceService = {
	descargarPdfAsistenciaDia: vi.fn(),
	descargarPdfAsistenciaMes: vi.fn(),
	descargarPdfAsistenciaPeriodo: vi.fn(),
	descargarExcelAsistenciaDia: vi.fn(),
	descargarExcelAsistenciaMes: vi.fn(),
	descargarExcelAsistenciaPeriodo: vi.fn(),
};

// Mock de DestroyRef
const mockDestroyRef = {
	onDestroy: vi.fn(),
};

// Helpers globales mockeados
const mockViewBlobInNewTab = vi.fn();
const mockDownloadBlob = vi.fn();

// Re-exportar helpers mockeados para que el servicio los use
vi.mock('@core/helpers', () => ({
	viewBlobInNewTab: mockViewBlobInNewTab,
	downloadBlob: mockDownloadBlob,
}));

describe('AttendancePdfService', () => {
	let service: AttendancePdfService;
	let attendanceService: AttendanceService;
	let destroyRef: DestroyRef;

	beforeEach(() => {
		vi.clearAllMocks();
		mockViewBlobInNewTab.mockClear();
		mockDownloadBlob.mockClear();

		TestBed.configureTestingModule({
			providers: [
				{ provide: AttendanceService, useValue: mockAttendanceService },
				{ provide: DestroyRef, useValue: mockDestroyRef },
			],
		});

		service = TestBed.runInInjectionContext(() => new AttendancePdfService());
		attendanceService = TestBed.inject(AttendanceService);
		destroyRef = TestBed.inject(DestroyRef);
	});

	it('debe crear el servicio', () => {
		expect(service).toBeTruthy();
	});

	it('debe tener downloadingPdf inicializado en false', () => {
		expect(service.downloadingPdf()).toBe(false);
	});

	describe('init', () => {
		it('debe establecer el getSelectorContext', () => {
			const mockContext = { grado: '1ro', seccion: 'A' } as any;
			const fn = vi.fn(() => mockContext);
			service.init(fn);
			expect(service['getSelectorContext']()).toEqual(mockContext);
		});
	});

	describe('verPdfAsistenciaDia', () => {
		it('debe llamar al servicio y viewBlobInNewTab cuando hay contexto', () => {
			const ctx = { grado: '1ro', seccion: 'A' } as any;
			const fecha = new Date(2026, 2, 15);
			const blob = new Blob(['pdf'], { type: 'application/pdf' });
			vi.mocked(mockAttendanceService.descargarPdfAsistenciaDia).mockReturnValue(of(blob));
			service['getSelectorContext'] = () => ctx;

			service.verPdfAsistenciaDia(fecha);

			expect(mockAttendanceService.descargarPdfAsistenciaDia).toHaveBeenCalledWith('1ro', 'A', fecha);
			expect(mockViewBlobInNewTab).toHaveBeenCalledWith(blob);
		});

		it('no debe hacer nada si no hay contexto', () => {
			service['getSelectorContext'] = () => null;
			service.verPdfAsistenciaDia(new Date());
			expect(mockAttendanceService.descargarPdfAsistenciaDia).not.toHaveBeenCalled();
		});
	});

	describe('descargarPdfAsistenciaDia', () => {
		it('debe descargar con nombre de archivo correcto', () => {
			const ctx = { grado: '1ro', seccion: 'A' } as any;
			const fecha = new Date(2026, 2, 15);
			const blob = new Blob(['pdf'], { type: 'application/pdf' });
			vi.mocked(mockAttendanceService.descargarPdfAsistenciaDia).mockReturnValue(of(blob));
			service['getSelectorContext'] = () => ctx;

			service.descargarPdfAsistenciaDia(fecha);

			expect(mockDownloadBlob).toHaveBeenCalledWith(
				blob,
				'Asistencia_1ro_A_2026-03-15.pdf'
			);
		});

		it('no debe hacer nada si no hay contexto', () => {
			service['getSelectorContext'] = () => null;
			service.descargarPdfAsistenciaDia(new Date());
			expect(mockDownloadBlob).not.toHaveBeenCalled();
		});
	});

	describe('verPdfAsistenciaMes', () => {
		it('debe llamar al servicio y viewBlobInNewTab', () => {
			const blob = new Blob(['pdf'], { type: 'application/pdf' });
			vi.mocked(mockAttendanceService.descargarPdfAsistenciaMes).mockReturnValue(of(blob));

			service.verPdfAsistenciaMes('1ro', 'A', 3, 2026);

			expect(mockAttendanceService.descargarPdfAsistenciaMes).toHaveBeenCalledWith('1ro', 'A', 3, 2026);
			expect(mockViewBlobInNewTab).toHaveBeenCalledWith(blob);
		});
	});

	describe('descargarPdfAsistenciaMes', () => {
		it('debe descargar con nombre de archivo correcto', () => {
			const blob = new Blob(['pdf'], { type: 'application/pdf' });
			vi.mocked(mockAttendanceService.descargarPdfAsistenciaMes).mockReturnValue(of(blob));

			service.descargarPdfAsistenciaMes('1ro', 'A', 3, 2026);

			expect(mockDownloadBlob).toHaveBeenCalledWith(
				blob,
				'Asistencia_1ro_A_2026-03.pdf'
			);
		});
	});

	describe('verPdfAsistenciaPeriodo', () => {
		it('debe llamar al servicio y viewBlobInNewTab', () => {
			const blob = new Blob(['pdf'], { type: 'application/pdf' });
			vi.mocked(mockAttendanceService.descargarPdfAsistenciaPeriodo).mockReturnValue(of(blob));

			service.verPdfAsistenciaPeriodo('1ro', 'A', 3, 2026, 5, 2026);

			expect(mockAttendanceService.descargarPdfAsistenciaPeriodo).toHaveBeenCalledWith(
				'1ro', 'A', 3, 2026, 5, 2026
			);
			expect(mockViewBlobInNewTab).toHaveBeenCalledWith(blob);
		});
	});

	describe('descargarPdfAsistenciaPeriodo', () => {
		it('debe descargar con nombre de archivo correcto', () => {
			const blob = new Blob(['pdf'], { type: 'application/pdf' });
			vi.mocked(mockAttendanceService.descargarPdfAsistenciaPeriodo).mockReturnValue(of(blob));

			service.descargarPdfAsistenciaPeriodo('1ro', 'A', 3, 2026, 5, 2026);

			expect(mockDownloadBlob).toHaveBeenCalledWith(
				blob,
				'Asistencia_1ro_A_Periodo_2026-03_a_2026-05.pdf'
			);
		});
	});

	describe('verPdfSalonMes', () => {
		it('debe llamar al servicio con contexto del selector', () => {
			const ctx = { grado: '2do', seccion: 'B' } as any;
			const fecha = new Date(2026, 3, 10);
			const blob = new Blob(['pdf'], { type: 'application/pdf' });
			vi.mocked(mockAttendanceService.descargarPdfAsistenciaMes).mockReturnValue(of(blob));
			service['getSelectorContext'] = () => ctx;

			service.verPdfSalonMes(fecha);

			expect(mockAttendanceService.descargarPdfAsistenciaMes).toHaveBeenCalledWith(
				'2do', 'B', 4, 2026
			);
			expect(mockViewBlobInNewTab).toHaveBeenCalledWith(blob);
		});

		it('no debe hacer nada si no hay contexto', () => {
			service['getSelectorContext'] = () => null;
			service.verPdfSalonMes(new Date());
			expect(mockAttendanceService.descargarPdfAsistenciaMes).not.toHaveBeenCalled();
		});
	});

	describe('descargarPdfSalonMes', () => {
		it('debe descargar con nombre de archivo correcto', () => {
			const ctx = { grado: '2do', seccion: 'B' } as any;
			const fecha = new Date(2026, 3, 10);
			const blob = new Blob(['pdf'], { type: 'application/pdf' });
			vi.mocked(mockAttendanceService.descargarPdfAsistenciaMes).mockReturnValue(of(blob));
			service['getSelectorContext'] = () => ctx;

			service.descargarPdfSalonMes(fecha);

			expect(mockDownloadBlob).toHaveBeenCalledWith(
				blob,
				'Asistencia_2do_B_2026-04.pdf'
			);
		});
	});

	describe('verPdfSalonAnio', () => {
		it('debe llamar al servicio con rango de año del salón', () => {
			const ctx = { grado: '3ro', seccion: 'C' } as any;
			const fecha = new Date(2026, 5, 15); // Junio 2026, mismo año que hoy (2026)
			const blob = new Blob(['pdf'], { type: 'application/pdf' });
			vi.mocked(mockAttendanceService.descargarPdfAsistenciaPeriodo).mockReturnValue(of(blob));
			service['getSelectorContext'] = () => ctx;

			service.verPdfSalonAnio(fecha);

			// mesFin = mes actual (6), anio = 2026
			expect(mockAttendanceService.descargarPdfAsistenciaPeriodo).toHaveBeenCalledWith(
				'3ro', 'C', 1, 2026, 6, 2026
			);
			expect(mockViewBlobInNewTab).toHaveBeenCalledWith(blob);
		});

		it('no debe hacer nada si no hay contexto', () => {
			service['getSelectorContext'] = () => null;
			service.verPdfSalonAnio(new Date());
			expect(mockAttendanceService.descargarPdfAsistenciaPeriodo).not.toHaveBeenCalled();
		});
	});

	describe('descargarPdfSalonAnio', () => {
		it('debe descargar con nombre de archivo correcto', () => {
			const ctx = { grado: '3ro', seccion: 'C' } as any;
			const fecha = new Date(2026, 5, 15);
			const blob = new Blob(['pdf'], { type: 'application/pdf' });
			vi.mocked(mockAttendanceService.descargarPdfAsistenciaPeriodo).mockReturnValue(of(blob));
			service['getSelectorContext'] = () => ctx;

			service.descargarPdfSalonAnio(fecha);

			expect(mockDownloadBlob).toHaveBeenCalledWith(
				blob,
				'Asistencia_3ro_C_Anio_2026.pdf'
			);
		});
	});

	describe('verMesFromContext / descargarMesFromContext', () => {
		it('verMesFromContext debe llamar al servicio con contexto', () => {
			const ctx = { grado: '4to', seccion: 'D' } as any;
			const blob = new Blob(['pdf'], { type: 'application/pdf' });
			vi.mocked(mockAttendanceService.descargarPdfAsistenciaMes).mockReturnValue(of(blob));
			service['getSelectorContext'] = () => ctx;

			service.verMesFromContext(5, 2026);

			expect(mockAttendanceService.descargarPdfAsistenciaMes).toHaveBeenCalledWith('4to', 'D', 5, 2026);
			expect(mockViewBlobInNewTab).toHaveBeenCalledWith(blob);
		});

		it('descargarMesFromContext debe llamar al servicio con contexto', () => {
			const ctx = { grado: '4to', seccion: 'D' } as any;
			const blob = new Blob(['pdf'], { type: 'application/pdf' });
			vi.mocked(mockAttendanceService.descargarPdfAsistenciaMes).mockReturnValue(of(blob));
			service['getSelectorContext'] = () => ctx;

			service.descargarMesFromContext(5, 2026);

			expect(mockDownloadBlob).toHaveBeenCalledWith(
				blob,
				'Asistencia_4to_D_2026-05.pdf'
			);
		});
	});

	describe('verPeriodoFromContext / descargarPeriodoFromContext', () => {
		it('verPeriodoFromContext debe llamar al servicio con contexto', () => {
			const ctx = { grado: '5to', seccion: 'E' } as any;
			const blob = new Blob(['pdf'], { type: 'application/pdf' });
			vi.mocked(mockAttendanceService.descargarPdfAsistenciaPeriodo).mockReturnValue(of(blob));
			service['getSelectorContext'] = () => ctx;

			service.verPeriodoFromContext(2, 2026, 4, 2026);

			expect(mockAttendanceService.descargarPdfAsistenciaPeriodo).toHaveBeenCalledWith(
				'5to', 'E', 2, 2026, 4, 2026
			);
			expect(mockViewBlobInNewTab).toHaveBeenCalledWith(blob);
		});

		it('descargarPeriodoFromContext debe llamar al servicio con contexto', () => {
			const ctx = { grado: '5to', seccion: 'E' } as any;
			const blob = new Blob(['pdf'], { type: 'application/pdf' });
			vi.mocked(mockAttendanceService.descargarPdfAsistenciaPeriodo).mockReturnValue(of(blob));
			service['getSelectorContext'] = () => ctx;

			service.descargarPeriodoFromContext(2, 2026, 4, 2026);

			expect(mockDownloadBlob).toHaveBeenCalledWith(
				blob,
				'Asistencia_5to_E_Periodo_2026-02_a_2026-04.pdf'
			);
		});
	});

	describe('descargarExcelAsistenciaDia', () => {
		it('debe descargar Excel con nombre de archivo correcto', () => {
			const ctx = { grado: '6to', seccion: 'F' } as any;
			const fecha = new Date(2026, 0, 20);
			const blob = new Blob(['xlsx'], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
			vi.mocked(mockAttendanceService.descargarExcelAsistenciaDia).mockReturnValue(of(blob));
			service['getSelectorContext'] = () => ctx;

			service.descargarExcelAsistenciaDia(fecha);

			expect(mockDownloadBlob).toHaveBeenCalledWith(
				blob,
				'Asistencia_6to_F_2026-01-20.xlsx'
			);
		});
	});

	describe('descargarExcelAsistenciaMes', () => {
		it('debe descargar Excel de mes', () => {
			const blob = new Blob(['xlsx'], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
			vi.mocked(mockAttendanceService.descargarExcelAsistenciaMes).mockReturnValue(of(blob));

			service.descargarExcelAsistenciaMes('6to', 'F', 2, 2026);

			expect(mockDownloadBlob).toHaveBeenCalledWith(
				blob,
				'Asistencia_6to_F_2026-02.xlsx'
			);
		});
	});

	describe('descargarExcelAsistenciaPeriodo', () => {
		it('debe descargar Excel de periodo', () => {
			const blob = new Blob(['xlsx'], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
			vi.mocked(mockAttendanceService.descargarExcelAsistenciaPeriodo).mockReturnValue(of(blob));

			service.descargarExcelAsistenciaPeriodo('6to', 'F', 1, 2026, 3, 2026);

			expect(mockDownloadBlob).toHaveBeenCalledWith(
				blob,
				'Asistencia_6to_F_Periodo_2026-01_a_2026-03.xlsx'
			);
		});
	});

	describe('descargarExcelSalonMes', () => {
		it('debe descargar Excel de salón mes con contexto', () => {
			const ctx = { grado: '7mo', seccion: 'G' } as any;
			const fecha = new Date(2026, 6, 5);
			const blob = new Blob(['xlsx'], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
			vi.mocked(mockAttendanceService.descargarExcelAsistenciaMes).mockReturnValue(of(blob));
			service['getSelectorContext'] = () => ctx;

			service.descargarExcelSalonMes(fecha);

			expect(mockDownloadBlob).toHaveBeenCalledWith(
				blob,
				'Asistencia_7mo_G_2026-07.xlsx'
			);
		});
	});

	describe('descargarExcelSalonAnio', () => {
		it('debe descargar Excel de salón año con contexto', () => {
			const ctx = { grado: '8vo', seccion: 'H' } as any;
			const fecha = new Date(2026, 8, 10);
			const blob = new Blob(['xlsx'], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
			vi.mocked(mockAttendanceService.descargarExcelAsistenciaPeriodo).mockReturnValue(of(blob));
			service['getSelectorContext'] = () => ctx;

			service.descargarExcelSalonAnio(fecha);

			expect(mockDownloadBlob).toHaveBeenCalledWith(
				blob,
				'Asistencia_8vo_H_Anio_2026.xlsx'
			);
		});
	});

	describe('descargarExcelMesFromContext / descargarExcelPeriodoFromContext', () => {
		it('descargarExcelMesFromContext debe llamar al servicio con contexto', () => {
			const ctx = { grado: '9no', seccion: 'I' } as any;
			const blob = new Blob(['xlsx'], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
			vi.mocked(mockAttendanceService.descargarExcelAsistenciaMes).mockReturnValue(of(blob));
			service['getSelectorContext'] = () => ctx;

			service.descargarExcelMesFromContext(4, 2026);

			expect(mockDownloadBlob).toHaveBeenCalledWith(
				blob,
				'Asistencia_9no_I_2026-04.xlsx'
			);
		});

		it('descargarExcelPeriodoFromContext debe llamar al servicio con contexto', () => {
			const ctx = { grado: '1ro', seccion: 'A' } as any;
			const blob = new Blob(['xlsx'], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
			vi.mocked(mockAttendanceService.descargarExcelAsistenciaPeriodo).mockReturnValue(of(blob));
			service['getSelectorContext'] = () => ctx;

			service.descargarExcelPeriodoFromContext(1, 2026, 6, 2026);

			expect(mockDownloadBlob).toHaveBeenCalledWith(
				blob,
				'Asistencia_1ro_A_Periodo_2026-01_a_2026-06.xlsx'
			);
		});
	});

	describe('run (helper privado)', () => {
		it('debe establecer downloadingPdf en true durante la ejecución', async () => {
			const ctx = { grado: '1ro', seccion: 'A' } as any;
			const blob = new Blob(['pdf'], { type: 'application/pdf' });
			vi.mocked(mockAttendanceService.descargarPdfAsistenciaDia).mockReturnValue(of(blob));
			service['getSelectorContext'] = () => ctx;

			// Iniciar descarga (asíncrona)
			service.descargarPdfAsistenciaDia(new Date(2026, 0, 1));

			// Inmediatamente después de iniciar, downloadingPdf debe ser true
			expect(service.downloadingPdf()).toBe(true);

			// Esperar a que se complete
			await new Promise(resolve => setTimeout(resolve, 10));
			expect(service.downloadingPdf()).toBe(false);
		});
	});

	describe('salonAnioRange', () => {
		it('debe devolver mes actual y año actual cuando es el año actual', () => {
			const hoy = new Date();
			const result = service['salonAnioRange'](hoy);
			expect(result.anio).toBe(hoy.getFullYear());
			expect(result.mesFin).toBe(hoy.getMonth() + 1);
		});

		it('debe devolver mes 12 para años pasados', () => {
			const fechaPasada = new Date(2020, 5, 15);
			const result = service['salonAnioRange'](fechaPasada);
			expect(result.anio).toBe(2020);
			expect(result.mesFin).toBe(12);
		});
	});
});
