import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { type Observable, of, throwError } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import type {
	ConfiguracionAnio,
	CuotaCronograma,
	GuardarCronogramaAnioPayload,
} from '@data/models';
import { type EduConfirmation, EduConfirmationService } from '@edu-ui';
import { PagosApiService } from '../services/pagos-api.service';
import { CronogramaAnioComponent } from './cronograma-anio.component';
import { CronogramaAnioFacade } from './cronograma-anio.facade';
import { etiquetaSugerida, fechaSugerida } from './cronograma-fechas.logic';

const NUMEROS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

const cronograma2027: CuotaCronograma[] = NUMEROS.map((n) => ({
	numero: n,
	etiqueta: etiquetaSugerida(n),
	fechaVencimiento: `${fechaSugerida(2027, n)}T00:00:00`,
	rowVersion: `v${n}`,
}));

const configuracion = (cuotas: CuotaCronograma[]): ConfiguracionAnio => ({
	anio: 2027,
	conceptos: [],
	cronograma: cuotas,
});

interface ApiFalsa {
	configuracionAnio: (anio: number) => Observable<ConfiguracionAnio>;
	guardarCronogramaAnio: (payload: GuardarCronogramaAnioPayload) => Observable<ConfiguracionAnio>;
}

async function estable(fixture: ComponentFixture<unknown>): Promise<void> {
	fixture.detectChanges();
	await fixture.whenStable();
	fixture.detectChanges();
}

async function crear(cuotas: CuotaCronograma[] = [], api: Partial<ApiFalsa> = {}) {
	const guardarCronogramaAnio = vi.fn((_payload: GuardarCronogramaAnioPayload) =>
		of(configuracion(cronograma2027)),
	);
	const confirm = vi.fn((opciones: EduConfirmation) => opciones.accept?.());
	TestBed.configureTestingModule({
		imports: [CronogramaAnioComponent],
		providers: [
			CronogramaAnioFacade,
			{
				provide: PagosApiService,
				useValue: {
					configuracionAnio: () => of(configuracion(cuotas)),
					guardarCronogramaAnio,
					...api,
				},
			},
			{ provide: EduConfirmationService, useValue: { confirm } },
		],
	});
	const fixture = TestBed.createComponent(CronogramaAnioComponent);
	fixture.componentRef.setInput('anio', 2027);
	await estable(fixture);
	return { fixture, guardarCronogramaAnio, confirm, el: fixture.nativeElement as HTMLElement };
}

function clic(el: HTMLElement, testid: string): void {
	const host = el.querySelector<HTMLElement>(`[data-testid="${testid}"]`);
	expect(host, `no existe ${testid}`).toBeTruthy();
	host?.click();
}

function escribir(el: HTMLElement, id: string, valor: string): void {
	const input = el.querySelector<HTMLInputElement>(`#${id}`);
	expect(input, `no existe #${id}`).toBeTruthy();
	if (!input) return;
	input.value = valor;
	input.dispatchEvent(new Event('input'));
}

const deshabilitado = (el: HTMLElement, testid: string): boolean | undefined =>
	el.querySelector<HTMLButtonElement>(`[data-testid="${testid}"] button`)?.disabled;

const texto = (el: HTMLElement, selector: string): string =>
	el.querySelector(selector)?.textContent?.trim() ?? '';

/** Da el foco al `<button>` interno, como al llegar con el teclado, y lo activa. */
function enfocarYClic(el: HTMLElement, testid: string): void {
	const boton = el.querySelector<HTMLButtonElement>(`[data-testid="${testid}"] button`);
	expect(boton, `no existe ${testid}`).toBeTruthy();
	boton?.focus();
	boton?.click();
}

/** `a` aparece antes que `b` en el documento. */
const vaAntes = (a: Element | null, b: Element | null): boolean =>
	!!a && !!b && (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0;

describe('CronogramaAnioComponent', () => {
	it('en un año vacío muestra el banner y «Proponer fechas habituales» llena las 10 fechas con su día (U4, C11)', async () => {
		const { fixture, el } = await crear();

		expect(texto(el, '.banner')).toContain('Este año todavía no tiene cronograma');
		expect(el.querySelectorAll('li.cuota')).toHaveLength(10);
		expect(deshabilitado(el, 'revisar-cronograma')).toBe(true);
		expect(texto(el, '[data-testid="motivo-cronograma"]')).toBe(
			'Faltan las fechas de las 10 cuotas: escríbelas o usa «Proponer fechas habituales».',
		);

		clic(el, 'proponer-fechas');
		await estable(fixture);

		const fechas = Array.from(el.querySelectorAll<HTMLInputElement>('input[type="date"]')).map(
			(i) => i.value,
		);
		expect(fechas).toEqual(NUMEROS.map((n) => fechaSugerida(2027, n)));
		expect(texto(el, '#cuota-1-dia')).toBe('miércoles 31/03/2027');
		expect(texto(el, '#cuota-6-dia')).toBe('viernes 13/08/2027');
		expect(el.querySelector('[data-testid="proponer-fechas"]')).toBeNull();
		expect(deshabilitado(el, 'revisar-cronograma')).toBe(false);
		expect(document.activeElement?.id).toBe('cuota-1-fecha');
	});

	it('un empate marca la cuota afectada con aria-invalid y su error enlazado', async () => {
		const { fixture, el } = await crear(cronograma2027);

		escribir(el, 'cuota-2-fecha', '2027-03-31');
		await estable(fixture);

		const cuota2 = el.querySelector('#cuota-2-fecha');
		expect(cuota2?.getAttribute('aria-invalid')).toBe('true');
		expect(cuota2?.getAttribute('aria-describedby')).toBe('cuota-2-dia cuota-2-error-fecha');
		expect(texto(el, '#cuota-2-error-fecha')).toBe(
			'Vence el mismo día que la cuota 1: cada cuota debe vencer después de la anterior.',
		);
		expect(el.querySelector('#cuota-1-fecha')?.hasAttribute('aria-invalid')).toBe(false);
		expect(deshabilitado(el, 'revisar-cronograma')).toBe(true);
		expect(texto(el, '[data-testid="motivo-cronograma"]')).toBe(
			'Corrige la cuota marcada para revisar los cambios.',
		);
	});

	it('una etiqueta vacía marca el campo y explica la regla (C15)', async () => {
		const { fixture, el } = await crear(cronograma2027);

		escribir(el, 'cuota-2-etiqueta', '  ');
		await estable(fixture);

		const etiqueta = el.querySelector('#cuota-2-etiqueta');
		expect(etiqueta?.getAttribute('aria-invalid')).toBe('true');
		expect(etiqueta?.getAttribute('aria-describedby')).toBe('cuota-2-error-etiqueta');
		expect(texto(el, '#cuota-2-error-etiqueta')).toBe(
			'Cada cuota necesita una etiqueta, por ejemplo «Marzo».',
		);
		expect(texto(el, '[data-testid="motivo-cronograma"]')).toBe(
			'Falta la etiqueta de la cuota 2.',
		);
	});

	it('la revisión lista las 10 cuotas y «Guardar las 10 cuotas» hace un solo PUT', async () => {
		const { fixture, el, guardarCronogramaAnio } = await crear();
		clic(el, 'proponer-fechas');
		await estable(fixture);

		clic(el, 'revisar-cronograma');
		await estable(fixture);

		expect(el.querySelectorAll('.revision tbody tr')).toHaveLength(10);
		expect(el.querySelector('input')).toBeNull();
		expect(document.activeElement?.id).toBe('cronograma-revision-title');
		expect(texto(el, '[data-testid="guardar-cronograma"]')).toBe('Guardar las 10 cuotas');

		clic(el, 'guardar-cronograma');
		await estable(fixture);

		expect(guardarCronogramaAnio).toHaveBeenCalledTimes(1);
		expect(guardarCronogramaAnio.mock.calls[0][0].cuotas).toHaveLength(10);
		expect(el.textContent).toContain('Se guardó el cronograma de 2027: 10 cuotas.');
		expect(el.querySelector('.banner')).toBeNull();
		// El botón de guardar desapareció con el foco: vuelve al título, y el resultado queda junto a él.
		expect(document.activeElement?.id).toBe('cronograma-title');
		expect(vaAntes(el.querySelector('edu-message'), el.querySelector('ol.cuotas'))).toBe(true);
	});

	it('si guardar falla, vuelve al editor con el foco en el título y el motivo arriba de las cuotas', async () => {
		const { fixture, el } = await crear(cronograma2027, {
			guardarCronogramaAnio: () =>
				throwError(() => ({
					status: 400,
					error: { errorCode: 'PAGO_CRONOGRAMA_FUERA_DE_ORDEN' },
				})),
		});
		escribir(el, 'cuota-1-fecha', '2027-03-30');
		await estable(fixture);
		clic(el, 'revisar-cronograma');
		await estable(fixture);

		enfocarYClic(el, 'guardar-cronograma');
		await estable(fixture);

		expect(el.querySelector('.revision')).toBeNull();
		expect(document.activeElement?.id).toBe('cronograma-title');
		const mensaje = el.querySelector('edu-message');
		expect(mensaje?.textContent).toContain('Cada cuota debe vencer después de la anterior');
		expect(vaAntes(mensaje, el.querySelector('ol.cuotas'))).toBe(true);
	});

	it('al editar, la revisión muestra solo lo que cambia y «Seguir editando» vuelve con lo escrito', async () => {
		const { fixture, el } = await crear(cronograma2027);
		escribir(el, 'cuota-1-fecha', '2027-03-30');
		await estable(fixture);

		clic(el, 'revisar-cronograma');
		await estable(fixture);

		expect(el.querySelectorAll('.revision tbody tr')).toHaveLength(1);
		expect(el.querySelectorAll('.revision thead th')).toHaveLength(5);
		expect(texto(el, '.revision tbody tr')).toContain('Se adelanta 1 día');
		expect(texto(el, '.revision')).toContain('Las otras 9 cuotas no cambian.');

		clic(el, 'seguir-editando-cronograma');
		await estable(fixture);

		expect(el.querySelector<HTMLInputElement>('#cuota-1-fecha')?.value).toBe('2027-03-30');
		expect(document.activeElement?.id).toBe('cronograma-title');
	});

	it('«Descartar cambios» pide confirmación, vuelve a lo guardado y deja el foco en el título', async () => {
		const { fixture, el, confirm } = await crear(cronograma2027);
		escribir(el, 'cuota-1-etiqueta', 'Marzo 2027');
		await estable(fixture);

		enfocarYClic(el, 'descartar-cronograma');
		await estable(fixture);

		expect(confirm).toHaveBeenCalledWith(
			expect.objectContaining({
				header: 'Descartar cambios',
				acceptButtonSeverity: 'danger',
			}),
		);
		expect(el.querySelector<HTMLInputElement>('#cuota-1-etiqueta')?.value).toBe('Marzo');
		expect(el.querySelector('[data-testid="descartar-cronograma"]')).toBeNull();
		expect(document.activeElement?.id).toBe('cronograma-title');
	});

	it('las etiquetas y las fechas se anuncian como obligatorias, sin el validador `required`', async () => {
		const { el } = await crear(cronograma2027);

		const campos = Array.from(el.querySelectorAll('li.cuota input'));
		expect(campos).toHaveLength(20);
		for (const campo of campos) expect(campo.getAttribute('aria-required')).toBe('true');
		// `required` activaría el validador de forms y pintaría de rojo una fecha vacía ya tocada.
		expect(el.querySelector('li.cuota input[required]')).toBeNull();
	});
});

describe('CronogramaAnioComponent · foco al volver a cargar o a leer (WCAG 2.4.3)', () => {
	it('«Volver a cargar» lee de nuevo y deja el foco en el título', async () => {
		const configuracionAnio = vi
			.fn()
			.mockReturnValueOnce(throwError(() => ({ status: 500 })))
			.mockReturnValueOnce(of(configuracion(cronograma2027)));
		const { fixture, el } = await crear([], { configuracionAnio });
		expect(texto(el, 'edu-message')).toContain('No se pudo cargar el cronograma del año.');

		enfocarYClic(el, 'recargar-cronograma');
		await estable(fixture);

		expect(configuracionAnio).toHaveBeenCalledTimes(2);
		expect(el.querySelectorAll('li.cuota')).toHaveLength(10);
		expect(document.activeElement?.id).toBe('cronograma-title');
	});

	it('«Volver a leer» confirma la base y deja el foco en el título', async () => {
		const configuracionAnio = vi
			.fn()
			.mockReturnValueOnce(of(configuracion(cronograma2027)))
			.mockReturnValueOnce(throwError(() => ({ status: 0 })))
			.mockReturnValueOnce(of(configuracion(cronograma2027)));
		const { fixture, el } = await crear([], {
			configuracionAnio,
			guardarCronogramaAnio: () => throwError(() => ({ status: 0 })),
		});
		escribir(el, 'cuota-1-fecha', '2027-03-30');
		await estable(fixture);
		clic(el, 'revisar-cronograma');
		await estable(fixture);
		clic(el, 'guardar-cronograma');
		await estable(fixture);

		enfocarYClic(el, 'volver-a-leer-cronograma');
		await estable(fixture);

		expect(configuracionAnio).toHaveBeenCalledTimes(3);
		expect(el.querySelector('[data-testid="volver-a-leer-cronograma"]')).toBeNull();
		expect(document.activeElement?.id).toBe('cronograma-title');
	});
});
