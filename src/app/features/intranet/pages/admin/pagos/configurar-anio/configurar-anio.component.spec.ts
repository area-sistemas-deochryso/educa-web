import type { EnvironmentProviders, Provider, Signal, WritableSignal } from '@angular/core';
import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import {
	type ActivatedRouteSnapshot,
	Router,
	type RouterStateSnapshot,
	provideRouter,
} from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { NEVER, type Observable, of, throwError } from 'rxjs';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { pendingChangesGuard } from '@core/guards';
import type {
	ConceptoConMontos,
	ConfiguracionAnio,
	CuotaCronograma,
	EstudianteBusqueda,
	GenerarCargosPayload,
	GuardarCronogramaAnioPayload,
	GuardarMontosAnioPayload,
	GuardarParametroAnioPayload,
	ParametroAnio,
	ResultadoGeneracion,
	VistaPreviaGeneracion,
} from '@data/models';
import { EduConfirmationService } from '@edu-ui';
import {
	type UnsavedChangesPromptOptions,
	UnsavedChangesPromptService,
} from '@intranet-shared/services';
import { PagosShellComponent } from '../pagos-shell/pagos-shell.component';
import rutasPagos from '../pagos.routes';
import { PagosApiService } from '../services/pagos-api.service';
import { ConfigurarAnioComponent } from './configurar-anio.component';
import { CronogramaAnioFacade } from './cronograma-anio.facade';
import { etiquetaSugerida, fechaSugerida } from './cronograma-fechas.logic';
import { GenerarCargosFacade } from './generar-cargos.facade';
import { MontosAnioFacade } from './montos-anio.facade';
import { claveMonto } from './montos-anio.logic';
import { ParametrosAnioComponent } from './parametros-anio.component';
import { ParametrosAnioFacade } from './parametros-anio.facade';

// #region Datos
const ANIO = new Date().getFullYear();

const CONCEPTOS: ConceptoConMontos[] = [
	{
		conceptoId: 1,
		codigo: 'MATRICULA',
		nombre: 'Matricula',
		soloAlumnosNuevos: false,
		montos: [],
	},
	{
		conceptoId: 2,
		codigo: 'INSCRIPCION',
		nombre: 'Inscripcion',
		soloAlumnosNuevos: true,
		montos: [],
	},
	{ conceptoId: 3, codigo: 'PENSION', nombre: 'Pension', soloAlumnosNuevos: false, montos: [] },
];

/** Cada concepto con un monto para «Todos los niveles» (el `nivel` nulo no viaja en el JSON). */
const CONCEPTOS_COMPLETOS: ConceptoConMontos[] = CONCEPTOS.map((c) => ({
	...c,
	montos: [{ conceptoId: c.conceptoId, monto: 320, rowVersion: `m${c.conceptoId}` }],
}));

const CRONOGRAMA: CuotaCronograma[] = Array.from({ length: 10 }, (_, i) => ({
	numero: i + 1,
	etiqueta: etiquetaSugerida(i + 1),
	fechaVencimiento: `${fechaSugerida(ANIO, i + 1)}T00:00:00`,
	rowVersion: `c${i + 1}`,
}));

const PARAMETROS: ParametroAnio = {
	anio: ANIO,
	pagoMinimoPartes: 20,
	montoRecargo: 5,
	fechaInicial: null,
	rowVersion: 'p1',
};

const configuracion = (
	anio: number,
	conceptos = CONCEPTOS,
	cronograma: CuotaCronograma[] = [],
): ConfiguracionAnio => ({ anio, conceptos, cronograma });

const sinFila = () =>
	throwError(() => ({ status: 404, error: { errorCode: 'PAGO_PARAMETRO_ANIO_INEXISTENTE' } }));

interface ApiFalsa {
	parametrosAnio: (anio: number) => Observable<ParametroAnio>;
	guardarParametrosAnio: (payload: GuardarParametroAnioPayload) => Observable<ParametroAnio>;
	configuracionAnio: (anio: number) => Observable<ConfiguracionAnio>;
	guardarMontosAnio: (payload: GuardarMontosAnioPayload) => Observable<ConfiguracionAnio>;
	guardarCronogramaAnio: (payload: GuardarCronogramaAnioPayload) => Observable<ConfiguracionAnio>;
	vistaPreviaGeneracion: (payload: GenerarCargosPayload) => Observable<VistaPreviaGeneracion>;
	generarCargos: (
		payload: GenerarCargosPayload,
		esperados: number,
	) => Observable<ResultadoGeneracion>;
	buscarEstudiantes: (texto: string) => Observable<EstudianteBusqueda[]>;
}

/** Lo que usa la plantilla es `protected`: el spec lo lee o lo dispara como ella. */
interface Pantalla {
	anio: Signal<number>;
	anioSelector: Signal<number>;
	cambiarAnio(nuevo: number): void;
}

/** Los campos del formulario de parámetros son `protected`: el spec los escribe como su plantilla. */
interface FormularioParametros {
	pagoMinimoPartes: WritableSignal<number | null>;
}

interface Opciones {
	api?: Partial<ApiFalsa>;
	/** Lo que elige la persona en el aviso de cambios sin guardar: `true` = «Salir sin guardar». */
	salir?: boolean;
}
// #endregion

// #region Helpers
async function estabilizar(fixture: ComponentFixture<ConfigurarAnioComponent>): Promise<void> {
	fixture.detectChanges();
	await fixture.whenStable();
	fixture.detectChanges();
}

/** API simulada, facades reales y el aviso de cambios sin guardar simulado (lo que elige la persona). */
function configurar(
	{ api: cambios = {}, salir = false }: Opciones,
	providers: (Provider | EnvironmentProviders)[] = [],
) {
	const api: ApiFalsa = {
		parametrosAnio: vi.fn(() => sinFila()),
		guardarParametrosAnio: vi.fn(() => NEVER),
		configuracionAnio: vi.fn((anio: number) => of(configuracion(anio))),
		guardarMontosAnio: vi.fn(() => NEVER),
		guardarCronogramaAnio: vi.fn(() => NEVER),
		vistaPreviaGeneracion: vi.fn(() => NEVER),
		generarCargos: vi.fn(() => NEVER),
		buscarEstudiantes: vi.fn(() => of([])),
		...cambios,
	};
	const confirmProceed = vi.fn((_opciones: UnsavedChangesPromptOptions) =>
		Promise.resolve(salir),
	);
	TestBed.configureTestingModule({
		imports: [ConfigurarAnioComponent],
		providers: [{ provide: PagosApiService, useValue: api }, ...providers],
	});
	TestBed.overrideComponent(ConfigurarAnioComponent, {
		set: {
			providers: [
				ParametrosAnioFacade,
				MontosAnioFacade,
				CronogramaAnioFacade,
				GenerarCargosFacade,
				EduConfirmationService,
				{ provide: UnsavedChangesPromptService, useValue: { confirmProceed } },
			],
		},
	});
	return { api, confirmProceed };
}

async function crear(opciones: Opciones = {}) {
	const { api, confirmProceed } = configurar(opciones);
	const fixture = TestBed.createComponent(ConfigurarAnioComponent);
	await estabilizar(fixture);
	return {
		fixture,
		api,
		confirmProceed,
		el: fixture.nativeElement as HTMLElement,
		componente: fixture.componentInstance,
		pantalla: fixture.componentInstance as unknown as Pantalla,
		montos: fixture.debugElement.injector.get(MontosAnioFacade),
	};
}

/** Un año con parámetros, todos los montos y las 10 cuotas guardados. */
const API_COMPLETA: Partial<ApiFalsa> = {
	parametrosAnio: () => of(PARAMETROS),
	configuracionAnio: (anio: number) => of(configuracion(anio, CONCEPTOS_COMPLETOS, CRONOGRAMA)),
};

async function escribirMonto(
	fixture: ComponentFixture<ConfigurarAnioComponent>,
	montos: MontosAnioFacade,
): Promise<void> {
	montos.editar(claveMonto(1, null), '330');
	await estabilizar(fixture);
}

/** Elige un año en el `edu-select` como la persona: abre la lista (vive en `<body>`) y hace clic en la opción. */
async function elegirAnio(
	fixture: ComponentFixture<ConfigurarAnioComponent>,
	anio: number,
): Promise<void> {
	const el = fixture.nativeElement as HTMLElement;
	el.querySelector<HTMLElement>('edu-select .edu-select')?.click();
	await estabilizar(fixture);
	const opcion = Array.from(
		document.querySelectorAll<HTMLElement>('.edu-select-panel__option'),
	).find((o) => o.textContent?.trim() === String(anio));
	expect(opcion, `no existe la opción ${anio}`).toBeTruthy();
	opcion?.click();
	await estabilizar(fixture);
	// El aviso de cambios sin guardar resuelve una promesa: se deja correr su `then` y se vuelve a pintar.
	await Promise.resolve();
	await estabilizar(fixture);
}

const texto = (el: HTMLElement, selector: string): string =>
	el.querySelector(selector)?.textContent?.replace(/\s+/g, ' ').trim() ?? '';

const anioMostrado = (el: HTMLElement): string => texto(el, 'edu-select .edu-select__label');

const pidioElAnio = (fn: (anio: number) => unknown, anio: number): boolean =>
	vi.mocked(fn).mock.calls.some(([pedido]) => pedido === anio);

function dispararBeforeUnload(): Event {
	const evento = new Event('beforeunload', { cancelable: true });
	window.dispatchEvent(evento);
	return evento;
}
// #endregion

describe('ConfigurarAnioComponent · cambiar de año', () => {
	it('sin cambios, cambia sin preguntar y lee el año nuevo en las cuatro secciones', async () => {
		const { fixture, api, confirmProceed, el, pantalla } = await crear();

		await elegirAnio(fixture, ANIO + 1);

		expect(confirmProceed).not.toHaveBeenCalled();
		expect(pantalla.anio()).toBe(ANIO + 1);
		expect(anioMostrado(el)).toBe(String(ANIO + 1));
		expect(api.parametrosAnio).toHaveBeenLastCalledWith(ANIO + 1);
		expect(
			vi.mocked(api.configuracionAnio).mock.calls.filter(([a]) => a === ANIO + 1),
		).toHaveLength(2);
		expect(texto(el, '#montos-title')).toBe(`2. Montos del año ${ANIO + 1}`);
	});

	it('con un monto escrito pregunta sin «Guardar y salir»; con «Quedarme» el selector vuelve y no se lee el otro año', async () => {
		const { fixture, api, confirmProceed, el, pantalla, montos } = await crear();
		await escribirMonto(fixture, montos);

		await elegirAnio(fixture, ANIO + 1);

		expect(confirmProceed).toHaveBeenCalledTimes(1);
		expect(confirmProceed).toHaveBeenCalledWith(
			expect.objectContaining({
				canSave: false,
				message: `Tienes cambios sin guardar en los montos de ${ANIO}. Si continúas, se pierden.`,
			}),
		);
		expect(pantalla.anio()).toBe(ANIO);
		expect(pantalla.anioSelector()).toBe(ANIO);
		expect(anioMostrado(el)).toBe(String(ANIO));
		expect(pidioElAnio(api.configuracionAnio, ANIO + 1)).toBe(false);
		expect(pidioElAnio(api.parametrosAnio, ANIO + 1)).toBe(false);
		expect(montos.hayCambios()).toBe(true);
	});

	it('con «Salir sin guardar» cambia de año y lo escrito se pierde', async () => {
		const { fixture, api, el, pantalla, montos } = await crear({ salir: true });
		await escribirMonto(fixture, montos);

		await elegirAnio(fixture, ANIO + 1);

		expect(pantalla.anio()).toBe(ANIO + 1);
		expect(anioMostrado(el)).toBe(String(ANIO + 1));
		expect(pidioElAnio(api.configuracionAnio, ANIO + 1)).toBe(true);
		expect(montos.hayCambios()).toBe(false);
	});

	it('mientras se guarda, el selector de año queda deshabilitado y lo explica', async () => {
		const { fixture, el, montos } = await crear();
		await escribirMonto(fixture, montos);
		expect(el.querySelector('[data-testid="anio-ocupado"]')).toBeNull();

		expect(montos.revisar()).toBe(true);
		montos.guardar();
		await estabilizar(fixture);

		expect(el.querySelector('edu-select .edu-select')?.classList).toContain(
			'edu-select--disabled',
		);
		expect(texto(el, '[data-testid="anio-ocupado"]')).toBe(
			'Espera a que termine la operación en curso para cambiar de año.',
		);
	});
});

describe('ConfigurarAnioComponent · guía de pasos', () => {
	it('en un año vacío guía desde el paso 1 y bloquea «Generar» por los parámetros', async () => {
		const { el } = await crear();

		expect(el.querySelector('nav.guia')?.getAttribute('aria-label')).toBe(
			`Pasos para configurar el año ${ANIO}`,
		);
		expect(texto(el, '[data-testid="guia-sin-configurar"]')).toBe(
			`El año ${ANIO} todavía no está configurado: sigue los pasos en orden. Generar exige los parámetros; sin montos o sin cronograma, esos cargos se omiten.`,
		);
		const actuales = Array.from(el.querySelectorAll('[aria-current="step"]')).map((b) =>
			b.getAttribute('data-testid'),
		);
		expect(actuales).toEqual(['paso-1']);
		expect(texto(el, '[data-testid="paso-4"]')).toContain('Bloqueado');
		expect(texto(el, '[data-testid="motivo-bloqueo"]')).toBe(
			'Primero guarda los parámetros del año (paso 1): sin ellos no se pueden generar cargos.',
		);
		expect(el.querySelector('[data-testid="avisos-generacion"]')).toBeNull();
	});

	it('con todo guardado, el paso 4 es el que sigue y «Generar» se puede usar', async () => {
		const { el } = await crear({ api: API_COMPLETA });

		expect(el.querySelector('[data-testid="guia-sin-configurar"]')).toBeNull();
		expect(el.querySelector('[data-testid="paso-4"]')?.getAttribute('aria-current')).toBe(
			'step',
		);
		expect(texto(el, '[data-testid="paso-4"]')).toContain('Disponible');
		for (const n of [1, 2, 3])
			expect(texto(el, `[data-testid="paso-${n}"]`)).toContain('Listo');
		expect(el.querySelector('[data-testid="motivo-bloqueo"]')).toBeNull();
		expect(
			el.querySelector<HTMLButtonElement>('edu-button[label="Calcular vista previa"] button')
				?.disabled,
		).toBe(false);
	});

	it('si los parámetros no se pudieron leer, el paso 1 dice «Error» y «Generar» explica por qué espera', async () => {
		const { el } = await crear({
			api: { parametrosAnio: () => throwError(() => ({ status: 500 })) },
		});

		expect(texto(el, '[data-testid="paso-1"]')).toContain('Error');
		expect(texto(el, '[data-testid="motivo-bloqueo"]')).toBe(
			'No se pudieron leer los parámetros del año (paso 1). Vuelve a cargarlos: sin ellos no se pueden generar cargos.',
		);
		expect(el.querySelector('[data-testid="guia-sin-configurar"]')).toBeNull();
	});

	it('un parámetro editado cuenta como cambio sin guardar y bloquea «Generar»', async () => {
		const { fixture, el, componente } = await crear({ api: API_COMPLETA });
		const formulario = fixture.debugElement.query(By.directive(ParametrosAnioComponent))
			.componentInstance as FormularioParametros;

		formulario.pagoMinimoPartes.set(25);
		await estabilizar(fixture);

		expect(componente.hasPendingChanges()).toBe(true);
		expect(texto(el, '[data-testid="paso-1"]')).toContain('Sin guardar');
		expect(el.querySelector('[data-testid="paso-1"]')?.getAttribute('aria-current')).toBe(
			'step',
		);
		// Parámetros no tiene «Descartar cambios»: el motivo solo pide guardarlos.
		expect(texto(el, '[data-testid="motivo-bloqueo"]')).toBe(
			'Tienes cambios sin guardar en los parámetros. Guárdalos antes de generar: los cargos se crean con lo guardado.',
		);
	});

	describe('ir a una sección', () => {
		const scrollOriginal = Element.prototype.scrollIntoView;
		const matchMediaOriginal = window.matchMedia;

		afterEach(() => {
			Element.prototype.scrollIntoView = scrollOriginal;
			window.matchMedia = matchMediaOriginal;
		});

		it('un clic en un paso trae su sección a la vista y le da el foco al título', async () => {
			const scrollIntoView = vi.fn();
			Element.prototype.scrollIntoView = scrollIntoView;
			const { el } = await crear();

			el.querySelector<HTMLButtonElement>('[data-testid="paso-2"]')?.click();

			expect(scrollIntoView).toHaveBeenCalledExactlyOnceWith({
				block: 'center',
				behavior: 'smooth',
			});
			expect(document.activeElement?.id).toBe('montos-title');
		});

		it('si la persona pidió reducir el movimiento, el salto no se anima', async () => {
			const scrollIntoView = vi.fn();
			Element.prototype.scrollIntoView = scrollIntoView;
			window.matchMedia = vi.fn((consulta: string) => ({
				...matchMediaOriginal(consulta),
				matches: consulta === '(prefers-reduced-motion: reduce)',
			}));
			const { el } = await crear();

			el.querySelector<HTMLButtonElement>('[data-testid="paso-3"]')?.click();

			expect(scrollIntoView).toHaveBeenCalledExactlyOnceWith({
				block: 'center',
				behavior: 'auto',
			});
			expect(document.activeElement?.id).toBe('cronograma-title');
		});
	});
});

describe('ConfigurarAnioComponent · salir con cambios sin guardar', () => {
	it('al cerrar o recargar la pestaña, el navegador pregunta solo si hay cambios', async () => {
		const { fixture, montos } = await crear();
		expect(dispararBeforeUnload().defaultPrevented).toBe(false);

		await escribirMonto(fixture, montos);

		expect(dispararBeforeUnload().defaultPrevented).toBe(true);
	});

	it('la ruta usa el guard de cambios sin guardar y este pregunta con el mismo aviso', async () => {
		const { fixture, componente, confirmProceed, montos } = await crear();
		const salir = () =>
			TestBed.runInInjectionContext(() =>
				pendingChangesGuard(
					componente,
					{} as ActivatedRouteSnapshot,
					{} as RouterStateSnapshot,
					{} as RouterStateSnapshot,
				),
			);
		const ruta = rutasPagos.find((r) => r.path === 'configurar-anio');
		expect(ruta?.canDeactivate).toEqual([pendingChangesGuard]);

		expect(salir()).toBe(true);
		expect(confirmProceed).not.toHaveBeenCalled();

		await escribirMonto(fixture, montos);

		await expect(salir()).resolves.toBe(false);
		expect(confirmProceed).toHaveBeenCalledWith(
			expect.objectContaining({
				canSave: false,
				message: `Tienes cambios sin guardar en los montos de ${ANIO}. Si continúas, se pierden.`,
			}),
		);
	});

	it('con cambios, otra pestaña de Pagos pregunta; con «Quedarme» no sale y la pestaña marcada vuelve', async () => {
		const { confirmProceed } = configurar({}, [
			provideRouter([
				{ path: 'pagos', component: PagosShellComponent, children: rutasPagos },
			]),
		]);
		// Como el diálogo real: la persona responde después de verlo, no en el mismo instante.
		let responder: (seguir: boolean) => void = () => undefined;
		confirmProceed.mockImplementation(() => new Promise<boolean>((r) => (responder = r)));
		const harness = await RouterTestingHarness.create('/pagos/configurar-anio');
		const router = TestBed.inject(Router);
		const raiz = harness.fixture.nativeElement as HTMLElement;
		const marcada = () => raiz.querySelector('.edu-tab--active')?.textContent?.trim();
		const pantalla = harness.fixture.debugElement.query(By.directive(ConfigurarAnioComponent));
		expect(pantalla, 'no se cargó «Configurar año»').toBeTruthy();
		expect(marcada()).toBe('Configurar año');

		pantalla.injector.get(MontosAnioFacade).editar(claveMonto(1, null), '330');
		harness.detectChanges();
		Array.from(raiz.querySelectorAll<HTMLButtonElement>('edu-tab button'))
			.find((b) => b.textContent?.trim() === 'Panel de cobranza')
			?.click();

		await vi.waitFor(() => expect(confirmProceed).toHaveBeenCalledTimes(1));
		harness.detectChanges();
		expect(marcada()).toBe('Panel de cobranza');

		responder(false);

		await vi.waitFor(() => {
			harness.detectChanges();
			expect(marcada()).toBe('Configurar año');
		});
		expect(router.url).toBe('/pagos/configurar-anio');
		expect(confirmProceed).toHaveBeenCalledWith(expect.objectContaining({ canSave: false }));
		expect(raiz.querySelector('app-configurar-anio')).not.toBeNull();
	});
});
