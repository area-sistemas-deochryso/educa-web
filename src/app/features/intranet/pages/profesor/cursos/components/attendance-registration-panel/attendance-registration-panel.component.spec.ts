import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';

import { AttendanceRegistrationPanelComponent } from './attendance-registration-panel.component';

describe('AttendanceRegistrationPanelComponent', () => {
	function create(initialFecha: string) {
		const fixture = TestBed.createComponent(AttendanceRegistrationPanelComponent);
		fixture.componentRef.setInput('initialFecha', initialFecha);
		fixture.detectChanges();
		return fixture;
	}
	const iso = (date: Date) =>
		`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

	describe('fecha inicial y reset', () => {
		it('starts on the given date', () => {
			const fixture = create('2026-10-05');

			expect(iso(fixture.componentInstance.selectedDate)).toBe('2026-10-05');
		});

		it('does not overwrite the date the user picked when the input has not changed', () => {
			const fixture = create('2026-10-05');
			fixture.componentInstance.selectedDate = new Date(2026, 9, 7);

			fixture.detectChanges();

			expect(iso(fixture.componentInstance.selectedDate)).toBe('2026-10-07');
		});

		it('puts the datepicker back on the current date when the parent rejects the change', () => {
			const fixture = create('2026-10-05');
			fixture.componentInstance.selectedDate = new Date(2026, 9, 7);

			fixture.componentRef.setInput('fechaResetKey', 1);
			fixture.detectChanges();

			expect(iso(fixture.componentInstance.selectedDate)).toBe('2026-10-05');
		});

		it('follows a new initial date again after a reset', () => {
			const fixture = create('2026-10-05');
			fixture.componentRef.setInput('fechaResetKey', 1);
			fixture.detectChanges();

			fixture.componentRef.setInput('initialFecha', '2026-10-12');
			fixture.detectChanges();

			expect(iso(fixture.componentInstance.selectedDate)).toBe('2026-10-12');
		});
	});

	describe('confirmación de fecha atípica', () => {
		// 2026-10-05 cae un día distinto al esperado: es atípica.
		const diaEsperadoDistinto = (new Date(2026, 9, 5).getDay() + 1) % 7;
		const diaEsperadoIgual = new Date(2026, 9, 5).getDay();

		function createAtypical(diaEsperado = diaEsperadoDistinto) {
			const fixture = create('2026-10-05');
			fixture.componentRef.setInput('diaSemanaEsperado', diaEsperado);
			fixture.detectChanges();
			return fixture;
		}
		/** Simula al padre: el panel emite la declaración y el padre la devuelve como `recuperacion`. */
		function confirmCurrentDate(fixture: ReturnType<typeof create>, motivo = 'Clase recuperada por feriado') {
			const panel = fixture.componentInstance;
			let emitted: { fecha: string; motivo: string } | undefined;
			panel.recuperacionConfirm.subscribe((e) => (emitted = e));
			panel.confirmarFechaAtipica();
			panel.motivoText.set(motivo);
			panel.confirmarRecuperacion();
			if (emitted) fixture.componentRef.setInput('recuperacion', { fecha: emitted.fecha, motivo: emitted.motivo });
			fixture.detectChanges();
		}
		function pickAnotherDate(fixture: ReturnType<typeof create>, day: number) {
			const panel = fixture.componentInstance;
			panel.selectedDate = new Date(2026, 9, day);
			panel.onDateSelect();
			fixture.detectChanges();
		}

		it('blocks saving on an atypical date until it is confirmed', () => {
			const fixture = createAtypical();

			expect(fixture.componentInstance.puedeGuardar()).toBe(false);

			confirmCurrentDate(fixture);

			expect(fixture.componentInstance.puedeGuardar()).toBe(true);
		});

		it('keeps the confirmation when the parent rejects a date change (user stays)', () => {
			const fixture = createAtypical();
			confirmCurrentDate(fixture);

			pickAnotherDate(fixture, 7);
			fixture.componentRef.setInput('fechaResetKey', 1);
			fixture.detectChanges();

			expect(iso(fixture.componentInstance.selectedDate)).toBe('2026-10-05');
			expect(fixture.componentInstance.puedeGuardar()).toBe(true);
		});

		it('drops the confirmation while another atypical date is selected', () => {
			const fixture = createAtypical();
			confirmCurrentDate(fixture);

			pickAnotherDate(fixture, 7);

			expect(fixture.componentInstance.puedeGuardar()).toBe(false);
		});

		it('stays unconfirmed when the user stays without a prior confirmation', () => {
			const fixture = createAtypical();

			pickAnotherDate(fixture, 7);
			fixture.componentRef.setInput('fechaResetKey', 1);
			fixture.detectChanges();

			expect(fixture.componentInstance.puedeGuardar()).toBe(false);
		});

		it('does not carry the confirmation to the nearest valid date nor to a later atypical one', () => {
			const fixture = createAtypical();
			confirmCurrentDate(fixture);

			fixture.componentInstance.irAFechaValida();
			fixture.detectChanges();

			expect(fixture.componentInstance.fechaFueraDeHorario()).toBe(false);
			expect(fixture.componentInstance.puedeGuardar()).toBe(true);

			pickAnotherDate(fixture, 14);
			expect(fixture.componentInstance.puedeGuardar()).toBe(false);
		});

		it('blocks saving when the user picks an atypical date from a valid one', () => {
			const fixture = createAtypical(diaEsperadoIgual);
			expect(fixture.componentInstance.puedeGuardar()).toBe(true);

			pickAnotherDate(fixture, 7);

			expect(fixture.componentInstance.puedeGuardar()).toBe(false);
		});

		it('INV-AC10: does not let the user declare a recovery with a motive under 10 characters', () => {
			const fixture = createAtypical();
			const panel = fixture.componentInstance;
			let emitted = false;
			panel.recuperacionConfirm.subscribe(() => (emitted = true));
			panel.confirmarFechaAtipica();

			panel.motivoText.set('  corto  ');
			panel.confirmarRecuperacion();

			expect(emitted).toBe(false);
			expect(panel.motivoDialogVisible()).toBe(true);
			expect(panel.puedeGuardar()).toBe(false);
		});

		it('INV-AC10: emits the trimmed motive and the date of the recovery', () => {
			const fixture = createAtypical();
			const panel = fixture.componentInstance;
			let emitted: { fecha: string; motivo: string } | undefined;
			panel.recuperacionConfirm.subscribe((e) => (emitted = e));
			panel.confirmarFechaAtipica();

			panel.motivoText.set('  Clase recuperada por feriado  ');
			panel.confirmarRecuperacion();

			expect(emitted).toEqual({ fecha: '2026-10-05', motivo: 'Clase recuperada por feriado' });
			expect(panel.motivoDialogVisible()).toBe(false);
		});

		it('INV-AC10: allows saving when the loaded list already comes declared as recovery', () => {
			const fixture = createAtypical();
			fixture.componentRef.setInput('recuperacion', { fecha: '2026-10-05', motivo: 'Clase recuperada por feriado' });
			fixture.detectChanges();

			expect(fixture.componentInstance.puedeGuardar()).toBe(true);
		});
	});
});
