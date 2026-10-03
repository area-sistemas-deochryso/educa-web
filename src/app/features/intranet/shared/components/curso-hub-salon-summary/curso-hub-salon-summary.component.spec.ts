// #region Imports
import { ComponentRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { describe, expect, it } from 'vitest';

import type { CursoHubTarget } from '../../helpers/curso-hub-link.helpers';
import type { CursoHubSalonSummary } from '../../helpers/curso-hub-salon.helpers';
import { CursoHubSalonSummaryComponent } from './curso-hub-salon-summary.component';
// #endregion

const SUMMARY: CursoHubSalonSummary = {
	salonId: 34,
	salonDescripcion: '5to A',
	cantidadEstudiantes: 28,
	cursos: [
		{ cursoId: 24, nombre: 'Álgebra' },
		{ cursoId: 30, nombre: 'Historia' },
	],
};

const TARGET: CursoHubTarget = { commands: ['/intranet', 'profesor', 'salones'], queryParams: { horarioId: 1 } };

describe('CursoHubSalonSummaryComponent', () => {
	function render(inputs: { esTutor?: boolean | null; salonesTarget?: CursoHubTarget | null } = {}) {
		// Cada render es un módulo de test nuevo: un mismo `it` puede renderizar varias veces.
		TestBed.resetTestingModule();
		TestBed.configureTestingModule({ providers: [provideRouter([])] });
		const fixture = TestBed.createComponent(CursoHubSalonSummaryComponent);
		const ref = fixture.componentRef as ComponentRef<CursoHubSalonSummaryComponent>;
		ref.setInput('rol', 'profesor');
		ref.setInput('summary', SUMMARY);
		ref.setInput('currentCursoId', 24);
		if (inputs.esTutor !== undefined) ref.setInput('esTutor', inputs.esTutor);
		if (inputs.salonesTarget !== undefined) ref.setInput('salonesTarget', inputs.salonesTarget);
		fixture.detectChanges();
		return fixture.nativeElement as HTMLElement;
	}

	it('shows the student count', () => {
		expect(render().textContent).toContain('28');
		expect(render().textContent).toContain('Estudiantes');
	});

	it('shows the tutoría card only when the role provides it', () => {
		expect(render().textContent).not.toContain('Tutoría');
		expect(render({ esTutor: true }).textContent).toContain('Eres tutor de este salón');
		expect(render({ esTutor: false }).textContent).toContain('No eres tutor de este salón');
	});

	it('marks the current course and links to the others, without a slot', () => {
		const el = render();

		expect(el.querySelector('[aria-current="true"]')?.textContent).toContain('Álgebra');
		const links = Array.from(el.querySelectorAll<HTMLAnchorElement>('a[data-info-anchor="curso-hub-salon-curso-link"]'));
		expect(links.map((a) => a.getAttribute('href'))).toEqual(['/intranet/profesor/cursos/30/34']);
	});

	it('renders the Mis Salones link with the slot query, or nothing when there is no target', () => {
		const link = (el: HTMLElement) => el.querySelector<HTMLAnchorElement>('[data-info-anchor="curso-hub-salon-ir-salones"]');

		expect(link(render({ salonesTarget: TARGET }))?.getAttribute('href')).toBe('/intranet/profesor/salones?horarioId=1');
		expect(link(render({ salonesTarget: null }))).toBeNull();
	});
});
