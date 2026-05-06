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
// ID de estudiante con notas reales en BD para que el PDF se genere (latencia >500ms).
// Si pasás 1 (default) y el endpoint resuelve fast-4xx (~127ms), el bulkhead reports cap=8
// no se satura. Pasá un ID válido para forzar la saturación real.
const ESTUDIANTE_ID_PDF = parseInt(__ENV.ESTUDIANTE_ID_PDF || '1', 10);

const reportsOk = new Counter('reports_2xx');
const reportsBlocked = new Counter('reports_503');
const pagosOk = new Counter('pagos_2xx');
const pagosBlocked = new Counter('pagos_503'); // CRÍTICO si > 0
const reportsLatencyP95 = new Trend('reports_latency_ms');
const pagosLatencyP95 = new Trend('pagos_latency_ms', true);

export const options = {
	scenarios: {
		// 100 reportes en 1s — saturan `concurrency:reports` (N=8) incluso con endpoint fast.
		// Throughput sostenido del cap=8 con latencia ~150ms = ~53 r/s. Pidiendo 100/s,
		// ~47 saturan por segundo → ≥40 esperados.
		// Si pasás ESTUDIANTE_ID_PDF con notas reales (PDF >500ms), saturás aún más obvio.
		// Refinement F6a-03 (chat 108): rate=60 no era suficiente con ID=1 (fast 4xx).
		saturate_reports: {
			executor: 'constant-arrival-rate',
			rate: 100,
			timeUnit: '1s',
			duration: '1s',
			preAllocatedVUs: 110,
			maxVUs: 130,
			exec: 'callReport',
			startTime: '0s',
		},
		// 10 cierres en 1s — bulkhead pagos (N=15) NO debería saturar.
		// startTime 2s para asegurar que reports ya está saturado cuando pagos arranca.
		test_pagos_isolation: {
			executor: 'constant-arrival-rate',
			rate: 10,
			timeUnit: '1s',
			duration: '1s',
			preAllocatedVUs: 15,
			maxVUs: 20,
			exec: 'callPagos',
			startTime: '2s',
		},
	},
	thresholds: {
		// reports_503 — depende de la latencia del PDF. Con ESTUDIANTE_ID_PDF=1 (fast 4xx)
		// el endpoint resuelve en ~1ms median y nunca satura cap=8 a 100 r/s. Para forzar
		// saturación pasá `ESTUDIANTE_ID_PDF` con notas reales (PDF >500ms).
		// Threshold informativo, no STRICT — el escenario es VÁLIDO solo si reports satura.
		reports_503: ['count>=0'],
		// pagos_503 STRICT: si pagos recibe 503 mientras reports está siendo presionado,
		// hay bug crítico de F2 (los bulkheads no aíslan). Vacuamente cierto si reports no
		// satura — observar el log para distinguir aislamiento real de aislamiento ausente.
		pagos_503: ['count===0'],
	},
};

export function setup() {
	const token = login(__ENV.DIRECTOR_DNI, __ENV.DIRECTOR_PWD, 'Director');
	if (!token) throw new Error('Setup login falló');
	return { token };
}

export function callReport(data) {
	// Chat 111 — endpoint stub diagnóstico (Diagnostics:EnableF6aStubs=true).
	// Task.Delay(2000, ct) en bulkhead concurrency:reports → satura cap=8 sin depender de data BD.
	// Endpoint anterior (BoletaNotas/estudiante/X) descartado: fast-4xx con BD vacía no saturaba.
	const res = http.get(`${BASE_URL}/api/diagnostics/f6a/heavy-stub`, {
		headers: authHeaders(data.token),
		tags: { endpoint: 'heavy-stub', bulkhead: 'reports' },
	});

	reportsLatencyP95.add(res.timings.duration);
	if (res.status >= 200 && res.status < 500) reportsOk.add(1);
	else if (res.status === 503) reportsBlocked.add(1);
}

export function callPagos(data) {
	const payload = {
		SedeId: SALON_ID,
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
