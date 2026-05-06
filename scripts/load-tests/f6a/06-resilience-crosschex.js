// F6a Escenario 6 — Resilience HTTP externo (Polly sobre CrossChex).
//
// Verifica la pipeline `AddExternalResilience` configurada en
// `Educa.API/Educa.API/Extensions/ServiceExtensions.cs:210-228` para el HttpClient
// typed `CrossChexApiService`. Polly NO cubre BlobStorage (Azure SDK con retries propios),
// JaaS (firma JWT local) ni MailKit (SMTP no es HttpClient) — ver ADR-0002.
//
// ESPERADO con el flag `Diagnostics:ForceCrossChexFailure=true` activo:
//   - Polly retries 2x con jitter (visible en logs del BE como
//     `[HttpResilience.CrossChex] Retry attempt N/2 after Xms — outcome: HttpRequestException`).
//   - Tras `MinimumThroughput=10` fallos en `SamplingDuration` (≥30s), breaker abre:
//     `[HttpResilience.CrossChex] Circuit breaker OPENED — break duration: ..., trigger: HttpRequestException`.
//   - Requests subsiguientes responden 503 *inmediato* (sin reintentar).
//
// === SETUP REQUERIDO ===
//
// En `Educa.API/Educa.API/appsettings.Development.json`:
//   "Diagnostics": {
//     "EnableF6aStubs": true,
//     "ForceCrossChexFailure": true
//   }
//
// Y reiniciar el BE para que tome el flag (IConfiguration se lee al arrancar).
//
// El stub `/api/diagnostics/f6a/crosschex-trigger` redirige el HttpClient typed a
// `http://localhost:9999/` (puerto cerrado) → connection refused → triggerea Polly.

import http from 'k6/http';
import { check } from 'k6';
import { Counter, Trend } from 'k6/metrics';

import { login, authHeaders } from './_lib/auth.js';

const BASE_URL = __ENV.BASE_URL || 'https://localhost:7102';

const CROSSCHEX_ENDPOINT = '/api/diagnostics/f6a/crosschex-trigger';

const responseTimes = new Trend('response_time_ms', true);
const breakerOpenResponses = new Counter('breaker_open_503');
const polly5xx = new Counter('polly_5xx_after_retries');

export const options = {
	scenarios: {
		// Fase 1 (0-30s): 12 requests secuenciales — esperamos ver retries de Polly.
		// Cada request inicial debería tomar ~1-3s (2 retries × jitter + connection refused inmediato).
		// 12 fallos > MinimumThroughput=10 → breaker debería abrir antes de que termine la fase.
		warmup_retries: {
			executor: 'shared-iterations',
			vus: 1,
			iterations: 12,
			maxDuration: '60s',
			exec: 'callCrossChex',
			startTime: '0s',
		},
		// Fase 2 (35-55s): rafagas paralelas — esperamos breaker OPEN.
		// Cada request debería responder *inmediato* con 503 (sin retries).
		breaker_open_check: {
			executor: 'constant-arrival-rate',
			rate: 10,
			timeUnit: '5s',
			duration: '20s',
			preAllocatedVUs: 5,
			maxVUs: 10,
			exec: 'callCrossChex',
			startTime: '35s',
			tags: { phase: 'breaker_open' },
		},
	},
	thresholds: {
		// La mediana post-breaker debe ser fast — breaker abierto domina la fase 2.
		// p(95) NO se verifica: el breaker cicla OPEN → HALF-OPENED cada BreakDuration
		// (default 5s) y deja pasar probes que sí hacen retries (~6s). Es comportamiento
		// correcto de Polly. El check semántico es "la mayoría de requests son fast".
		'response_time_ms{phase:breaker_open}': ['p(50)<300'],
		// Al menos 20 requests deben caer en modo breaker-OPEN (de ~40 esperadas).
		// Si breaker_open_503 < 20 = el breaker no abrió o cicla demasiado rápido.
		breaker_open_503: ['count>=20'],
	},
};

export function setup() {
	const token = login(__ENV.DIRECTOR_DNI, __ENV.DIRECTOR_PWD, 'Director');
	if (!token) throw new Error('Setup login falló');
	return { token };
}

export function callCrossChex(data) {
	const start = Date.now();
	const res = http.get(`${BASE_URL}${CROSSCHEX_ENDPOINT}`, {
		headers: authHeaders(data.token),
		tags: { endpoint: 'crosschex-trigger' },
	});
	const elapsed = Date.now() - start;

	responseTimes.add(elapsed);

	if (res.status >= 500) {
		// Si elapsed < 300ms, asumimos breaker OPEN (sin retries).
		// Si elapsed > 1500ms, asumimos retries de Polly ocurrieron antes del fallo.
		if (elapsed < 300) breakerOpenResponses.add(1);
		else polly5xx.add(1);
	}

	check(res, {
		'response 5xx esperado por mock': (r) => r.status >= 500,
	});

	console.log(
		`callCrossChex status=${res.status} elapsed=${elapsed}ms breaker=${
			elapsed < 300 ? 'OPEN-likely' : 'CLOSED-with-retries'
		}`,
	);
}
