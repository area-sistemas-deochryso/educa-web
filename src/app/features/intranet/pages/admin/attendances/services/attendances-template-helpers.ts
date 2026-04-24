import type { AsistenciaAdminLista, TipoPersonaAsistencia } from '../models';

/** Severity del `p-tag` para estado "Completa" vs "Incompleta". */
export function estadoSeverity(estado: string): 'success' | 'warn' {
	return estado === 'Completa' ? 'success' : 'warn';
}

/** Label del origen: editado manualmente, manual inicial, o biométrico. */
export function origenLabel(item: AsistenciaAdminLista): string {
	if (item.editadoManualmente) return 'Editado';
	if (item.origenManual) return 'Manual';
	return 'Biométrico';
}

/** Severity del tag de origen. */
export function origenSeverity(item: AsistenciaAdminLista): 'warn' | 'info' | 'secondary' {
	if (item.editadoManualmente) return 'warn';
	if (item.origenManual) return 'info';
	return 'secondary';
}

/** "E" → "Estudiante" · "P" → "Profesor". */
export function tipoPersonaLabel(tipo: TipoPersonaAsistencia): string {
	return tipo === 'P' ? 'Profesor' : 'Estudiante';
}

/** ISO "yyyy-MM-dd" → "dd/MM/yyyy". Tolera strings cortos devolviéndolos sin tocar. */
export function formatFechaIso(iso: string): string {
	if (!iso || iso.length < 10) return iso;
	const [y, m, d] = iso.slice(0, 10).split('-');
	return `${d}/${m}/${y}`;
}
