import type { UsuarioLista } from '../services';

export const MISSING_GUARDIAN_EMAIL_LABEL = 'Sin correo de apoderado';

export function hasMissingGuardianEmail(usuario: Pick<UsuarioLista, 'rol' | 'correoApoderado'>): boolean {
	return usuario.rol === 'Estudiante' && !usuario.correoApoderado?.trim();
}
