import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { type Observable, of, throwError } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import type { ConceptoConMontos, ConfiguracionAnio, GuardarMontosAnioPayload } from '@data/models';
import { type EduConfirmation, EduConfirmationService } from '@edu-ui';
import { PagosApiService } from '../services/pagos-api.service';
import { MontosAnioComponent } from './montos-anio.component';
import { MontosAnioFacade } from './montos-anio.facade';

// #region Datos
const conceptos = (secundaria = 320): ConceptoConMontos[] => [
	{
		conceptoId: 1,
		codigo: 'MATRICULA',
		nombre: 'Matricula',
		soloAlumnosNuevos: false,
		montos: [{ conceptoId: 1, monto: 320, rowVersion: 'm1' }],
	},
	{
		conceptoId: 2,
		codigo: 'INSCRIPCION',
		nombre: 'Inscripcion',
		soloAlumnosNuevos: true,
		montos: [],
	},
	{
		conceptoId: 3,
		codigo: 'PENSION',
		nombre: 'Pension',
		soloAlumnosNuevos: false,
		montos: [
			{ conceptoId: 3, nivel: 'Inicial', monto: 280, rowVersion: 'p1' },
			{ conceptoId: 3, nivel: 'Primaria', monto: 320, rowVersion: 'p2' },
			{ conceptoId: 3, nivel: 'Secundaria', monto: secundaria, rowVersion: 'p3' },
		],
	},
];

const config = (lista: ConceptoConMontos[]): ConfiguracionAnio => ({
	anio: 2027,
	conceptos: lista,
	cronograma: [],
});

interface ApiFalsa {
	configuracionAnio: (anio: number) => Observable<ConfiguracionAnio>;
	guardarMontosAnio: (payload: GuardarMontosAnioPayload) => Observable<ConfiguracionAnio>;
}
// #endregion

// #region Helpers
async function estabilizar(fixture: ComponentFixture<MontosAnioComponent>): Promise<void> {
	fixture.detectChanges();
	await fixture.whenStable();
	fixture.detectChanges();
}

async function crear(api: Partial<ApiFalsa> = {}) {
	const falsa: ApiFalsa = {
		configuracionAnio: vi.fn(() => of(config(conceptos()))),
		guardarMontosAnio: vi.fn(() => of(config(conceptos(350)))),
		...api,
	};
	const confirm = vi.fn((opciones: EduConfirmation) => opciones.accept?.());
	TestBed.configureTestingModule({
		imports: [MontosAnioComponent],
		providers: [
			MontosAnioFacade,
			{ provide: PagosApiService, useValue: falsa },
			{ provide: EduConfirmationService, useValue: { confirm } },
		],
	});
	const fixture = TestBed.createComponent(MontosAnioComponent);
	fixture.componentRef.setInput('anio', 2027);
	await estabilizar(fixture);
	return { fixture, el: fixture.nativeElement as HTMLElement, api: falsa, confirm };
}

async function escribir(
	fixture: ComponentFixture<MontosAnioComponent>,
	id: string,
	texto: string,
): Promise<void> {
	const input = fixture.nativeElement.querySelector(`#${id}`) as HTMLInputElement | null;
	expect(input, `no existe #${id}`).toBeTruthy();
	if (!input) return;
	input.value = texto;
	input.dispatchEvent(new Event('input'));
	await estabilizar(fixture);
}

function boton(el: HTMLElement, testId: string): HTMLButtonElement | null {
	return el.querySelector<HTMLButtonElement>(`[data-testid="${testId}"] button`);
}

async function clic(fixture: ComponentFixture<MontosAnioComponent>, testId: string): Promise<void> {
	const encontrado = boton(fixture.nativeElement as HTMLElement, testId);
	expect(encontrado, `no existe ${testId}`).toBeTruthy();
	encontrado?.click();
	await estabilizar(fixture);
}

const valor = (el: HTMLElement, id: string): string | undefined =>
	el.querySelector<HTMLInputElement>(`#${id}`)?.value;

/** Da el foco al `<button>` interno, como al llegar con el teclado, y lo activa. */
async function enfocarYClic(
	fixture: ComponentFixture<MontosAnioComponent>,
	testId: string,
): Promise<void> {
	const encontrado = boton(fixture.nativeElement as HTMLElement, testId);
	expect(encontrado, `no existe ${testId}`).toBeTruthy();
	encontrado?.focus();
	encontrado?.click();
	await estabilizar(fixture);
}

/** `a` aparece antes que `b` en el documento. */
const vaAntes = (a: Element | null, b: Element | null): boolean =>
	!!a && !!b && (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0;
// #endregion

describe('MontosAnioComponent · grilla', () => {
	it('muestra un grupo por concepto con 4 montos etiquetados y lo que se cobra', async () => {
		const { el } = await crear();

		const grupos = Array.from(el.querySelectorAll('fieldset.concepto'));
		expect(grupos).toHaveLength(3);
		for (const grupo of grupos) expect(grupo.querySelectorAll('input')).toHaveLength(4);
		expect(grupos[1].querySelector('legend')?.textContent).toContain('Inscripción');
		expect(grupos[1].textContent).toContain('Solo alumnos nuevos');
		expect(el.querySelector('label[for="monto-3-Inicial"]')?.textContent?.trim()).toBe(
			'Inicial (S/)',
		);
		expect(valor(el, 'monto-1-todos')).toBe('320.00');
		const resultados = Array.from(el.querySelectorAll('.concepto__resultado')).map((p) =>
			p.textContent?.trim(),
		);
		expect(resultados[1]).toBe('Sin monto: este cargo no se generará.');
		expect(resultados[2]).toContain('Se cobra por cuota:');
	});

	it('un año sin montos lo avisa antes de la grilla', async () => {
		const sinMontos = conceptos().map((c) => ({ ...c, montos: [] }));
		const { el } = await crear({ configuracionAnio: () => of(config(sinMontos)) });

		expect(el.querySelector('.banner')?.textContent).toContain(
			'Este año todavía no tiene montos.',
		);
	});

	it('si la carga falla, lo dice y «Volver a cargar» lee de nuevo con el foco en el título', async () => {
		const configuracionAnio = vi
			.fn()
			.mockReturnValueOnce(throwError(() => ({ status: 500 })))
			.mockReturnValueOnce(of(config(conceptos())));
		const { fixture, el } = await crear({ configuracionAnio });

		expect(el.textContent).toContain('No se pudieron cargar los montos del año.');
		await enfocarYClic(fixture, 'recargar-montos');

		expect(configuracionAnio).toHaveBeenCalledTimes(2);
		expect(el.querySelectorAll('fieldset.concepto')).toHaveLength(3);
		// El botón desapareció con el foco puesto: el foco no cae al inicio de la página (WCAG 2.4.3).
		expect(document.activeElement?.id).toBe('montos-title');
	});

	it('«Volver a leer» confirma la base y deja el foco en el título', async () => {
		const configuracionAnio = vi
			.fn()
			.mockReturnValueOnce(of(config(conceptos())))
			.mockReturnValueOnce(throwError(() => ({ status: 0 })))
			.mockReturnValueOnce(of(config(conceptos())));
		const { fixture, el } = await crear({
			configuracionAnio,
			guardarMontosAnio: () => throwError(() => ({ status: 0 })),
		});
		await escribir(fixture, 'monto-3-Secundaria', '350');
		await clic(fixture, 'revisar-montos');
		await clic(fixture, 'guardar-montos');

		await enfocarYClic(fixture, 'volver-a-leer-montos');

		expect(configuracionAnio).toHaveBeenCalledTimes(3);
		expect(el.querySelector('[data-testid="volver-a-leer-montos"]')).toBeNull();
		expect(document.activeElement?.id).toBe('montos-title');
	});
});

describe('MontosAnioComponent · validación en línea', () => {
	it('un monto inválido marca el campo, explica el error y bloquea la revisión con el motivo', async () => {
		const { fixture, el } = await crear();

		await escribir(fixture, 'monto-2-todos', '0');

		const input = el.querySelector('#monto-2-todos');
		const ayuda = el.querySelector('#monto-2-todos-ayuda');
		expect(input?.getAttribute('aria-invalid')).toBe('true');
		expect(input?.getAttribute('aria-describedby')).toBe('monto-2-todos-ayuda');
		expect(ayuda?.textContent?.trim()).toBe('El monto debe ser mayor que S/ 0.00.');
		expect(ayuda?.classList.contains('campo__error')).toBe(true);
		expect(boton(el, 'revisar-montos')?.disabled).toBe(true);
		expect(el.querySelector('[data-testid="motivo-montos"]')?.textContent?.trim()).toBe(
			'Corrige el monto marcado para revisar los cambios.',
		);
	});

	it('un monto válido muestra su eco en soles', async () => {
		const { fixture, el } = await crear();

		await escribir(fixture, 'monto-2-todos', '320,50');

		const eco = el.querySelector('#monto-2-todos-ayuda');
		expect(eco?.textContent?.trim().startsWith('=')).toBe(true);
		expect(eco?.textContent).toContain('320.50');
		expect(eco?.classList.contains('campo__error')).toBe(false);
		expect(el.querySelector('#monto-2-todos')?.getAttribute('aria-invalid')).toBeNull();
		expect(boton(el, 'revisar-montos')?.disabled).toBe(false);
	});
});

describe('MontosAnioComponent · revisar y guardar', () => {
	it('«Revisar» reemplaza la grilla por el resumen y «Seguir editando» vuelve con lo escrito', async () => {
		const { fixture, el } = await crear();
		await escribir(fixture, 'monto-3-Secundaria', '350');

		await clic(fixture, 'revisar-montos');

		expect(el.querySelectorAll('input')).toHaveLength(0);
		expect(el.querySelector('#montos-revision-title')?.textContent).toContain(
			'Revisa los montos de 2027 antes de guardar',
		);
		expect(el.querySelectorAll('table.tabla tbody tr')).toHaveLength(1);
		expect(el.querySelector('table.tabla tbody')?.textContent).toContain('Secundaria');
		expect(document.activeElement?.id).toBe('montos-revision-title');

		await clic(fixture, 'seguir-editando-montos');

		expect(el.querySelector('table.tabla')).toBeNull();
		expect(valor(el, 'monto-3-Secundaria')).toBe('350');
	});

	it('«Guardar 1 monto» envía un solo PUT con la fila cambiada y confirma', async () => {
		const guardarMontosAnio = vi.fn((_payload: GuardarMontosAnioPayload) =>
			of(config(conceptos(350))),
		);
		const { fixture, el } = await crear({ guardarMontosAnio });
		await escribir(fixture, 'monto-3-Secundaria', '350');
		await clic(fixture, 'revisar-montos');

		expect(el.querySelector('[data-testid="guardar-montos"]')?.textContent).toContain(
			'Guardar 1 monto',
		);
		await clic(fixture, 'guardar-montos');

		expect(guardarMontosAnio).toHaveBeenCalledTimes(1);
		expect(guardarMontosAnio).toHaveBeenCalledWith({
			anio: 2027,
			montos: [{ conceptoId: 3, nivel: 'Secundaria', monto: 350, rowVersion: 'p3' }],
		});
		expect(el.textContent).toContain('Se guardó 1 monto.');
		expect(valor(el, 'monto-3-Secundaria')).toBe('350.00');
		expect(document.activeElement?.id).toBe('montos-title');
		// El resultado queda junto al título que recibe el foco, antes de la grilla.
		expect(vaAntes(el.querySelector('edu-message'), el.querySelector('.conceptos-montos'))).toBe(
			true,
		);
	});

	it('«Descartar cambios» pide confirmación y vuelve a lo guardado', async () => {
		const { fixture, el, confirm } = await crear();
		await escribir(fixture, 'monto-3-Secundaria', '350');

		await clic(fixture, 'descartar-montos');

		expect(confirm).toHaveBeenCalledWith(
			expect.objectContaining({
				header: 'Descartar cambios',
				acceptButtonSeverity: 'danger',
			}),
		);
		expect(valor(el, 'monto-3-Secundaria')).toBe('320.00');
		expect(el.querySelector('[data-testid="descartar-montos"]')).toBeNull();
	});
});
