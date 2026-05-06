// F6a Escenario 6 — Resilience HTTP externo (Polly).
// Simular Blob Storage caído (mock 503).
// ESPERADO:
//   - Polly retries 3x con jitter (visible en logs del BE como "Retry attempt N")
//   - Tras `MinimumThroughput=10` fallos, breaker abre
//   - Requests subsiguientes responden 503 *inmediato* (sin reintentar) con `Retry-After`
//
// === SETUP REQUERIDO (no auto-ejecutable hoy sin este paso) ===
//
// El BE actual apunta `BlobStorageService` al endpoint real configurado en
// `appsettings.Development.json` → `AzureBlobStorage:Endpoint`.
//
// Para simular un Blob caído sin tocar el código, hay 3 opciones:
//
//   A. Wiremock local en :9090 retornando 503 a `*` — apuntar BE a `http://localhost:9090`:
//      ```pwsh
//      docker run --rm -p 9090:8080 -e WIREMOCK_OPTIONS="--global-response-templating" wiremock/wiremock:latest
//      # luego en otra ventana
//      curl -X POST http://localhost:9090/__admin/mappings -d '{
//        "request":{"method":"ANY","urlPattern":".*"},
//        "response":{"status":503,"body":"Mock down","headers":{"Retry-After":"10"}}
//      }'
//      ```
//      Y en `appsettings.Development.json`:
//      ```
//      "AzureBlobStorage": { "Endpoint": "http://localhost:9090/blob-mock" }
//      ```
//
//   B. Httpbin proxy: `https://httpbin.org/status/503` (requiere internet, no recomendado para CI).
//
//   C. Hook de diagnóstico: agregar config flag `Diagnostics:ForceBlobFailure=true` que hace que
//      `BlobStorageService` retorne 503 sin tocar la red. Requiere PR a `Educa.API`.
//
// Si no se setea el mock, este escenario NO valida nada útil — diferir a F6b o agregar el flag de diagnóstico.

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Trend } from 'k6/metrics';

import { login, authHeaders } from './_lib/auth.js';

const BASE_URL = __ENV.BASE_URL || 'https://localhost:7102';

// Endpoint que toca BlobStorage. Ajustar si cambia el path real.
// Subida de archivo a curso/tarea es el caso típico (multipart/form-data hacia Blob).
// Como no tenemos un payload binario simple desde k6, usamos un endpoint de descarga
// que también va al Blob (lectura de archivo).
const BLOB_ENDPOINT = '/api/BlobStorage/download/test.pdf';

const responseTimes = new Trend('response_time_ms', true);
const breakerOpenResponses = new Counter('breaker_open_503');
const polly5xx = new Counter('polly_5xx_after_retries');

export const options = {
	scenarios: {
		// Fase 1 (0-30s): 12 requests secuenciales — esperamos ver retries de Polly.
		// Cada request inicial debería tomar ~1-3s (3 retries × jitter).
		warmup_retries: {
			executor: 'shared-iterations',
			vus: 1,
			iterations: 12,
			maxDuration: '60s',
			exec: 'callBlob',
			startTime: '0s',
		},
		// Fase 2 (30-50s): rafagas paralelas — esperamos breaker OPEN.
		// Cada request debería responder *inmediato* con 503 (sin retries).
		breaker_open_check: {
			executor: 'constant-arrival-rate',
			rate: 10,
			timeUnit: '5s',
			duration: '20s',
			preAllocatedVUs: 5,
			maxVUs: 10,
			exec: 'callBlob',
			startTime: '35s',
		},
	},
	thresholds: {
		// Tras breaker abierto, las requests deben ser MUY rápidas (<200ms = no hubo retries)
		'response_time_ms{phase:breaker_open}': ['p(95)<300'],
	},
};

export function setup() {
	const token = login(__ENV.DIRECTOR_DNI, __ENV.DIRECTOR_PWD, 'Director');
	if (!token) throw new Error('Setup login falló');
	return { token };
}

export function callBlob(data) {
	const start = Date.now();
	const res = http.get(`${BASE_URL}${BLOB_ENDPOINT}`, {
		headers: authHeaders(data.token),
		tags: { endpoint: 'blob-mock' },
	});
	const elapsed = Date.now() - start;

	responseTimes.add(elapsed);

	if (res.status >= 500) {
		// Si elapsed < 200ms, asumimos breaker OPEN (no hubo retries)
		// Si elapsed > 1500ms, asumimos retries de Polly ocurrieron
		if (elapsed < 200) breakerOpenResponses.add(1);
		else polly5xx.add(1);
	}

	check(res, {
		'response 5xx esperado por mock': (r) => r.status >= 500,
	});

	console.log(`callBlob status=${res.status} elapsed=${elapsed}ms breaker=${elapsed < 200 ? 'OPEN-likely' : 'CLOSED-with-retries'}`);
}
