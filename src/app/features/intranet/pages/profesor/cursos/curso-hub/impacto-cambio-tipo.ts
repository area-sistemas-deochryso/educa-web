// #region Imports
import type { ImpactoCambioTipoDto } from '@features/intranet/pages/profesor/models';

// #endregion

function plural(n: number, singular: string, pluralForm: string): string {
	return `${n} ${n === 1 ? singular : pluralForm}`;
}

/**
 * Texto del aviso antes de «Cambiar a grupal/individual» (INV-C17). Solo da forma a los números que
 * entrega el BE; no recalcula nada.
 */
export function buildImpactoCambioTipoMensaje(titulo: string, impacto: ImpactoCambioTipoDto): string {
	const destino = impacto.esGrupalDestino ? 'grupal' : 'individual';
	const partes = [`¿Cambiar "${titulo}" a ${destino}?`];

	if (impacto.notasConservadas === 0) {
		partes.push('Todavía no tiene notas, no se pierde nada.');
	} else {
		partes.push(`Se conserva${impacto.notasConservadas === 1 ? '' : 'n'} ${plural(impacto.notasConservadas, 'nota', 'notas')} con su observación.`);
	}

	if (impacto.esGrupalDestino) {
		if (impacto.notasQuePasanAExcepcion > 0) {
			partes.push(`${plural(impacto.notasQuePasanAExcepcion, 'nota queda', 'notas quedan')} como excepción de su grupo.`);
		}
		if (impacto.notasSinGrupo > 0) {
			partes.push(`${plural(impacto.notasSinGrupo, 'alumno con nota no está', 'alumnos con nota no están')} en ningún grupo.`);
		}
	} else if (impacto.gruposQueDejanDeExistir > 0) {
		partes.push(
			`${plural(impacto.gruposQueDejanDeExistir, 'grupo deja', 'grupos dejan')} de tener fila propia: su nota y observación pasan a cada alumno.`,
		);
	}

	if (impacto.tieneTareaEnlazada) {
		partes.push(`La tarea enlazada también pasa a ${destino}.`);
		if (impacto.entregasPublicadasQueCambianDeVisibilidad > 0) {
			const n = impacto.entregasPublicadasQueCambianDeVisibilidad;
			const uno = n === 1;
			const verbo = impacto.esGrupalDestino
				? uno ? 'pasa a ser visible' : 'pasan a ser visibles'
				: uno ? 'deja de ser visible' : 'dejan de ser visibles';
			partes.push(`${plural(n, 'entrega publicada', 'entregas publicadas')} ${verbo} entre compañeros de grupo.`);
		}
	}

	return partes.join(' ');
}
