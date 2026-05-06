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
	// Chat 111 — stub cancellable (Diagnostics:EnableF6aStubs=true).
	// Task.Delay(60_000, ct) → con k6 timeout=2s, CT propaga, server libera slot inmediato.
	// Endpoint anterior (BoletaNotas/salon/1) descartado: BD vacía no genera latencia >2s.
	const res = http.get(`${BASE_URL}/api/diagnostics/f6a/cancellable-stub`, {
		headers: authHeaders(data.token),
		timeout: '2s',
		tags: { endpoint: 'heavy-cancelled' },
	});
	if (res.status === 0 || res.error) {
		cancelledRequests.add(1);
	}
}

export function followupRequest(data) {
	// Chat 111 — follow-up al mismo bulkhead :reports vía heavy-stub (delay 2s, completa OK).
	// Si los slots no se liberaron tras los cancelados, recibirá 503.
	const res = http.get(`${BASE_URL}/api/diagnostics/f6a/heavy-stub`, {
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
