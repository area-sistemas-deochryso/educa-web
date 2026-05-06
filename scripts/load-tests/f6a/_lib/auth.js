// Helper de login compartido para los escenarios F6a.
// Hace POST /api/Auth/login y devuelve token JWT para usar en Authorization header.

import http from 'k6/http';
import { check } from 'k6';

const BASE_URL = __ENV.BASE_URL || 'https://localhost:7102';

export function login(dni, password, rol) {
	const res = http.post(
		`${BASE_URL}/api/Auth/login`,
		JSON.stringify({ DNI: dni, Contraseña: password, Rol: rol, RememberMe: false }),
		{
			headers: { 'Content-Type': 'application/json' },
			tags: { endpoint: 'auth-login' },
		},
	);

	const ok = check(res, {
		'login 200': (r) => r.status === 200,
		'has token': (r) => {
			try {
				const body = r.json();
				return body && body.data && body.data.token;
			} catch {
				return false;
			}
		},
	});

	if (!ok) {
		console.error(`Login falló para DNI=${dni} rol=${rol}: ${res.status} ${res.body}`);
		return null;
	}

	return res.json().data.token;
}

export function authHeaders(token) {
	return {
		Authorization: `Bearer ${token}`,
		'Content-Type': 'application/json',
	};
}
