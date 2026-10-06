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

function withResumen(
	base: HorarioProfesorDto,
	semanasConMaterial: number,
	numeroSemanas: number,
): HorarioProfesorDto {
	return { ...base, contenidoResumen: { numeroSemanas, semanasConMaterial } };
}

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

		expect(chips.map((c) => c.querySelector('.pair-card__when')?.textContent?.trim())).toEqual([
			'Lunes · 08:00 - 09:30',
			'Miércoles · 10:00 - 11:30',
		]);
		expect(chips.map((c) => c.getAttribute('href'))).toEqual([
			'/intranet/profesor/cursos/24/34?horarioId=1',
			'/intranet/profesor/cursos/24/34?horarioId=2',
		]);
	});

	it('uses the role of the viewer in every hub link', () => {
		const el = render({ rol: 'estudiante', salonLink: '/intranet/estudiante/salones' });

		expect(query(el, '.pair-card__link').getAttribute('href')).toBe(
			'/intranet/estudiante/cursos/24/34',
		);
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

	describe('content progress per slot', () => {
		function bars(el: HTMLElement) {
			return [...el.querySelectorAll<HTMLElement>('.pair-card__slot .pair-card__progress')];
		}

		it('shows «Sin contenido» (not 0/0) when the slot has no resumen', () => {
			const items = bars(render());

			expect(items.map((b) => b.textContent?.trim())).toEqual([
				'Sin contenido',
				'Sin contenido',
			]);
			expect(items.every((b) => b.getAttribute('role') === null)).toBe(true);
		});

		it('shows 0/N as a progressbar with zero fill when no week has material', () => {
			const group = groupHorariosByPair([withResumen(MON, 0, 16)])[0];
			const [bar] = bars(render({ group }));

			expect(bar.getAttribute('role')).toBe('progressbar');
			expect(bar.getAttribute('aria-valuenow')).toBe('0');
			expect(bar.getAttribute('aria-valuemax')).toBe('16');
			expect(bar.textContent?.trim()).toBe('0/16');
			expect(bar.querySelector<HTMLElement>('.pair-card__progress-fill')?.style.width).toBe(
				'0%',
			);
		});

		it('keeps one n/N per slot without adding them across the pair', () => {
			const group = groupHorariosByPair([
				withResumen(WED, 8, 16),
				withResumen(MON, 4, 16),
			])[0];
			const items = bars(render({ group }));

			expect(items.map((b) => b.textContent?.trim())).toEqual(['4/16', '8/16']);
			expect(items.map((b) => b.getAttribute('aria-valuenow'))).toEqual(['4', '8']);
			expect(items[0].getAttribute('aria-valuetext')).toBe('4 de 16 semanas con material');
			expect(items[0].getAttribute('aria-label')).toBe('Semanas con material de Lunes');
			expect(
				items[1].querySelector<HTMLElement>('.pair-card__progress-fill')?.style.width,
			).toBe('50%');
		});

		it('fills the bar completely when every week has material', () => {
			const group = groupHorariosByPair([withResumen(MON, 16, 16)])[0];
			const [bar] = bars(render({ group }));

			expect(bar.textContent?.trim()).toBe('16/16');
			expect(bar.querySelector<HTMLElement>('.pair-card__progress-fill')?.style.width).toBe(
				'100%',
			);
		});

		it('mixes a slot with resumen and one without', () => {
			const group = groupHorariosByPair([withResumen(MON, 2, 10), WED])[0];

			expect(bars(render({ group })).map((b) => b.textContent?.trim())).toEqual([
				'2/10',
				'Sin contenido',
			]);
		});
	});
});
