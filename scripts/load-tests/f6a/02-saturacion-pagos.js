// F6a Escenario 2 — Saturación bulkhead Pagos.
// 25 requests concurrentes a `POST /api/cierre-asistencia` (clasificado en `concurrency:pagos` N=15).
// ESPERADO: 15 OK (o 4xx negocio si el cierre ya existe), 10× 503 con `Retry-After` calibrado.
// Si Retry-After siempre = 5 fallback, hay un bug en RateLimitTelemetryMiddleware.

import http from 'k6/http';
import { check } from 'k6';
import { Counter, Trend } from 'k6/metrics';

import { login, authHeaders } from './_lib/auth.js';

const BASE_URL = __ENV.BASE_URL || 'https://localhost:7102';
const SALON_ID = parseInt(__ENV.SALON_ID_CIERRE || '1', 10);
const ANIO = parseInt(__ENV.ANIO_CIERRE || '2026', 10);
const MES = parseInt(__ENV.MES_CIERRE || '4', 10);

const ok200 = new Counter('responses_2xx');
const business4xx = new Counter('business_4xx');
const blocked503 = new Counter('blocked_503');
const retryAfter = new Trend('retry_after_seconds', true);

export const options = {
	scenarios: {
		saturate_pagos: {
			executor: 'shared-iterations',
			vus: 25,
			iterations: 25,
			maxDuration: '30s',
			exec: 'crearCierre',
		},
	},
	thresholds: {
		// Esperamos exactamente 10 bloqueos por cap=15
		blocked_503: ['count>=8', 'count<=12'],
	},
};

export function setup() {
	const dni = __ENV.DIRECTOR_DNI;
	const pwd = __ENV.DIRECTOR_PWD;
	if (!dni || !pwd) throw new Error('Falta DIRECTOR_DNI / DIRECTOR_PWD');
	const token = login(dni, pwd, 'Director');
	if (!token) throw new Error('Setup login falló');
	return { token };
}

export function crearCierre(data) {
	const payload = {
		SalonId: SALON_ID,
		Anio: ANIO,
		Mes: MES,
		Observacion: `F6a-test-${__VU}-${Date.now()}`,
	};

	const res = http.post(`${BASE_URL}/api/cierre-asistencia`, JSON.stringify(payload), {
		headers: authHeaders(data.token),
		tags: { endpoint: 'cierre-asistencia-crear' },
	});

	if (res.status >= 200 && res.status < 300) ok200.add(1);
	else if (res.status >= 400 && res.status < 500 && res.status !== 429) business4xx.add(1);
	else if (res.status === 503) {
		blocked503.add(1);
		const ra = parseInt(res.headers['Retry-After'] || '0', 10);
		if (ra > 0) retryAfter.add(ra);
		// Validar que el body indica `policy=concurrency:pagos`
		try {
			const body = res.json();
			check(body, { 'body indica concurrency:pagos': (b) => b && (b.policy === 'concurrency:pagos' || b.mensaje?.includes('pagos')) });
		} catch { /* body no JSON */ }
	}

	check(res, {
		'response esperada (2xx o 4xx neg o 503)': (r) =>
			(r.status >= 200 && r.status < 300) ||
			(r.status >= 400 && r.status < 500) ||
			r.status === 503,
	});
}
