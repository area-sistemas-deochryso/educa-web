import { describe, expect, it } from 'vitest';
import { buildPeriodoCerradoMessage } from './periodo-cerrado-message';

describe('buildPeriodoCerradoMessage', () => {
	it('names the verb, the level and the year, and who to ask', () => {
		expect(buildPeriodoCerradoMessage('crear', { grado: '1ro Primaria', anio: 2026 })).toBe(
			'No se puede crear la evaluación: el periodo de Primaria 2026 está cerrado. Consulta con administración.',
		);
	});

	it('uses the modify verb when the action is a modification', () => {
		expect(buildPeriodoCerradoMessage('modificar', { grado: '3ro Secundaria', anio: 2026 })).toContain(
			'No se puede modificar la evaluación: el periodo de Secundaria 2026',
		);
	});

	it('falls back to a generic period when the salon is unknown', () => {
		expect(buildPeriodoCerradoMessage('crear', null)).toBe(
			'No se puede crear la evaluación: el periodo está cerrado. Consulta con administración.',
		);
	});

	it('falls back to a generic period when the level cannot be detected', () => {
		expect(buildPeriodoCerradoMessage('crear', { grado: 'Taller', anio: 2026 })).toBe(
			'No se puede crear la evaluación: el periodo está cerrado. Consulta con administración.',
		);
	});
});
