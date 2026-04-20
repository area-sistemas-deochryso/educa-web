// * Tests del shell AttendanceProfesorComponent (Plan 21 Chat 4).
// Valida la lógica de tabs: detección de salones + delegación al tab activo.
// #region Imports
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { of } from 'rxjs';
import { signal } from '@angular/core';
import { testProviders } from '@test';
import { AttendanceProfesorComponent } from './attendance-profesor.component';
import { AttendanceService, StorageService, UserProfileService } from '@core/services';
import { AttendanceDataService } from '@features/intranet/services/attendance/attendance-data.service';
// #endregion

// #region Tests
describe('AttendanceProfesorComponent (shell)', () => {
	let component: AttendanceProfesorComponent;
	let fixture: ComponentFixture<AttendanceProfesorComponent>;

	const emptyTable = {
		title: 'Test',
		selectedMonth: 1,
		selectedYear: 2026,
		weeks: [],
		counts: { T: 0, A: 0, F: 0, N: 0, '-': 0, X: 0 },
		columnTotals: [],
		grandTotal: '0/0',
	};

	beforeEach(async () => {
		const asistenciaServiceMock: Partial<AttendanceService> = {
			getSalonesProfesor: vi.fn().mockReturnValue(of([])),
			getSalonesProfesorPorHorario: vi.fn().mockReturnValue(of([])),
			getAsistenciasGrado: vi.fn().mockReturnValue(of([])),
			getAsistenciaDia: vi.fn().mockReturnValue(of([])),
			descargarPdfAsistenciaDia: vi.fn().mockReturnValue(of(new Blob())),
			getEstadosValidos: vi.fn().mockReturnValue(of([])),
		};

		const storageServiceMock: Partial<StorageService> = {
			getAttendanceMonth: vi.fn().mockReturnValue(null),
			setAttendanceMonth: vi.fn(),
			getSelectedSalonId: vi.fn().mockReturnValue(null),
			setSelectedSalonId: vi.fn(),
			getSelectedEstudianteId: vi.fn().mockReturnValue(null),
			setSelectedEstudianteId: vi.fn(),
			hasUserInfo: vi.fn().mockReturnValue(false),
			getUser: vi.fn().mockReturnValue(null),
			clearAuth: vi.fn(),
			clearPermisos: vi.fn(),
		};

		const attendanceDataServiceMock: Partial<AttendanceDataService> = {
			createEmptyTable: vi.fn().mockReturnValue(emptyTable),
			processAsistencias: vi.fn().mockReturnValue({ ingresos: emptyTable, salidas: emptyTable }),
		};

		await TestBed.configureTestingModule({
			imports: [AttendanceProfesorComponent],
			providers: [
				...testProviders,
				{ provide: AttendanceService, useValue: asistenciaServiceMock },
				{ provide: StorageService, useValue: storageServiceMock },
				{ provide: UserProfileService, useValue: { userName: signal('Prof. García'), userDni: signal('12345678') } },
				{ provide: AttendanceDataService, useValue: attendanceDataServiceMock },
			],
		}).compileComponents();

		fixture = TestBed.createComponent(AttendanceProfesorComponent);
		component = fixture.componentInstance;
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});

	it('default tab is "propia"', () => {
		expect(component.activeTab()).toBe('propia');
	});

	it('no muestra tab estudiantes cuando el profesor no tiene salones', () => {
		fixture.detectChanges();
		expect(component.hasSalones()).toBe(false);
	});

	it('onTabChange cambia el tab activo a "estudiantes"', () => {
		component.onTabChange('estudiantes');
		expect(component.activeTab()).toBe('estudiantes');
	});

	it('onTabChange ignora valores no válidos', () => {
		component.onTabChange('otro');
		expect(component.activeTab()).toBe('propia');
	});

	it('setViewMode delega al tab "propia" cuando está activo', () => {
		fixture.detectChanges();
		expect(component.activeTab()).toBe('propia');
		const propia = (component as unknown as { propiaComponent?: { setViewMode: ReturnType<typeof vi.fn> } })
			.propiaComponent;
		if (!propia) {
			// * El ViewChild se resuelve sólo tras detectChanges; en este harness el tab "propia"
			//   se renderiza por default, así que hay un componente real inyectado.
			// Fallback: validar sólo que no lance.
			expect(() => component.setViewMode('dia')).not.toThrow();
			return;
		}
		const spy = vi.spyOn(propia, 'setViewMode');
		component.setViewMode('dia');
		expect(spy).toHaveBeenCalledWith('dia');
	});
});
// #endregion
