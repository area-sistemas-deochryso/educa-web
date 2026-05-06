// Smoke-test generado por la UI /intranet/ctest-k6 (2026-05-06).
// 100 VUs distribuidos: VU 1-33 Estudiante · 34-66 Profesor · 67-100 Director.
// 9 GETs presets, login en setup() con 3 credenciales (sin saturar rate per-IP).
// NO reproduce los 6 escenarios F6a (la UI actual no soporta POST + headers + body custom + multi-perfil).
// Ver .claude/diagnostic/load-control-f6a-report.md para gap detallado.

import http from 'k6/http';
import { check, sleep } from 'k6';
import exec from 'k6/execution';

export const options = {
	stages: [
		{ duration: '30s', target: 50 },
		{ duration: '1m', target: 100 },
		{ duration: '1m', target: 100 },
		{ duration: '30s', target: 0 },
	],
	insecureSkipTLSVerify: true,
	thresholds: {
		http_req_duration: ['p(95)<2000'],
		http_req_failed: ['rate<0.01'],
	},
};

const BASE_URL = 'https://localhost:7102';

// Credenciales para login (DNI + contraseña + rol)
const USERS = [
	{ dni: '71421914', password: 'AL1914', rol: 'Estudiante' },
	{ dni: '70525906', password: 'CA5906', rol: 'Profesor' },
	{ dni: '12345678', password: 'SA5678', rol: 'Director' },
];

// Pool de credenciales por rol
const ESTUDIANTES = USERS.filter(u => u.rol === 'Estudiante');
const PROFESORES = USERS.filter(u => u.rol === 'Profesor');
const DIRECTORES = USERS.filter(u => u.rol === 'Director');

// Rangos de VU por rol (exec.vu.idInTest es 1-based en k6)
const VU_RANGES = [
	{ maxVU: 33, creds: ESTUDIANTES, rol: 'Estudiante' },
	{ maxVU: 66, creds: PROFESORES, rol: 'Profesor' },
	{ maxVU: 100, creds: DIRECTORES, rol: 'Director' },
];

function getUser(vuId) {
	let prev = 0;
	for (const range of VU_RANGES) {
		if (vuId <= range.maxVU && range.creds.length > 0) {
			const idx = (vuId - prev - 1) % range.creds.length;
			return { ...range.creds[idx], rol: range.rol };
		}
		prev = range.maxVU;
	}
	return USERS[0]; // fallback
}

// setup() corre UNA vez antes de todos los VUs — login sin rate-limit
export function setup() {
	const cookies = {};
	for (const user of USERS) {
		for (let attempt = 1; attempt <= 3; attempt++) {
			const loginRes = http.post(
				`${BASE_URL}/api/Auth/login`,
				JSON.stringify({ dni: user.dni, contraseña: user.password, rol: user.rol, rememberMe: false }),
				{ headers: { 'Content-Type': 'application/json' } },
			);
			if (loginRes.status === 200 && loginRes.cookies) {
				cookies[user.dni] = Object.entries(loginRes.cookies)
					.map(([name, vals]) => `${name}=${vals[0].value}`)
					.join('; ');
				check(loginRes, { [`login ${user.rol} (${user.dni}) OK`]: () => true });
				break;
			}
			console.warn(`[setup] login ${user.dni} attempt ${attempt} → ${loginRes.status}`);
			sleep(3 * attempt);
		}
		sleep(2);
	}
	const ok = Object.keys(cookies).length;
	console.log(`[setup] ${ok}/${USERS.length} logins OK — cookies: ${JSON.stringify(Object.keys(cookies))}`);
	if (ok === 0) {
		console.error("[setup] NINGÚN login exitoso — abortando");
	}
	return { cookies };
}

export default function (data) {
	const user = getUser(exec.vu.idInTest);
	const cookieHeader = data.cookies[user.dni];
	if (!cookieHeader) { sleep(30); return; } // Login falló en setup, esperar para no spin-loop
	const params = {
		headers: {
			'Content-Type': 'application/json',
			'Cookie': cookieHeader,
		},
	};

	const res1 = http.get(`${BASE_URL}/api/horario/mi-horario-hoy`, params);
	if (res1.status !== 200) console.warn('[VU ' + exec.vu.idInTest + '] mi-horario-hoy → ' + res1.status + ' (' + res1.body.substring(0, 120) + ')');
	check(res1, {
		'mi-horario-hoy status 200': (r) => r.status === 200,
		'mi-horario-hoy < 2000ms': (r) => r.timings.duration < 2000,
	});

	const res2 = http.get(`${BASE_URL}/api/ServerTime`, params);
	if (res2.status !== 200) console.warn('[VU ' + exec.vu.idInTest + '] server-time → ' + res2.status + ' (' + res2.body.substring(0, 120) + ')');
	check(res2, {
		'server-time status 200': (r) => r.status === 200,
		'server-time < 2000ms': (r) => r.timings.duration < 2000,
	});

	if (user.rol === 'Director') {
		const res3 = http.get(`${BASE_URL}/api/sistema/permisos/mis-permisos`, params);
		if (res3.status !== 200) console.warn('[VU ' + exec.vu.idInTest + '] mis-permisos → ' + res3.status + ' (' + res3.body.substring(0, 120) + ')');
		check(res3, {
			'mis-permisos status 200': (r) => r.status === 200,
			'mis-permisos < 2000ms': (r) => r.timings.duration < 2000,
		});
	}

	if (user.rol === 'Estudiante') {
		const res4 = http.get(`${BASE_URL}/api/EstudianteCurso/mis-horarios`, params);
		if (res4.status !== 200) console.warn('[VU ' + exec.vu.idInTest + '] estudiante-mis-horarios → ' + res4.status + ' (' + res4.body.substring(0, 120) + ')');
		check(res4, {
			'estudiante-mis-horarios status 200': (r) => r.status === 200,
			'estudiante-mis-horarios < 2000ms': (r) => r.timings.duration < 2000,
		});

		const res5 = http.get(`${BASE_URL}/api/EstudianteCurso/mis-notas`, params);
		if (res5.status !== 200) console.warn('[VU ' + exec.vu.idInTest + '] estudiante-mis-notas → ' + res5.status + ' (' + res5.body.substring(0, 120) + ')');
		check(res5, {
			'estudiante-mis-notas status 200': (r) => r.status === 200,
			'estudiante-mis-notas < 2000ms': (r) => r.timings.duration < 2000,
		});

		const res6 = http.get(`${BASE_URL}/api/consultaasistencia/estudiante/mis-asistencias?mes=3&anio=2026`, params);
		if (res6.status !== 200) console.warn('[VU ' + exec.vu.idInTest + '] estudiante-mis-asistencias → ' + res6.status + ' (' + res6.body.substring(0, 120) + ')');
		check(res6, {
			'estudiante-mis-asistencias status 200': (r) => r.status === 200,
			'estudiante-mis-asistencias < 2000ms': (r) => r.timings.duration < 2000,
		});
	}

	if (user.rol === 'Profesor') {
		const res7 = http.get(`${BASE_URL}/api/Profesor/mis-estudiantes`, params);
		if (res7.status !== 200) console.warn('[VU ' + exec.vu.idInTest + '] profesor-mis-estudiantes → ' + res7.status + ' (' + res7.body.substring(0, 120) + ')');
		check(res7, {
			'profesor-mis-estudiantes status 200': (r) => r.status === 200,
			'profesor-mis-estudiantes < 2000ms': (r) => r.timings.duration < 2000,
		});

		const res8 = http.get(`${BASE_URL}/api/consultaasistencia/profesor/salones`, params);
		if (res8.status !== 200) console.warn('[VU ' + exec.vu.idInTest + '] profesor-salones → ' + res8.status + ' (' + res8.body.substring(0, 120) + ')');
		check(res8, {
			'profesor-salones status 200': (r) => r.status === 200,
			'profesor-salones < 2000ms': (r) => r.timings.duration < 2000,
		});

		const res9 = http.get(`${BASE_URL}/api/consultaasistencia/profesor/salones-horario`, params);
		if (res9.status !== 200) console.warn('[VU ' + exec.vu.idInTest + '] profesor-salones-horario → ' + res9.status + ' (' + res9.body.substring(0, 120) + ')');
		check(res9, {
			'profesor-salones-horario status 200': (r) => r.status === 200,
			'profesor-salones-horario < 2000ms': (r) => r.timings.duration < 2000,
		});
	}

	// Pausa entre iteraciones (simula tiempo de lectura del usuario)
	sleep(Math.random() * 2 + 1);
}
