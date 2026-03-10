export type TestType = 'smoke' | 'load' | 'stress' | 'spike' | 'soak';
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

export interface K6Stage {
	duration: string;
	target: number;
	endpointIndices: number[]; // índices de endpoints asignados; vacío = todos
}

export interface K6Endpoint {
	enabled: boolean;
	method: HttpMethod;
	path: string;
	body: string;
	name: string;
}

export interface K6Credential {
	usuario: string;
	password: string;
	token: string;
	rol: string;
	nombre: string;
}

export interface K6RoleDistribution {
	rol: string;
	vus: number;
}

export interface K6Thresholds {
	p95Latency: number;
	errorRate: number;
}

export interface K6TestConfig {
	testName: string;
	baseUrl: string;
	testType: TestType;
	vus: number;
	duration: string;
	stages: K6Stage[];
	useStages: boolean;
	thresholds: K6Thresholds;
}

export interface TestTypeOption {
	label: string;
	value: TestType;
	tooltip: string;
	icon: string;
	defaultVus: number;
	defaultDuration: string;
	defaultStages: K6Stage[];
}

export interface PresetEndpoint {
	category: string;
	endpoints: K6Endpoint[];
}
