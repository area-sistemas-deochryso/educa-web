// Fixtures para escenarios F6a — payloads de webhook CrossChex y otros.

// Genera payload de webhook CrossChex con N records. dnis es un array de DNIs (8 dígitos).
// El BE espera ISO 8601 UTC en check_time y lo convierte a UTC-5 (hora Perú).
export function buildCrossChexPayload(dnis, checkType = 0) {
	const now = new Date().toISOString();
	return {
		Records: dnis.map((dni, i) => ({
			uuid: `f6a-${Date.now()}-${i}`,
			dst_check_time: now,
			check_time: now,
			check_type: checkType, // 0=entrada, 1=salida (depende de mapeo CrossChex)
			employee: {
				workno: dni,
				first_name: 'F6A',
				last_name: `Test-${i}`,
				job_title: '',
				department: '',
			},
			device: {
				serial_number: 'F6A-DEVICE-001',
				name: 'F6A-Mock-Device',
			},
		})),
	};
}

// Genera DNI de 8 dígitos pseudo-aleatorio (no real, sólo para load testing del path).
// El BE rechaza con error de negocio si el DNI no existe — pero el rate limiter ya
// contó el slot, que es lo que F6a quiere medir.
export function fakeDni(seed) {
	const s = String(seed).padStart(8, '0');
	return s.slice(-8);
}

// Genera array de DNIs falsos para batch.
export function fakeDnis(count, seedStart = 10000000) {
	return Array.from({ length: count }, (_, i) => fakeDni(seedStart + i));
}
