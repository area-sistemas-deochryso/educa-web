import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { signal, computed } from '@angular/core';
import { testProviders } from '@test';

import { AttendanceComponent } from './attendance.component';
import { AttendanceFacade } from './services/attendance.facade';
import { AttendanceDataService } from './services/attendance-data.service';
import {
	VoiceRecognitionService,
	AsistenciaService,
	AuthService,
	StorageService,
} from '@core/services';

describe('AttendanceComponent', () => {
	let facadeMock: Partial<AttendanceFacade>;
	let voiceServiceMock: Partial<VoiceRecognitionService>;
	let asistenciaServiceMock: Partial<AsistenciaService>;
	let authServiceMock: Partial<AuthService>;
	let storageServiceMock: Partial<StorageService>;
	let attendanceDataServiceMock: Partial<AttendanceDataService>;

	beforeEach(async () => {
		const emptyTable = {
			title: 'Test',
			rows: [],
			selectedMonth: new Date().getMonth() + 1,
			selectedYear: new Date().getFullYear(),
		};

		facadeMock = {
			loading: signal(false),
			error: signal<string | null>(null),
			resumen: signal(null),
			userRole: signal<'Estudiante' | 'Apoderado' | 'Profesor' | ''>('Estudiante'),
			studentName: signal('Test Student'),
			ingresos: signal(emptyTable),
			salidas: signal(emptyTable),
			hijos: signal([]),
			selectedHijoId: signal<number | null>(null),
			selectedHijo: computed(() => null),
			nombreProfesor: signal<string | null>(null),
			salones: signal([]),
			selectedSalonId: signal<number | null>(null),
			selectedSalon: computed(() => null),
			estudiantes: signal([]),
			selectedEstudianteId: signal<number | null>(null),
			selectedEstudiante: computed(() => null),
			estudiantesAsHijos: computed(() => []),
			initialize: vi.fn(),
			updateSelectedMonth: vi.fn(),
			updateSelectedYear: vi.fn(),
			reloadCurrentData: vi.fn(),
			reloadIngresosData: vi.fn(),
			reloadSalidasData: vi.fn(),
			selectHijo: vi.fn(),
			selectSalon: vi.fn(),
			selectEstudiante: vi.fn(),
		};

		voiceServiceMock = {
			onCommand: vi.fn().mockReturnValue(() => {}),
		};

		asistenciaServiceMock = {};
		authServiceMock = {
			currentUser: null,
		};
		storageServiceMock = {
			getUser: vi.fn().mockReturnValue(null),
			getAttendanceMonth: vi.fn().mockReturnValue(null),
			setAttendanceMonth: vi.fn(),
			getSelectedHijoId: vi.fn().mockReturnValue(null),
			setSelectedHijoId: vi.fn(),
			getSelectedSalonId: vi.fn().mockReturnValue(null),
			setSelectedSalonId: vi.fn(),
			getSelectedEstudianteId: vi.fn().mockReturnValue(null),
			setSelectedEstudianteId: vi.fn(),
		};
		attendanceDataServiceMock = {
			createEmptyTable: vi.fn().mockReturnValue(emptyTable),
			processAsistencias: vi
				.fn()
				.mockReturnValue({ ingresos: emptyTable, salidas: emptyTable }),
		};

		await TestBed.configureTestingModule({
			imports: [AttendanceComponent],
			providers: [
				...testProviders,
				{ provide: VoiceRecognitionService, useValue: voiceServiceMock },
				{ provide: AsistenciaService, useValue: asistenciaServiceMock },
				{ provide: AuthService, useValue: authServiceMock },
				{ provide: StorageService, useValue: storageServiceMock },
				{ provide: AttendanceDataService, useValue: attendanceDataServiceMock },
			],
		})
			.overrideComponent(AttendanceComponent, {
				set: {
					providers: [{ provide: AttendanceFacade, useValue: facadeMock }],
				},
			})
			.compileComponents();
	});

	it('should create the facade mock', () => {
		expect(facadeMock).toBeTruthy();
		expect(facadeMock.userRole!()).toBe('Estudiante');
		expect(facadeMock.studentName!()).toBe('Test Student');
		expect(facadeMock.loading!()).toBe(false);
	});

	it('should have correct initial values in facade', () => {
		expect(facadeMock.hijos!().length).toBe(0);
		expect(facadeMock.salones!().length).toBe(0);
		expect(facadeMock.estudiantes!().length).toBe(0);
	});

	it('should have facade methods available', () => {
		expect(facadeMock.initialize).toBeDefined();
		expect(facadeMock.reloadCurrentData).toBeDefined();
		expect(facadeMock.selectHijo).toBeDefined();
		expect(facadeMock.selectSalon).toBeDefined();
	});
});
