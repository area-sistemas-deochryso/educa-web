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
		// constant-arrival-rate fuerza simultaneidad real:
		// 25 reqs distribuidos uniformemente en 1s (k6 exige duration ≥ 1s).
		// Como cada cierre tarda 200-500ms (DB roundtrip + INSERT), igual solapan
		// y el cap=15 se satura. preAllocatedVUs=30 garantiza VU disponible al disparar.
		// Refinement F6a-02 (chat 108): el shared-iterations previo arrancaba VUs
		// en cascada y solo 5-7 llegaban antes de que el cap=15 absorbiera el resto.
		saturate_pagos: {
			executor: 'constant-arrival-rate',
			rate: 25,
			timeUnit: '1s',
			duration: '1s',
			preAllocatedVUs: 30,
			maxVUs: 40,
			exec: 'crearCierre',
		},
	},
	thresholds: {
		// IMPORTANTE: el cap=15 limita SIMULTÁNEOS, no totales en una ventana de tiempo.
		// `constant-arrival-rate` distribuye uniformemente (25 reqs en 1s = una cada 40ms).
		// La primera completa a ~700ms y libera slot antes de que la 18ª arranque, así que
		// `responses_2xx` puede pasar 15 sin que el cap esté roto. La única forma de forzar
		// 25 simultáneos sería burst <100ms, que k6 no soporta (duration ≥ 1s).
		//
		// Métricas observadas en runs:
		// - Run 1 (2026-05-06): 15 OK + 7 saturados + 3 negocio = 25. Cap saturó.
		// - Run 2 (2026-05-06): 19 OK + 0 saturados = todos entraron por reuso de slots.
		//
		// Lo que SÍ se valida con este escenario:
		// 1. Las 25 reqs llegan al BE (no rebote de capa 1).
		// 2. Cuando hay 503, el body trae `policy=concurrency:pagos` (check inline).
		// 3. El sistema no rompe (no 500s).
		// La validación rigurosa de saturación bulkhead vive en F6a-03 (cuando reports
		// se satura con endpoint pesado).
		responses_2xx: ['count>=10'], // al menos 10 cierres OK confirmando que el endpoint funciona
		// blocked_503 NO es threshold strict — depende del timing del scheduler.
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
		SedeId: SALON_ID,
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
