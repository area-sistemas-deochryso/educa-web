// #region Imports
import { describe, expect, it } from 'vitest';

import { validarUsuarios } from './usuarios-validation.helpers';
import type { UsuarioLista } from './services';
// #endregion

// #region Tests
describe('validarUsuarios', () => {
	// 12345678 → RUC-10 1012345678: suma 143, 143 % 11 = 0, dígito 11 → válido
	const DNI_OK = '12345678';
	// 12345673 → suma 133, 133 % 11 = 1, dígito 10 → no pasa Módulo 11
	const DNI_MOD11_FAIL = '12345673';

	function usuario(over: Partial<UsuarioLista> = {}): UsuarioLista {
		return {
			id: 1,
			dni: DNI_OK,
			nombres: 'Ana',
			apellidos: 'Pérez',
			nombreCompleto: 'Ana Pérez',
			rol: 'Profesor',
			estado: true,
			fechaRegistro: '2026-01-01',
			...over,
		};
	}

	it('un DNI válido de profesor no genera errores', () => {
		expect(validarUsuarios([usuario()])).toEqual([]);
	});

	it('lista vacía → sin inválidos', () => {
		expect(validarUsuarios([])).toEqual([]);
	});

	describe('DNI', () => {
		it('vacío', () => {
			expect(validarUsuarios([usuario({ dni: '   ' })])[0].errores).toEqual(['DNI vacío']);
		});

		it('dni undefined se trata como vacío', () => {
			const r = validarUsuarios([usuario({ dni: undefined as unknown as string })]);
			expect(r[0].errores).toEqual(['DNI vacío']);
		});

		it.each(['1234567', '123456789', 'abcdefgh', '1234567a'])('formato inválido: %s', (dni) => {
			expect(validarUsuarios([usuario({ dni })])[0].errores).toEqual(['DNI inválido']);
		});

		it('dígitos iguales es imposible', () => {
			expect(validarUsuarios([usuario({ dni: '11111111' })])[0].errores).toContain(
				'DNI imposible (dígitos iguales)',
			);
		});

		it('no pasa Módulo 11 de SUNAT', () => {
			expect(validarUsuarios([usuario({ dni: DNI_MOD11_FAIL })])[0].errores).toEqual([
				'DNI no pasa verificación SUNAT',
			]);
		});

		it('recorta espacios antes de validar', () => {
			expect(validarUsuarios([usuario({ dni: ` ${DNI_OK} ` })])).toEqual([]);
		});
	});

	describe('correo del apoderado (solo Estudiante)', () => {
		it('profesor sin correo de apoderado no se valida', () => {
			expect(validarUsuarios([usuario({ rol: 'Profesor', correoApoderado: '' })])).toEqual([]);
		});

		it('estudiante sin correo → vacío', () => {
			expect(validarUsuarios([usuario({ rol: 'Estudiante' })])[0].errores).toEqual([
				'Correo apoderado vacío',
			]);
		});

		it('estudiante con correo mal formado → inválido', () => {
			const r = validarUsuarios([usuario({ rol: 'Estudiante', correoApoderado: 'sin-arroba' })]);
			expect(r[0].errores).toEqual(['Correo apoderado inválido']);
		});

		it('estudiante con tilde en el correo', () => {
			const r = validarUsuarios([usuario({ rol: 'Estudiante', correoApoderado: 'josé@mail.com' })]);
			expect(r[0].errores).toEqual(['Correo apoderado con tilde']);
		});

		it('estudiante con correo válido no genera error', () => {
			expect(
				validarUsuarios([usuario({ rol: 'Estudiante', correoApoderado: 'padre@mail.com' })]),
			).toEqual([]);
		});
	});

	describe('item resultante', () => {
		it('acumula errores de DNI y correo y mapea los campos', () => {
			const r = validarUsuarios([
				usuario({
					rol: 'Estudiante',
					dni: '12',
					correoApoderado: undefined,
					correo: 'propio@mail.com',
					salonNombre: '5to A',
				}),
			]);
			expect(r).toEqual([
				{
					nombreCompleto: 'Ana Pérez',
					dni: '12',
					correo: 'propio@mail.com',
					rol: 'Estudiante',
					salonNombre: '5to A',
					errores: ['DNI inválido', 'Correo apoderado vacío'],
				},
			]);
		});

		it('correo/salón caen a "" si no hay valor', () => {
			const [b] = validarUsuarios([usuario({ dni: '' })]);
			expect(b.correo).toBe('');
			expect(b.salonNombre).toBe('');
		});

		it('solo devuelve los inválidos, preservando orden', () => {
			const r = validarUsuarios([
				usuario({ id: 1, nombreCompleto: 'A', dni: '' }),
				usuario({ id: 2, nombreCompleto: 'B' }),
				usuario({ id: 3, nombreCompleto: 'C', dni: '99999999' }),
			]);
			expect(r.map((x) => x.nombreCompleto)).toEqual(['A', 'C']);
		});
	});
});
// #endregion
