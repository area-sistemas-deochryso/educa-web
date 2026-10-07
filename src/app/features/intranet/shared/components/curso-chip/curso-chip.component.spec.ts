// #region Imports
import { provideZonelessChangeDetection, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { ThemeService } from '@core/services/theme';
import { CURSO_TEXT_COLOR, cursoColorFor } from '@intranet-shared/config/curso-colors';
import { CursoChipComponent } from './curso-chip.component';
// #endregion

describe('CursoChipComponent', () => {
	const isDarkMode = signal(false);
	let fixture: ComponentFixture<CursoChipComponent>;

	const chip = (): HTMLElement => (fixture.nativeElement as HTMLElement).querySelector('.curso-chip') as HTMLElement;

	const render = (cursoId: number | null | undefined, nombre = 'Física'): void => {
		fixture.componentRef.setInput('cursoId', cursoId);
		fixture.componentRef.setInput('nombre', nombre);
		fixture.detectChanges();
	};

	beforeEach(() => {
		isDarkMode.set(false);
		TestBed.configureTestingModule({
			imports: [CursoChipComponent],
			providers: [provideZonelessChangeDetection(), { provide: ThemeService, useValue: { isDarkMode } }],
		});
		fixture = TestBed.createComponent(CursoChipComponent);
	});

	it('pinta el color del curso con texto blanco cuando hay cursoId', () => {
		render(11);

		expect(chip().classList.contains('curso-chip--neutral')).toBe(false);
		expect(chip().style.backgroundColor).not.toBe('');
		expect(chip().style.color).not.toBe('');
		expect(chip().textContent?.trim()).toBe('Física');
	});

	it('usa el chip neutro, sin color inline, cuando cursoId es null', () => {
		render(null);

		expect(chip().classList.contains('curso-chip--neutral')).toBe(true);
		expect(chip().style.backgroundColor).toBe('');
		expect(chip().style.color).toBe('');
		expect(chip().textContent?.trim()).toBe('Física');
	});

	it('usa el chip neutro cuando cursoId es undefined', () => {
		render(undefined);

		expect(chip().classList.contains('curso-chip--neutral')).toBe(true);
		expect(chip().style.backgroundColor).toBe('');
	});

	it('cursoId 0 es un curso válido, no un neutro', () => {
		render(0);

		expect(chip().classList.contains('curso-chip--neutral')).toBe(false);
		expect(chip().style.backgroundColor).not.toBe('');
	});

	it('el mismo cursoId da el mismo color entre instancias', () => {
		render(24, 'Biología');
		const first = chip().style.backgroundColor;
		const second = TestBed.createComponent(CursoChipComponent);
		second.componentRef.setInput('cursoId', 24);
		second.componentRef.setInput('nombre', 'Biología');
		second.detectChanges();

		expect((second.nativeElement as HTMLElement).querySelector<HTMLElement>('.curso-chip')?.style.backgroundColor).toBe(first);
	});

	it('cambia al tono oscuro cuando se activa el tema oscuro', () => {
		render(11);
		const claro = chip().style.backgroundColor;

		isDarkMode.set(true);
		fixture.detectChanges();

		expect(cursoColorFor(11, true)).not.toBe(cursoColorFor(11, false));
		expect(chip().style.backgroundColor).not.toBe(claro);
	});

	it('el texto es siempre CURSO_TEXT_COLOR', () => {
		render(11);

		expect(chip().style.color).not.toBe('');
		expect(CURSO_TEXT_COLOR.toLowerCase()).toMatch(/#fff|white|var\(/);
	});
});
