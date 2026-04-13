import { environment } from '@config';

import { K6RoleDistribution, K6TestConfig, TestTypeOption } from './ctest-k6.models';
export { PRESET_ENDPOINTS } from './ctest-k6.preset-endpoints';

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
