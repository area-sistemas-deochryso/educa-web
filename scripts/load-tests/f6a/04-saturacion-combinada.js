// F6a Escenario 4 — Saturación combinada.
// Pico matutino + reportes pesados + push notificaciones simultáneos.
// ESPERADO: bulkheads saturados independientemente, pero login y dashboard del director
// siguen respondiendo (capa 2 global tiene 72+ slots libres si suma de bulkheads = 68/140).
//
// Cargas simultáneas:
//   - 60 requests "home" (default bulkhead) — ramp 0→60 en 30s
//   - 20 reportes pesados — saturan `:reports` (N=8)
//   - 20 push notificaciones — saturan `:notif` (N=15)
//   - 10 webhook bio — dentro de `:bio` (N=20), no satura
// Total in-flight pico ~ 110, < 140 global, sin saturar capa 2.

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Rate } from 'k6/metrics';

import { login, authHeaders } from './_lib/auth.js';
import { buildCrossChexPayload, fakeDnis } from './_lib/payloads.js';

const BASE_URL = __ENV.BASE_URL || 'https://localhost:7102';
const WEBHOOK_SECRET = __ENV.CROSSCHEX_WEBHOOK_SECRET || '';

const homeFailRate = new Rate('home_failures');
const reportsBlocked = new Counter('reports_503');
const notifBlocked = new Counter('notif_503');
const dashboardOk = new Counter('dashboard_director_2xx');
const dashboard503 = new Counter('dashboard_director_503');

export const options = {
	scenarios: {
		home_traffic: {
			executor: 'ramping-vus',
			startVUs: 0,
			stages: [
				{ duration: '15s', target: 60 },
				{ duration: '30s', target: 60 },
				{ duration: '15s', target: 0 },
			],
			exec: 'homeRequest',
		},
		heavy_reports: {
			executor: 'constant-vus',
			vus: 20,
			duration: '60s',
			exec: 'heavyReport',
		},
		push_notif: {
			executor: 'constant-vus',
			vus: 20,
			duration: '60s',
			exec: 'pushNotif',
		},
		bio_webhooks: {
			executor: 'constant-arrival-rate',
			rate: 10,
			timeUnit: '60s',
			duration: '60s',
			preAllocatedVUs: 5,
			maxVUs: 10,
			exec: 'bioWebhook',
		},
		// Director "casual" intentando ver dashboard mientras todo arde
		// Default bulkhead — debería responder OK (capa 2 tiene slots libres)
		director_dashboard: {
			executor: 'constant-arrival-rate',
			rate: 6,
			timeUnit: '60s',
			duration: '60s',
			preAllocatedVUs: 3,
			maxVUs: 5,
			exec: 'directorDashboard',
			startTime: '5s',
		},
	},
	thresholds: {
		home_failures: ['rate<0.05'],
		// El dashboard del director DEBE seguir respondiendo
		dashboard_director_503: ['count===0'],
	},
};

export function setup() {
	const profToken = login(__ENV.PROFESOR_DNI, __ENV.PROFESOR_PWD, 'Profesor');
	const dirToken = login(__ENV.DIRECTOR_DNI, __ENV.DIRECTOR_PWD, 'Director');
	if (!profToken || !dirToken) throw new Error('Setup login falló');
	return { profToken, dirToken };
}

export function homeRequest(data) {
	const res = http.get(`${BASE_URL}/api/sistema/permisos/mis-permisos`, {
		headers: authHeaders(data.profToken),
		tags: { endpoint: 'home', bulkhead: 'default' },
	});
	homeFailRate.add(res.status >= 500);
	sleep(0.3);
}

export function heavyReport(data) {
	const res = http.get(`${BASE_URL}/api/BoletaNotas/estudiante/1`, {
		headers: authHeaders(data.dirToken),
		tags: { endpoint: 'reporte', bulkhead: 'reports' },
	});
	if (res.status === 503) reportsBlocked.add(1);
	sleep(1);
}

export function pushNotif(data) {
	// Endpoint que cae en concurrency:notif. Usar uno de envío masivo o creación de notificación.
	const res = http.post(`${BASE_URL}/api/Notificaciones`, JSON.stringify({
		Titulo: `F6a-test-${__VU}-${Date.now()}`,
		Mensaje: 'Saturación combinada',
		Tipo: 'evento',
		Prioridad: 'low',
		DniDestinatarios: [],
	}), {
		headers: authHeaders(data.dirToken),
		tags: { endpoint: 'notif-create', bulkhead: 'notif' },
	});
	if (res.status === 503) notifBlocked.add(1);
	sleep(1);
}

export function bioWebhook() {
	const payload = buildCrossChexPayload(fakeDnis(1, 88000000));
	http.post(`${BASE_URL}/api/Asistencia/webhook`, JSON.stringify(payload), {
		headers: { 'Content-Type': 'application/json', 'authorize-sign': WEBHOOK_SECRET },
		tags: { endpoint: 'bio', bulkhead: 'bio' },
	});
}

export function directorDashboard(data) {
	const res = http.get(`${BASE_URL}/api/sistema/permisos/mis-permisos`, {
		headers: authHeaders(data.dirToken),
		tags: { endpoint: 'dashboard-director', bulkhead: 'default' },
	});
	if (res.status >= 200 && res.status < 300) dashboardOk.add(1);
	else if (res.status === 503) {
		dashboard503.add(1);
		console.error(`Dashboard director recibió 503 — capa 2 saturó. body=${res.body}`);
	}
}
