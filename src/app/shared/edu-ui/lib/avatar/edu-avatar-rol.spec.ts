import { describe, expect, it } from 'vitest';
import { getAvatarRolAccent } from './edu-avatar-rol';

describe('getAvatarRolAccent', () => {
	it.each([
		['Director', 'danger'],
		['Administrador', 'danger'],
		['Profesor', 'warn'],
		['Apoderado', 'info'],
		['Estudiante', 'success'],
		['Asistente Administrativo', 'contrast'],
		['Promotor', 'contrast'],
		['Coordinador Académico', 'contrast'],
	])('%s → %s con ícono', (rol, severity) => {
		const accent = getAvatarRolAccent(rol);
		expect(accent?.severity).toBe(severity);
		expect(accent?.icon).toMatch(/^pi pi-/);
	});

	it('Director y Administrador comparten acento', () => {
		expect(getAvatarRolAccent('Director')).toEqual(getAvatarRolAccent('Administrador'));
	});

	it.each([['Desconocido'], [''], [null], [undefined]])('rol %j → null (neutro)', (rol) => {
		expect(getAvatarRolAccent(rol)).toBeNull();
	});
});
