// F6a Escenario 3 — Aislamiento entre bulkheads.
// 30 requests a endpoints de `concurrency:reports` (cap N=8) +
// 10 requests a `concurrency:pagos` (cap N=15) simultáneos.
// ESPERADO:
//   - reports: 8 OK + 22 saturados (503).
//   - pagos: 10/10 OK (NO afectado por la saturación de reports).
// Si pagos sufre 503 = bug crítico de F2 (los bulkheads no aíslan).

import http from 'k6/http';
import { check } from 'k6';
import { Counter, Trend } from 'k6/metrics';

import { login, authHeaders } from './_lib/auth.js';

const BASE_URL = __ENV.BASE_URL || 'https://localhost:7102';
const SALON_ID = parseInt(__ENV.SALON_ID_CIERRE || '1', 10);
const ANIO = parseInt(__ENV.ANIO_CIERRE || '2026', 10);
const MES = parseInt(__ENV.MES_CIERRE || '5', 10); // mes distinto al esc 2 para evitar 409 acumulado

const reportsOk = new Counter('reports_2xx');
const reportsBlocked = new Counter('reports_503');
const pagosOk = new Counter('pagos_2xx');
const pagosBlocked = new Counter('pagos_503'); // CRÍTICO si > 0
const reportsLatencyP95 = new Trend('reports_latency_ms');
const pagosLatencyP95 = new Trend('pagos_latency_ms', true);

export const options = {
	scenarios: {
		// 30 reportes pesados — saturan `concurrency:reports` (N=8)
		saturate_reports: {
			executor: 'shared-iterations',
			vus: 30,
			iterations: 30,
			maxDuration: '30s',
			exec: 'callReport',
			startTime: '0s',
		},
		// 10 cierres concurrentes — bulkhead pagos (N=15) NO debería saturar
		// startTime 5s para asegurar que reports ya está saturado cuando pagos arranca
		test_pagos_isolation: {
			executor: 'shared-iterations',
			vus: 10,
			iterations: 10,
			maxDuration: '30s',
			exec: 'callPagos',
			startTime: '5s',
		},
	},
	thresholds: {
		reports_503: ['count>=15', 'count<=25'], // ~22 esperados
		pagos_503: ['count===0'], // STRICT — aislamiento debe ser perfecto
	},
};

export function setup() {
	const token = login(__ENV.DIRECTOR_DNI, __ENV.DIRECTOR_PWD, 'Director');
	if (!token) throw new Error('Setup login falló');
	return { token };
}

export function callReport(data) {
	// Reporte pesado clasificado en concurrency:reports — usar boleta-pdf como muestra.
	// Nota: 1 puede no ser un estudianteId real; el endpoint validará y posiblemente devolverá 4xx,
	// pero el bulkhead ya contó el slot, que es lo que medimos.
	const res = http.get(`${BASE_URL}/api/BoletaNotas/estudiante/1`, {
		headers: authHeaders(data.token),
		tags: { endpoint: 'boleta-pdf', bulkhead: 'reports' },
	});

	reportsLatencyP95.add(res.timings.duration);
	if (res.status >= 200 && res.status < 500) reportsOk.add(1);
	else if (res.status === 503) reportsBlocked.add(1);
}

export function callPagos(data) {
	const payload = {
		SalonId: SALON_ID,
		Anio: ANIO,
		Mes: MES,
		Observacion: `F6a-isolation-${__VU}-${Date.now()}`,
	};

	const res = http.post(`${BASE_URL}/api/cierre-asistencia`, JSON.stringify(payload), {
		headers: authHeaders(data.token),
		tags: { endpoint: 'cierre-asistencia', bulkhead: 'pagos' },
	});

	pagosLatencyP95.add(res.timings.duration);
	if (res.status >= 200 && res.status < 500) pagosOk.add(1);
	else if (res.status === 503) {
		pagosBlocked.add(1);
		console.error(`AISLAMIENTO ROTO: pagos recibió 503 — probable bug en F2. status=${res.status} body=${res.body}`);
	}
}
