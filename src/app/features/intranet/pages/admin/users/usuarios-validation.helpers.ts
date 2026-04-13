import { APP_USER_ROLES } from '@shared/constants';
import { UsuarioLista } from './services';
import { UsuarioValidacionItem } from './components/usuarios-validation-dialog/usuarios-validation-dialog.component';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TILDES_REGEX = /[áéíóúàèìòùäëïöüâêîôûñ]/i;
const DNI_REGEX = /^\d{8}$/;

/** DNI con todos los dígitos iguales (11111111, 00000000, etc.) */
function esDniDigitosIguales(dni: string): boolean {
	return dni.split('').every((d) => d === dni[0]);
}

/**
 * Algoritmo Módulo 11 de SUNAT: convierte DNI a RUC-10
 * y verifica que el dígito verificador sea válido (0-9).
 * Prefijo "10" + 8 dígitos DNI → pesos [5,4,3,2,7,6,5,4,3,2].
 */
function validarDniModulo11(dni: string): boolean {
	const ruc10 = `10${dni}`;
	const pesos = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
	let suma = 0;
	for (let i = 0; i < 10; i++) {
		suma += Number(ruc10[i]) * pesos[i];
	}
	const residuo = suma % 11;
	const digito = 11 - residuo;
	return digito <= 9 || digito === 11;
}

function validarDni(dni: string, errores: string[]): void {
	const d = dni.trim();
	if (!d) {
		errores.push('DNI vacío');
		return;
	}
	if (!DNI_REGEX.test(d)) {
		errores.push('DNI inválido');
		return;
	}
	if (esDniDigitosIguales(d)) errores.push('DNI imposible (dígitos iguales)');
	if (!validarDniModulo11(d)) errores.push('DNI no pasa verificación SUNAT');
}

function validarCorreoApoderado(correoRaw: string, errores: string[]): void {
	const correo = correoRaw.trim();
	if (!correo) {
		errores.push('Correo apoderado vacío');
		return;
	}
	if (!EMAIL_REGEX.test(correo)) errores.push('Correo apoderado inválido');
	else if (TILDES_REGEX.test(correo)) errores.push('Correo apoderado con tilde');
}

export function validarUsuarios(usuarios: UsuarioLista[]): UsuarioValidacionItem[] {
	const invalidos: UsuarioValidacionItem[] = [];
	for (const u of usuarios) {
		const errores: string[] = [];
		validarDni(u.dni ?? '', errores);
		if (u.rol === APP_USER_ROLES.Estudiante) {
			validarCorreoApoderado(u.correoApoderado ?? '', errores);
		}
		if (errores.length > 0) {
			invalidos.push({
				nombreCompleto: u.nombreCompleto,
				dni: u.dni ?? '',
				correo: u.correoApoderado ?? u.correo ?? '',
				rol: u.rol,
				salonNombre: u.salonNombre ?? '',
				errores,
			});
		}
	}
	return invalidos;
}
