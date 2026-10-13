// #region Imports
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';

import type { HorarioProfesorDto } from '@features/intranet/pages/profesor/models';

import { CursoHubHeaderComponent } from './curso-hub-header.component';
// #endregion

// #region Fixtures
const slot = (id: number, dia: string) =>
	({ id, diaSemanaDescripcion: dia, horaInicio: '08:00', horaFin: '09:30' }) as HorarioProfesorDto;

@Component({
	standalone: true,
	imports: [CursoHubHeaderComponent],
	template: `
		<app-curso-hub-header cursoNombre="Matemática" salonDescripcion="3A" [slots]="slots" [selectedSlotId]="1">
			<button type="button" class="projected-chip">Archivos</button>
		</app-curso-hub-header>
	`,
})
class HostComponent {
	slots: HorarioProfesorDto[] = [slot(1, 'Lunes')];
}
// #endregion

describe('CursoHubHeaderComponent', () => {
	function create(slots: HorarioProfesorDto[]) {
		const fixture = TestBed.createComponent(HostComponent);
		fixture.componentInstance.slots = slots;
		fixture.detectChanges();
		return fixture.nativeElement as HTMLElement;
	}

	it('shows the course as the title and the salón as its subtitle on the same header', () => {
		const el = create([slot(1, 'Lunes')]);

		expect(el.querySelector('h2')?.textContent?.trim()).toBe('Matemática');
		expect(el.querySelector('.hub-header__subtitle')?.textContent?.trim()).toBe('Salón 3A');
	});

	it('projects the chips next to the title', () => {
		const el = create([slot(1, 'Lunes')]);

		expect(el.querySelector('.hub-header__chips .projected-chip')).not.toBeNull();
	});

	it('hides the slot selector when the pair has a single slot', () => {
		const el = create([slot(1, 'Lunes')]);

		expect(el.querySelector('[data-info-anchor="curso-hub-franja-selector"]')).toBeNull();
	});

	it('shows the slot selector when the pair has more than one slot', () => {
		const el = create([slot(1, 'Lunes'), slot(2, 'Miércoles')]);

		expect(el.querySelector('[data-info-anchor="curso-hub-franja-selector"]')).not.toBeNull();
	});
});
