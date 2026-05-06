// F6a Escenario 5 — Cancelación efectiva.
// Query pesada (`CommandTimeout=60s`) cancelada por el cliente a 2s.
// ESPERADO: el server libera el slot de SQL pool inmediatamente al detectar
// la cancelación del cliente — NO espera los 60s del CommandTimeout.
//
// Cómo medir:
//   1. Lanzar 8 reportes en paralelo (cap reports N=8).
//   2. Cancelar TODAS las requests a los 2s vía k6 timeout corto.
//   3. Inmediatamente lanzar 1 request más al mismo bulkhead — debería entrar (no 503).
//      Si el server no liberó los slots, esta novena request recibirá 503.
//
// La señal positiva es: novena request 2xx/4xx negocio (entró al bulkhead),
// no 503 (slot tomado por la query "fantasma" que sigue corriendo).

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter } from 'k6/metrics';

import { login, authHeaders } from './_lib/auth.js';

const BASE_URL = __ENV.BASE_URL || 'https://localhost:7102';

const cancelledRequests = new Counter('cancelled_requests');
const followupOk = new Counter('followup_2xx_or_4xx');
const followupBlocked = new Counter('followup_503'); // si > 0 = liberación NO efectiva

export const options = {
	scenarios: {
		// 8 requests pesadas con timeout 2s (todas serán canceladas)
		cancel_heavy: {
			executor: 'shared-iterations',
			vus: 8,
			iterations: 8,
			maxDuration: '10s',
			exec: 'heavyCancelled',
			startTime: '0s',
		},
		// Una request "follow-up" al mismo bulkhead 3s después de cancelar
		// Si el server no liberó, recibirá 503
		followup_check: {
			executor: 'shared-iterations',
			vus: 1,
			iterations: 1,
			maxDuration: '15s',
			exec: 'followupRequest',
			startTime: '4s', // 2s espera cancel + 2s margen liberación
		},
	},
	thresholds: {
		followup_503: ['count===0'], // STRICT — debe haber liberado
	},
};

export function setup() {
	const token = login(__ENV.DIRECTOR_DNI, __ENV.DIRECTOR_PWD, 'Director');
	if (!token) throw new Error('Setup login falló');
	return { token };
}

export function heavyCancelled(data) {
	// Reporte que típicamente toma > 2s (boleta consolidada de salón con muchos estudiantes).
	// k6 timeout=2s cancela la conexión antes de que el server termine.
	const res = http.get(`${BASE_URL}/api/BoletaNotas/salon/1`, {
		headers: authHeaders(data.token),
		timeout: '2s',
		tags: { endpoint: 'heavy-cancelled' },
	});
	// Si k6 cancela por timeout, res.error suele estar lleno; res.status puede ser 0
	if (res.status === 0 || res.error) {
		cancelledRequests.add(1);
	}
}

export function followupRequest(data) {
	const res = http.get(`${BASE_URL}/api/BoletaNotas/estudiante/1`, {
		headers: authHeaders(data.token),
		tags: { endpoint: 'followup' },
	});

	if (res.status >= 200 && res.status < 500 && res.status !== 429) {
		followupOk.add(1);
	} else if (res.status === 503) {
		followupBlocked.add(1);
		console.error(`Liberación NO efectiva: follow-up recibió 503 = slots no liberados tras cancelación. body=${res.body}`);
	}

	check(res, {
		'follow-up entró al bulkhead (no 503)': (r) => r.status !== 503,
	});
}
