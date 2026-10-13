// * Tests for findProximaEvaluacion / describirDistancia (P110-F24b, INV-C12).
import { describe, expect, it } from 'vitest';

import type { CalificacionConMiNotaDto } from '@features/intranet/pages/estudiante/models';
import { describirDistancia, findProximaEvaluacion } from './proxima-evaluacion';

const HOY = new Date(2026, 9, 13, 15, 30); // 13/10/2026 15:30 local

function ev(id: number, fechaEvaluacion: string, extra: Partial<CalificacionConMiNotaDto> = {}): CalificacionConMiNotaDto {
	return { id, titulo: `E${id}`, fechaEvaluacion, nota: null, vencida: false, ...extra } as CalificacionConMiNotaDto;
}

describe('findProximaEvaluacion', () => {
	it('picks the closest future ungraded one, skipping overdue and graded', () => {
		const lista = [
			ev(1, '2026-10-01', { vencida: true }),
			ev(2, '2026-10-23'),
			ev(3, '2026-10-16'),
			ev(4, '2026-10-14', { nota: 15 }),
		];

		expect(findProximaEvaluacion(lista, HOY)?.id).toBe(3);
	});

	it('returns null when there is no ungraded, non-overdue, future candidate', () => {
		const lista = [ev(1, '2026-10-01', { vencida: true }), ev(2, '2026-10-20', { nota: 12 }), ev(3, '2026-10-05')];

		expect(findProximaEvaluacion(lista, HOY)).toBeNull();
		expect(findProximaEvaluacion([], HOY)).toBeNull();
	});

	it('counts today as today even if its time is earlier than now (day normalization)', () => {
		expect(findProximaEvaluacion([ev(1, '2026-10-13T08:00:00')], HOY)?.id).toBe(1);
	});

	it('discards yesterday', () => {
		expect(findProximaEvaluacion([ev(1, '2026-10-12T23:59:00')], HOY)).toBeNull();
	});

	it('treats a missing `vencida` (previous BE) as not overdue', () => {
		const e = ev(1, '2026-10-20');
		delete e.vencida;

		expect(findProximaEvaluacion([e], HOY)?.id).toBe(1);
	});
});

describe('describirDistancia', () => {
	it.each([
		['2026-10-13T08:00:00', 'Hoy'],
		['2026-10-14', 'Mañana'],
		['2026-10-16', 'En 3 días'],
	])('%s -> %s', (fecha, esperado) => {
		expect(describirDistancia(fecha, HOY)).toBe(esperado);
	});
});
