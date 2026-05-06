// F6a Escenario 1 — Pico matutino simulado.
// 80 logins concurrentes + 100 webhooks bio dentro de 60s.
// Total ~180 requests concurrentes contra cap global 140 + cap bio 20.
// ESPERADO: 0× 503 (capa 2 cubre con holgura), 0× 429 en logins (rate "login"=10/min/IP
// pero el partition es por IP — un k6 desde una sola IP saturará el rate del login!
// Para evitar falso positivo, este escenario usa un único set de credenciales y reusa token
// pre-cacheado, simulando 80 sesiones ya autenticadas haciendo home requests).

import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Counter, Trend } from 'k6/metrics';

import { login, authHeaders } from './_lib/auth.js';
import { buildCrossChexPayload, fakeDnis } from './_lib/payloads.js';

const BASE_URL = __ENV.BASE_URL || 'https://localhost:7102';
const WEBHOOK_SECRET = __ENV.CROSSCHEX_WEBHOOK_SECRET || '';

// Métricas custom
const errors429 = new Counter('errors_429');
const errors503 = new Counter('errors_503');
const retryAfter = new Trend('retry_after_seconds', true);

export const options = {
	scenarios: {
		// 80 estudiantes/profesores haciendo requests "tipo home" en 60s
		home_requests: {
			executor: 'ramping-vus',
			startVUs: 0,
			stages: [
				{ duration: '10s', target: 80 },
				{ duration: '40s', target: 80 },
				{ duration: '10s', target: 0 },
			],
			exec: 'homeRequests',
		},
		// 100 webhooks CrossChex en 60s = ~1.67/s
		crosschex_webhooks: {
			executor: 'constant-arrival-rate',
			rate: 100,
			timeUnit: '60s',
			duration: '60s',
			preAllocatedVUs: 20,
			maxVUs: 30,
			exec: 'crosschexWebhook',
		},
	},
	thresholds: {
		// errors_429 NO es la métrica clave de este escenario. Con 80 VUs golpeando
		// `mis-permisos` (rate limit `global` reads ≈ 3.3 r/s), el rate limit absorbe
		// lo esperable y eso es comportamiento correcto de la capa 1, no fallo.
		// Ajustado en chat 108 tras la corrida 2026-05-06 que dio 5833× 429 con 0× 503.
		// Lo único que importa es que el cap global (capa 2 / N=140) NO sature.
		errors_503: ['count===0'], // STRICT — capa 2 NO debe saturar
	},
};

// Setup — un único token reusado por todos los VUs (evita rate de login)
export function setup() {
	const dni = __ENV.PROFESOR_DNI;
	const pwd = __ENV.PROFESOR_PWD;
	if (!dni || !pwd) {
		throw new Error('Falta PROFESOR_DNI / PROFESOR_PWD en env. Ver .env-f6a.example');
	}
	const token = login(dni, pwd, 'Profesor');
	if (!token) throw new Error('Setup login falló — abortando');
	return { token };
}

export function homeRequests(data) {
	const headers = authHeaders(data.token);
	const res = http.get(`${BASE_URL}/api/sistema/permisos/mis-permisos`, {
		headers,
		tags: { endpoint: 'mis-permisos' },
	});

	track429or503(res);
	check(res, { 'home 2xx o limit-rejection esperado': (r) => r.status === 200 || r.status === 429 || r.status === 503 });
	sleep(0.5);
}

export function crosschexWebhook() {
	const payload = buildCrossChexPayload(fakeDnis(1, 99000000));
	const res = http.post(`${BASE_URL}/api/Asistencia/webhook`, JSON.stringify(payload), {
		headers: {
			'Content-Type': 'application/json',
			'authorize-sign': WEBHOOK_SECRET,
		},
		tags: { endpoint: 'crosschex-webhook' },
	});

	track429or503(res);
	check(res, { 'webhook 200 o 4xx negocio o rate-rejection': (r) => r.status === 200 || (r.status >= 400 && r.status < 500) || r.status === 503 });
}

function track429or503(res) {
	if (res.status === 429) {
		errors429.add(1);
		const ra = parseInt(res.headers['Retry-After'] || '0', 10);
		if (ra > 0) retryAfter.add(ra);
	}
	if (res.status === 503) {
		errors503.add(1);
		const ra = parseInt(res.headers['Retry-After'] || '0', 10);
		if (ra > 0) retryAfter.add(ra);
	}
}
