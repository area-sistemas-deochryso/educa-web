import { describe, expect, it } from 'vitest';
import { mapProfesToOptions } from './horario-mapping.utils';
import type { ProfesorListDto } from '../models/profesor.interface';

const profesor = (id: number, habilitadoParaCurso?: boolean | null): ProfesorListDto => ({
	id,
	nombre: 'Ana',
	apellidos: 'Pérez',
	dni: `0000000${id}`,
	estado: true,
	habilitadoParaCurso,
});

describe('mapProfesToOptions — habilitación (INV-AS02, P117)', () => {
	it('marca como requiereHabilitacion solo a los explícitamente no habilitados', () => {
		const [habilitado, noHabilitado, noAplica] = mapProfesToOptions([profesor(1, true), profesor(2, false), profesor(3, null)]);

		expect(habilitado.requiereHabilitacion).toBeUndefined();
		expect(noHabilitado.requiereHabilitacion).toBe(true);
		expect(noHabilitado.label).toContain('(no habilitado)');
		expect(noAplica.requiereHabilitacion).toBeUndefined();
		expect(noAplica.label).not.toContain('(no habilitado)');
	});
});
