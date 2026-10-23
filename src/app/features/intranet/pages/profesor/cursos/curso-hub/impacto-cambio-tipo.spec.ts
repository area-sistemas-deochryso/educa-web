// * Texto del aviso de impacto: solo da forma a los números del BE.
// #region Imports
import { describe, expect, it } from 'vitest';
import type { ImpactoCambioTipoDto } from '@features/intranet/pages/profesor/models';

import { buildImpactoCambioTipoMensaje } from './impacto-cambio-tipo';

// #endregion

const base: ImpactoCambioTipoDto = {
	esGrupalDestino: true,
	notasConservadas: 0,
	notasQuePasanAExcepcion: 0,
	notasSinGrupo: 0,
	gruposQueDejanDeExistir: 0,
	tieneTareaEnlazada: false,
	entregasPublicadasQueCambianDeVisibilidad: 0,
};

describe('buildImpactoCambioTipoMensaje', () => {
	it('says nothing is lost when there are no notas', () => {
		expect(buildImpactoCambioTipoMensaje('Práctica', base)).toBe(
			'¿Cambiar "Práctica" a grupal? Todavía no tiene notas, no se pierde nada.',
		);
	});

	it('individual → grupal: reports exceptions and students without group', () => {
		const msg = buildImpactoCambioTipoMensaje('Práctica', {
			...base,
			notasConservadas: 6,
			notasQuePasanAExcepcion: 6,
			notasSinGrupo: 1,
		});
		expect(msg).toContain('Se conservan 6 notas con su observación.');
		expect(msg).toContain('6 notas quedan como excepción de su grupo.');
		expect(msg).toContain('1 alumno con nota no está en ningún grupo.');
	});

	it('grupal → individual: reports groups that stop having their own row', () => {
		const msg = buildImpactoCambioTipoMensaje('Práctica', {
			...base,
			esGrupalDestino: false,
			notasConservadas: 4,
			gruposQueDejanDeExistir: 2,
		});
		expect(msg).toContain('a individual?');
		expect(msg).toContain('2 grupos dejan de tener fila propia');
	});

	it('with a linked task, reports the task and published submissions that change visibility', () => {
		expect(
			buildImpactoCambioTipoMensaje('Práctica', { ...base, tieneTareaEnlazada: true, entregasPublicadasQueCambianDeVisibilidad: 3 }),
		).toContain('La tarea enlazada también pasa a grupal. 3 entregas publicadas pasan a ser visibles entre compañeros de grupo.');
		expect(
			buildImpactoCambioTipoMensaje('Práctica', {
				...base,
				esGrupalDestino: false,
				tieneTareaEnlazada: true,
				entregasPublicadasQueCambianDeVisibilidad: 1,
			}),
		).toContain('1 entrega publicada deja de ser visible');
	});
});
