import { describe, expect, it } from 'vitest';

import type { HorarioProfesorDto } from '@features/intranet/pages/profesor/models';

import { filterPairSlots, pickDefaultSlot, resolveSlot } from './curso-hub-slot.helpers';

// #region Fixtures
function slot(id: number, diaSemana: number, horaInicio: string, horaFin: string, cursoId = 24, salonId = 34) {
	return { id, diaSemana, horaInicio, horaFin, cursoId, salonId } as HorarioProfesorDto;
}

// 2026-10-05 is a Monday.
function at(dayOfMonth: number, hours: number, minutes = 0): Date {
	return new Date(2026, 9, dayOfMonth, hours, minutes);
}
const MON = 5;
const WED = 7;
const SAT = 10;

const MON_8 = slot(1, 1, '08:00', '09:30');
const WED_10 = slot(2, 3, '10:00', '11:30');
// #endregion

describe('filterPairSlots', () => {
	it('keeps only the pair and orders by week position', () => {
		const other = slot(9, 1, '08:00', '09:00', 99, 34);
		expect(filterPairSlots([WED_10, other, MON_8], 24, 34)).toEqual([MON_8, WED_10]);
	});

	it('returns an empty list when the pair does not belong to the user', () => {
		expect(filterPairSlots([MON_8], 1, 1)).toEqual([]);
	});
});

describe('pickDefaultSlot', () => {
	it('returns null without slots', () => {
		expect(pickDefaultSlot([], at(MON, 9))).toBeNull();
	});

	it('picks the slot in progress', () => {
		expect(pickDefaultSlot([MON_8, WED_10], at(WED, 10, 30))).toBe(WED_10);
	});

	it('picks the next future slot when none is in progress', () => {
		expect(pickDefaultSlot([MON_8, WED_10], at(MON, 9, 30))).toBe(WED_10);
	});

	it('never picks an already finished slot: wraps to next week', () => {
		expect(pickDefaultSlot([MON_8, WED_10], at(WED, 12))).toBe(MON_8);
	});

	it('wraps to the first slot of the week on weekends', () => {
		expect(pickDefaultSlot([MON_8, WED_10], at(SAT, 12))).toBe(MON_8);
	});
});

describe('resolveSlot', () => {
	const slots = [MON_8, WED_10];

	it('returns nothing for an empty pair', () => {
		expect(resolveSlot([], null, null, at(MON, 9))).toEqual({ slot: null, requestedInvalid: false });
	});

	it('honours a valid requested slot over every other rule', () => {
		const result = resolveSlot(slots, WED_10.id, new Set([MON_8.id]), at(MON, 8, 30));
		expect(result).toEqual({ slot: WED_10, requestedInvalid: false });
	});

	it('uses the only slot with content when no valid query', () => {
		const result = resolveSlot(slots, null, new Set([WED_10.id]), at(MON, 8, 30));
		expect(result).toEqual({ slot: WED_10, requestedInvalid: false });
	});

	it('falls back to schedule when several or no slots have content', () => {
		const both = resolveSlot(slots, null, new Set([MON_8.id, WED_10.id]), at(MON, 8, 30));
		const none = resolveSlot(slots, null, new Set(), at(MON, 8, 30));
		expect(both.slot).toBe(MON_8);
		expect(none.slot).toBe(MON_8);
	});

	it('falls back to schedule while the content probe has not finished', () => {
		expect(resolveSlot(slots, null, null, at(MON, 9, 30)).slot).toBe(WED_10);
	});

	it('ignores a requested slot outside the pair and flags it', () => {
		const result = resolveSlot(slots, 999, null, at(MON, 8, 30));
		expect(result).toEqual({ slot: MON_8, requestedInvalid: true });
	});

	it('flags a non-numeric requested slot', () => {
		expect(resolveSlot(slots, Number.NaN, null, at(MON, 8, 30)).requestedInvalid).toBe(true);
	});

	it('still applies content preselection after discarding an invalid query', () => {
		const result = resolveSlot(slots, 999, new Set([WED_10.id]), at(MON, 8, 30));
		expect(result).toEqual({ slot: WED_10, requestedInvalid: true });
	});
});
