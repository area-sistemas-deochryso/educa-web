import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it } from 'vitest';

import type { HorarioProfesorDto } from '@features/intranet/pages/profesor/models';

import { groupHorariosByPair } from '../../helpers/curso-hub-pair.helpers';
import { CursoPairCardComponent } from './curso-pair-card.component';

// #region Fixtures
function slot(id: number, diaSemana: number, dia: string, horaInicio: string, horaFin: string) {
	return {
		id,
		diaSemana,
		diaSemanaDescripcion: dia,
		horaInicio,
		horaFin,
		cursoId: 24,
		salonId: 34,
		cursoNombre: 'Matemática',
		salonDescripcion: '3° A',
		profesorNombreCompleto: null,
		cantidadEstudiantes: 25,
	} as HorarioProfesorDto;
}

const MON = slot(1, 1, 'Lunes', '08:00', '09:30');
const WED = slot(2, 3, 'Miércoles', '10:00', '11:30');

@Component({
	standalone: true,
	imports: [CursoPairCardComponent],
	template: `
		<app-curso-pair-card
			[rol]="rol"
			anchorPrefix="x-cursos"
			[salonLink]="salonLink"
			[group]="group"
			accent="#123456"
		>
			<span class="projected">25 estudiantes</span>
		</app-curso-pair-card>
	`,
})
class HostComponent {
	rol: 'profesor' | 'estudiante' = 'profesor';
	salonLink = '/intranet/profesor/salones';
	group = groupHorariosByPair([WED, MON])[0];
}
// #endregion

function render(patch: Partial<HostComponent> = {}): HTMLElement {
	const fixture = TestBed.createComponent(HostComponent);
	Object.assign(fixture.componentInstance, patch);
	fixture.detectChanges();
	return fixture.nativeElement as HTMLElement;
}

function query(root: HTMLElement, selector: string): HTMLAnchorElement {
	const found = root.querySelector<HTMLAnchorElement>(selector);
	if (!found) throw new Error(`Element not found: ${selector}`);
	return found;
}

describe('CursoPairCardComponent', () => {
	beforeEach(() => {
		TestBed.resetTestingModule();
		TestBed.configureTestingModule({ providers: [provideRouter([])] });
	});

	it('links the card body to the pair without a slot so the hub resolves it', () => {
		const title = query(render(), '.pair-card__link');

		expect(title.textContent).toContain('Matemática');
		expect(title.getAttribute('href')).toBe('/intranet/profesor/cursos/24/34');
	});

	it('renders one chip per slot in weekly order, each entering the hub with that slot', () => {
		const chips = [...render().querySelectorAll<HTMLAnchorElement>('.pair-card__slot')];

		expect(chips.map((c) => c.textContent?.trim())).toEqual(['Lunes · 08:00 - 09:30', 'Miércoles · 10:00 - 11:30']);
		expect(chips.map((c) => c.getAttribute('href'))).toEqual([
			'/intranet/profesor/cursos/24/34?horarioId=1',
			'/intranet/profesor/cursos/24/34?horarioId=2',
		]);
	});

	it('uses the role of the viewer in every hub link', () => {
		const el = render({ rol: 'estudiante', salonLink: '/intranet/estudiante/salones' });

		expect(query(el, '.pair-card__link').getAttribute('href')).toBe('/intranet/estudiante/cursos/24/34');
		expect(query(el, '.pair-card__slot').getAttribute('href')).toBe(
			'/intranet/estudiante/cursos/24/34?horarioId=1',
		);
	});

	it('keeps the classroom tag as a sibling link with an accessible name, never nested in another link', () => {
		const el = render();
		const salon = query(el, '.pair-card__salon');

		expect(salon.getAttribute('href')).toBe('/intranet/profesor/salones');
		expect(salon.getAttribute('aria-label')).toBe('Ver salón 3° A');
		expect(el.querySelectorAll('a a')).toHaveLength(0);
	});

	it('projects the role-specific data line and exposes the info anchors', () => {
		const el = render();

		expect(el.querySelector('.projected')?.textContent).toBe('25 estudiantes');
		expect(el.querySelector('[data-info-anchor="x-cursos-card"]')).not.toBeNull();
		expect(el.querySelector('[data-info-anchor="x-cursos-card-salon-tag"]')).not.toBeNull();
		expect(el.querySelectorAll('[data-info-anchor="x-cursos-card-franja"]')).toHaveLength(2);
	});
});
