import { environment } from '@config';

import { K6RoleDistribution, K6TestConfig, PresetEndpoint, TestTypeOption } from './ctest-k6.models';

// #region Base URL Options
export const BASE_URL_OPTIONS = [
	{ label: 'Local (localhost:7102)', value: 'https://localhost:7102' },
	{ label: 'Producción (Azure)', value: 'https://educacom.azurewebsites.net' },
];
// #endregion

// #region Test Types
export const TEST_TYPE_OPTIONS: TestTypeOption[] = [
	{
		label: 'Smoke',
		value: 'smoke',
		tooltip:
			'Verificar que el sistema funciona con carga mínima. Ideal para validar que los endpoints responden correctamente.',
		icon: 'pi pi-check-circle',
		defaultVus: 1,
		defaultDuration: '1m',
		defaultStages: [
			{ duration: '30s', target: 1, endpointIndices: [] },
			{ duration: '30s', target: 1, endpointIndices: [] },
		],
	},
	{
		label: 'Load',
		value: 'load',
		tooltip:
			'Simular carga normal esperada. Ramp-up gradual hasta el número objetivo de usuarios y mantener.',
		icon: 'pi pi-users',
		defaultVus: 100,
		defaultDuration: '3m',
		defaultStages: [
			{ duration: '30s', target: 50, endpointIndices: [] },
			{ duration: '45s', target: 100, endpointIndices: [] },
			{ duration: '1m', target: 500, endpointIndices: [] },
			{ duration: '30s', target: 0, endpointIndices: [] },
		],
	},
	{
		label: 'Stress',
		value: 'stress',
		tooltip:
			'Encontrar el límite del sistema. Incrementa usuarios progresivamente hasta que el sistema falle o degrade.',
		icon: 'pi pi-exclamation-triangle',
		defaultVus: 500,
		defaultDuration: '5m',
		defaultStages: [
			{ duration: '30s', target: 100, endpointIndices: [] },
			{ duration: '1m', target: 300, endpointIndices: [] },
			{ duration: '1m', target: 500, endpointIndices: [] },
			{ duration: '1m', target: 500, endpointIndices: [] },
			{ duration: '30s', target: 0, endpointIndices: [] },
		],
	},
	{
		label: 'Spike',
		value: 'spike',
		tooltip:
			'Simular pico repentino. Ej: 500 alumnos consultando notas al mismo tiempo al publicar resultados.',
		icon: 'pi pi-bolt',
		defaultVus: 500,
		defaultDuration: '3m',
		defaultStages: [
			{ duration: '10s', target: 500, endpointIndices: [] },
			{ duration: '1m', target: 500, endpointIndices: [] },
			{ duration: '10s', target: 0, endpointIndices: [] },
		],
	},
	{
		label: 'Soak',
		value: 'soak',
		tooltip:
			'Test de resistencia prolongado. Busca memory leaks y degradación con carga sostenida durante largo tiempo.',
		icon: 'pi pi-clock',
		defaultVus: 100,
		defaultDuration: '30m',
		defaultStages: [
			{ duration: '1m', target: 100, endpointIndices: [] },
			{ duration: '28m', target: 100, endpointIndices: [] },
			{ duration: '1m', target: 0, endpointIndices: [] },
		],
	},
];
// #endregion

// #region Login Role Options
export const LOGIN_ROLE_OPTIONS = [
	{ label: 'Estudiante', value: 'Estudiante' },
	{ label: 'Profesor', value: 'Profesor' },
	{ label: 'Director', value: 'Director' },
	{ label: 'Asistente Administrativo', value: 'Asistente Administrativo' },
	{ label: 'Apoderado', value: 'Apoderado' },
];
// #endregion

// #region Role Distribution Presets
export const EDUCA_REAL_DISTRIBUTION: K6RoleDistribution[] = [
	{ rol: 'Estudiante', vus: 500 },
	{ rol: 'Profesor', vus: 30 },
	{ rol: 'Asistente Administrativo', vus: 10 },
	{ rol: 'Director', vus: 2 },
];
// #endregion

// #region HTTP Method Options
export const HTTP_METHOD_OPTIONS = [
	{ label: 'GET', value: 'GET' as const },
	{ label: 'POST', value: 'POST' as const },
	{ label: 'PUT', value: 'PUT' as const },
	{ label: 'DELETE', value: 'DELETE' as const },
];
// #endregion

// #region Preset Endpoints
export const PRESET_ENDPOINTS: PresetEndpoint[] = [
	{
		category: 'General (todos los roles)',
		endpoints: [
			{
				enabled: true,
				method: 'GET',
				path: '/api/sistema/permisos/mis-permisos',
				body: '',
				name: 'mis-permisos',
			},
			{
				enabled: true,
				method: 'GET',
				path: '/api/horario/mi-horario-hoy',
				body: '',
				name: 'mi-horario-hoy',
			},
			{
				enabled: true,
				method: 'GET',
				path: '/api/ServerTime',
				body: '',
				name: 'server-time',
			},
		],
	},
	{
		category: 'Estudiante — sin parámetros',
		endpoints: [
			{
				enabled: true,
				method: 'GET',
				path: '/api/EstudianteCurso/mis-horarios',
				body: '',
				name: 'estudiante-mis-horarios',
			},
			{
				enabled: true,
				method: 'GET',
				path: '/api/EstudianteCurso/mis-notas',
				body: '',
				name: 'estudiante-mis-notas',
			},
			{
				enabled: true,
				method: 'GET',
				path: '/api/consultaasistencia/estudiante/mis-asistencias?mes=3&anio=2026',
				body: '',
				name: 'estudiante-mis-asistencias',
			},
		],
	},
	{
		category: 'Estudiante — con ID (cambiar IDs según BD)',
		endpoints: [
			{
				enabled: false,
				method: 'GET',
				path: '/api/EstudianteCurso/horario/6/contenido',
				body: '',
				name: 'estudiante-contenido-horario',
			},
			{
				enabled: false,
				method: 'GET',
				path: '/api/EstudianteCurso/semana/17/mis-archivos',
				body: '',
				name: 'estudiante-mis-archivos-semana',
			},
			{
				enabled: false,
				method: 'GET',
				path: '/api/EstudianteCurso/tarea/3/mis-archivos',
				body: '',
				name: 'estudiante-mis-tarea-archivos',
			},
			{
				enabled: false,
				method: 'GET',
				path: '/api/EstudianteCurso/horario/6/mi-asistencia',
				body: '',
				name: 'estudiante-mi-asistencia-curso',
			},
			{
				enabled: false,
				method: 'GET',
				path: '/api/EstudianteCurso/horario/6/grupos',
				body: '',
				name: 'estudiante-grupos-horario',
			},
		],
	},
	{
		category: 'Profesor — sin parámetros',
		endpoints: [
			{
				enabled: true,
				method: 'GET',
				path: '/api/Profesor/mis-estudiantes',
				body: '',
				name: 'profesor-mis-estudiantes',
			},
			{
				enabled: true,
				method: 'GET',
				path: '/api/consultaasistencia/profesor/salones',
				body: '',
				name: 'profesor-salones',
			},
			{
				enabled: true,
				method: 'GET',
				path: '/api/consultaasistencia/profesor/salones-horario',
				body: '',
				name: 'profesor-salones-horario',
			},
		],
	},
	{
		category: 'Profesor — con ID (cambiar IDs según BD)',
		endpoints: [
			{
				enabled: false,
				method: 'GET',
				path: '/api/Horario/profesor/13',
				body: '',
				name: 'profesor-horarios',
			},
			{
				enabled: false,
				method: 'GET',
				path: '/api/ProfesorSalon/profesor/13',
				body: '',
				name: 'profesor-salon-tutoria',
			},
			{
				enabled: false,
				method: 'GET',
				path: '/api/Profesor/estudiantes-salon/12',
				body: '',
				name: 'profesor-estudiantes-salon',
			},
			{
				enabled: false,
				method: 'GET',
				path: '/api/CursoContenido/horario/5',
				body: '',
				name: 'profesor-contenido-horario',
			},
			{
				enabled: false,
				method: 'GET',
				path: '/api/CursoContenido/2/archivos-estudiantes',
				body: '',
				name: 'profesor-archivos-estudiantes',
			},
			{
				enabled: false,
				method: 'GET',
				path: '/api/CursoContenido/tarea/3/archivos-estudiantes',
				body: '',
				name: 'profesor-archivos-tarea-estudiantes',
			},
			{
				enabled: false,
				method: 'GET',
				path: '/api/Calificacion/contenido/2',
				body: '',
				name: 'profesor-calificaciones',
			},
			{
				enabled: false,
				method: 'GET',
				path: '/api/Calificacion/periodos/2',
				body: '',
				name: 'profesor-periodos',
			},
			{
				enabled: false,
				method: 'GET',
				path: '/api/Calificacion/salon/12/curso/10',
				body: '',
				name: 'profesor-notas-salon',
			},
			{
				enabled: false,
				method: 'GET',
				path: '/api/GrupoContenido/contenido/3',
				body: '',
				name: 'profesor-grupos-contenido',
			},
			{
				enabled: false,
				method: 'GET',
				path: '/api/AsistenciaCurso/horario/5/fecha?fecha=2026-03-07',
				body: '',
				name: 'profesor-asistencia-curso-fecha',
			},
			{
				enabled: false,
				method: 'GET',
				path: '/api/AsistenciaCurso/horario/5/resumen?fechaInicio=2026-03-01&fechaFin=2026-03-07',
				body: '',
				name: 'profesor-asistencia-curso-resumen',
			},
		],
	},
	{
		category: 'Profesor — Mensajería (cambiar IDs según BD)',
		endpoints: [
			{
				enabled: false,
				method: 'GET',
				path: '/api/conversaciones/listar?horarioId=5',
				body: '',
				name: 'profesor-conversaciones',
			},
			{
				enabled: false,
				method: 'GET',
				path: '/api/conversaciones/6',
				body: '',
				name: 'profesor-conversacion-detalle',
			},
			{
				enabled: false,
				method: 'GET',
				path: '/api/conversaciones/destinatarios',
				body: '',
				name: 'profesor-destinatarios',
			},
		],
	},
	{
		category: 'Admin (Director)',
		endpoints: [
			{
				enabled: false,
				method: 'GET',
				path: '/api/sistema/usuarios/listar',
				body: '',
				name: 'listar-usuarios',
			},
			{
				enabled: false,
				method: 'GET',
				path: '/api/sistema/salones/listar',
				body: '',
				name: 'listar-salones',
			},
			{
				enabled: false,
				method: 'GET',
				path: '/api/sistema/cursos/listar',
				body: '',
				name: 'listar-cursos',
			},
			{
				enabled: false,
				method: 'GET',
				path: '/api/consultaasistencia/director/estadisticas?fecha=2026-03-07',
				body: '',
				name: 'director-estadisticas-asistencia',
			},
		],
	},
];
// #endregion

// #region Default Config
export const DEFAULT_CONFIG: K6TestConfig = {
	testName: 'test-concurrencia',
	baseUrl: environment.production
		? 'https://educacom.azurewebsites.net'
		: 'https://localhost:7102',
	testType: 'load',
	vus: 100,
	duration: '3m',
	stages: [
		{ duration: '30s', target: 50, endpointIndices: [] },
		{ duration: '1m', target: 100, endpointIndices: [] },
		{ duration: '1m', target: 100, endpointIndices: [] },
		{ duration: '30s', target: 0, endpointIndices: [] },
	],
	useStages: true,
	thresholds: {
		p95Latency: 2000,
		errorRate: 1,
	},
};
// #endregion
