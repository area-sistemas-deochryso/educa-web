import type { K6RoleDistribution } from '../models';

function roleToVarName(rol: string): string {
	const map: Record<string, string> = {
		Estudiante: 'ESTUDIANTES',
		Profesor: 'PROFESORES',
		Director: 'DIRECTORES',
		'Asistente Administrativo': 'ADMINS',
		Apoderado: 'APODERADOS',
	};
	return map[rol] ?? rol.toUpperCase().replace(/\s+/g, '_') + 'S';
}

export function pushSetupFunction(lines: string[]): void {
	lines.push('// setup() corre UNA vez antes de todos los VUs — login sin rate-limit');
	lines.push('export function setup() {');
	lines.push('  const cookies = {};');
	lines.push('  for (const user of USERS) {');
	lines.push('    for (let attempt = 1; attempt <= 3; attempt++) {');
	lines.push('      const loginRes = http.post(');
	lines.push('        `${BASE_URL}/api/Auth/login`,');
	lines.push("        JSON.stringify({ dni: user.dni, contraseña: user.password, rol: user.rol, rememberMe: false }),");
	lines.push("        { headers: { 'Content-Type': 'application/json' } },");
	lines.push('      );');
	lines.push('      if (loginRes.status === 200 && loginRes.cookies) {');
	lines.push('        cookies[user.dni] = Object.entries(loginRes.cookies)');
	lines.push("          .map(([name, vals]) => `${name}=${vals[0].value}`)");
	lines.push("          .join('; ');");
	lines.push("        check(loginRes, { [`login ${user.rol} (${user.dni}) OK`]: () => true });");
	lines.push('        break;');
	lines.push('      }');
	lines.push("      console.warn(`[setup] login ${user.dni} attempt ${attempt} → ${loginRes.status}`);");
	lines.push('      sleep(3 * attempt);');
	lines.push('    }');
	lines.push('    sleep(2);');
	lines.push('  }');
	lines.push('  const ok = Object.keys(cookies).length;');
	lines.push('  console.log(`[setup] ${ok}/${USERS.length} logins OK — cookies: ${JSON.stringify(Object.keys(cookies))}`);');
	lines.push('  if (ok === 0) { console.error("[setup] NINGÚN login exitoso — abortando"); }');
	lines.push('  return { cookies };');
	lines.push('}');
	lines.push('');
}

export function pushRoleArraysAndRanges(lines: string[], roleDistribution: K6RoleDistribution[]): void {
	lines.push('// Pool de credenciales por rol');
	for (const dist of roleDistribution) {
		const varName = roleToVarName(dist.rol);
		lines.push(`const ${varName} = USERS.filter(u => u.rol === '${dist.rol}');`);
	}
	lines.push('');
	lines.push('// Rangos de VU por rol (exec.vu.idInTest es 1-based en k6)');
	lines.push('const VU_RANGES = [');
	let cumulative = 0;
	for (const dist of roleDistribution) {
		cumulative += dist.vus;
		const varName = roleToVarName(dist.rol);
		lines.push(`  { maxVU: ${cumulative}, creds: ${varName}, rol: '${dist.rol}' },`);
	}
	lines.push('];');
	lines.push('');
	lines.push('function getUser(vuId) {');
	lines.push('  let prev = 0;');
	lines.push('  for (const range of VU_RANGES) {');
	lines.push('    if (vuId <= range.maxVU && range.creds.length > 0) {');
	lines.push('      const idx = (vuId - prev - 1) % range.creds.length;');
	lines.push('      return { ...range.creds[idx], rol: range.rol };');
	lines.push('    }');
	lines.push('    prev = range.maxVU;');
	lines.push('  }');
	lines.push('  return USERS[0]; // fallback');
	lines.push('}');
	lines.push('');
}
