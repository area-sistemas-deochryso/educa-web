// #region Imports
import { DOCUMENT } from '@angular/common';
import {
	ChangeDetectionStrategy,
	Component,
	HostListener,
	computed,
	effect,
	inject,
	signal,
	untracked,
	viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';

import type { HasPendingChanges } from '@core/guards';
import {
	type EduPassThrough,
	EduConfirmDialog,
	EduConfirmationService,
	EduSelect,
	EduTag,
} from '@edu-ui';
import { UnsavedChangesPromptService } from '@intranet-shared/services';
import { opcionesAnio } from '../utils/carga-inicial.logic';
import {
	type EntradaPasos,
	type EstadoCronogramaGuardado,
	type EstadoMontosGuardados,
	anioSinConfigurar,
	armarPasos,
	avisosGeneracion,
	bloqueoGeneracion,
	mensajeCambiosSinGuardar,
	seccionesSinGuardar,
	textoAnioSinConfigurar,
} from './configurar-anio.logic';
import { CronogramaAnioComponent } from './cronograma-anio.component';
import { CronogramaAnioFacade } from './cronograma-anio.facade';
import { GenerarCargosComponent } from './generar-cargos.component';
import { GenerarCargosFacade } from './generar-cargos.facade';
import { MontosAnioComponent } from './montos-anio.component';
import { MontosAnioFacade } from './montos-anio.facade';
import { ParametrosAnioComponent } from './parametros-anio.component';
import { ParametrosAnioFacade } from './parametros-anio.facade';
// #endregion

/**
 * «Configurar año»: el arranque de un año de cobranza en cuatro pasos que comparten el selector de año
 * (P119 F6b + P123 F3): parámetros → montos por concepto y nivel → cronograma de 10 cuotas → generar cargos.
 * Arriba, una guía de pasos que dice en qué estado está cada uno, cuál sigue y por qué «Generar» todavía no se puede usar.
 * - Combina las secciones: cada una tiene su facade, y solo esta pantalla los lee juntos (un facade no importa otro).
 * - Es dueña del aviso por cambios sin guardar (`HasPendingChanges`): lo usan el selector de año, el guard de la ruta
 *   (`pendingChangesGuard`) y `beforeunload`. No ofrece «Guardar y salir»: guardar desde afuera se saltaría la revisión
 *   de cada sección (INV-S05: lo que viaja es lo que la persona confirmó).
 */
@Component({
	selector: 'app-configurar-anio',
	standalone: true,
	imports: [
		FormsModule,
		EduSelect,
		EduTag,
		EduConfirmDialog,
		ParametrosAnioComponent,
		MontosAnioComponent,
		CronogramaAnioComponent,
		GenerarCargosComponent,
	],
	providers: [
		ParametrosAnioFacade,
		MontosAnioFacade,
		CronogramaAnioFacade,
		GenerarCargosFacade,
		EduConfirmationService,
		UnsavedChangesPromptService,
	],
	templateUrl: './configurar-anio.component.html',
	styleUrl: './configurar-anio.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConfigurarAnioComponent implements HasPendingChanges {
	// #region Dependencias
	private readonly parametros = inject(ParametrosAnioFacade);
	private readonly montos = inject(MontosAnioFacade);
	private readonly cronograma = inject(CronogramaAnioFacade);
	private readonly generar = inject(GenerarCargosFacade);
	private readonly aviso = inject(UnsavedChangesPromptService);
	private readonly document = inject(DOCUMENT);
	/** Sin `.required`: la guía lo lee antes de que exista la vista hija. */
	private readonly seccionParametros = viewChild(ParametrosAnioComponent);
	// #endregion

	// #region Año
	protected readonly anios = opcionesAnio(new Date());
	protected readonly anio = signal(new Date().getFullYear());
	/** Lo que muestra el selector: se adelanta al año vigente mientras se pregunta y vuelve si la persona se queda. */
	protected readonly anioSelector = signal(this.anio());
	protected readonly ptAnio: EduPassThrough = { root: { 'aria-label': 'Año a configurar' } };
	// #endregion

	// #region Estado de las secciones
	/**
	 * Solo con la sección leída: antes no hay formulario que editar, y en la primera pasada la guía (que va antes en la
	 * plantilla) llegaría a la sección hija sin su año todavía asignado (NG0950).
	 */
	private readonly parametrosEditados = computed(
		() =>
			this.parametros.estado() === 'lista' &&
			(this.seccionParametros()?.hayCambios() ?? false),
	);
	protected readonly sinGuardar = computed(() =>
		seccionesSinGuardar({
			parametros: this.parametrosEditados(),
			montos: this.montos.hayCambios(),
			cronograma: this.cronograma.hayCambios(),
		}),
	);
	protected readonly ocupado = computed(
		() =>
			this.parametros.guardando() ||
			this.montos.ocupado() ||
			this.cronograma.ocupado() ||
			this.generar.calculando() ||
			this.generar.generando(),
	);
	private readonly bloqueo = computed(() =>
		bloqueoGeneracion({
			cargando:
				this.parametros.estado() === 'cargando' ||
				this.montos.estado() === 'cargando' ||
				this.cronograma.estado() === 'cargando',
			errorParametros: this.parametros.estado() === 'error',
			hayParametros: this.parametros.parametros() !== null,
			sinGuardar: this.sinGuardar(),
		}),
	);
	private readonly montosGuardados = computed<EstadoMontosGuardados>(() => ({
		estado: this.montos.estado(),
		cobertura: this.montos.cobertura(),
	}));
	private readonly cronogramaGuardado = computed<EstadoCronogramaGuardado>(() => ({
		estado: this.cronograma.estado(),
		cuotasGuardadas: this.cronograma.cuotas().length,
	}));
	private readonly entrada = computed<EntradaPasos>(() => ({
		parametros: {
			estado: this.parametros.estado(),
			guardados: this.parametros.parametros() !== null,
		},
		montos: this.montosGuardados(),
		cronograma: this.cronogramaGuardado(),
		sinGuardar: this.sinGuardar(),
		bloqueo: this.bloqueo(),
		cargosCreados: this.generar.resultado()?.creados ?? null,
	}));
	// #endregion

	// #region Vista
	protected readonly textoBloqueo = computed(() => this.bloqueo()?.texto ?? null);
	protected readonly avisos = computed(() =>
		avisosGeneracion(this.montosGuardados(), this.cronogramaGuardado()),
	);
	protected readonly pasos = computed(() => armarPasos(this.entrada()));
	protected readonly sinConfigurar = computed(() => anioSinConfigurar(this.entrada()));
	protected readonly textoSinConfigurar = computed(() => textoAnioSinConfigurar(this.anio()));
	protected readonly etiquetaGuia = computed(() => `Pasos para configurar el año ${this.anio()}`);
	// #endregion

	constructor() {
		// Un parámetro, monto o fecha recién guardado deja sin efecto una vista previa ya calculada.
		effect(() => {
			this.parametros.parametros();
			this.montos.conceptos();
			this.cronograma.cuotas();
			untracked(() => this.generar.invalidar());
		});
	}

	// #region Cambios sin guardar
	hasPendingChanges(): boolean {
		return this.sinGuardar().length > 0;
	}

	/** `true` si se puede seguir: sin ediciones, o la persona eligió «Salir sin guardar». */
	confirmLeave(): Promise<boolean> {
		if (!this.hasPendingChanges()) return Promise.resolve(true);
		return this.aviso.confirmProceed({
			message: mensajeCambiosSinGuardar(this.sinGuardar(), this.anio()),
			canSave: false,
			save: () => Promise.resolve(false),
		});
	}

	/** Recargar o cerrar la pestaña no pasa por el router: solo el navegador puede preguntar, con su propio texto. */
	@HostListener('window:beforeunload', ['$event'])
	protected onBeforeUnload(event: BeforeUnloadEvent): void {
		if (this.hasPendingChanges()) event.preventDefault();
	}
	// #endregion

	// #region Handlers
	/** Otro año recarga las cuatro secciones y descarta lo escrito: con cambios sin guardar, primero se pregunta. */
	protected cambiarAnio(nuevo: number): void {
		const actual = this.anio();
		// Primero se iguala a lo que ya muestra el selector: si no, devolverlo al año vigente no cambiaría nada.
		this.anioSelector.set(nuevo);
		if (nuevo === actual) return;
		if (!this.hasPendingChanges()) {
			this.anio.set(nuevo);
			return;
		}
		void this.confirmLeave().then((seguir) => {
			if (seguir) {
				this.anio.set(nuevo);
				return;
			}
			this.anioSelector.set(actual);
		});
	}

	/**
	 * Lleva a la sección del paso y le da el foco al título. Centrado: arriba lo taparía el encabezado fijo de la
	 * intranet. Sin animación si la persona pidió reducir el movimiento.
	 */
	protected irA(destino: string): void {
		const titulo = this.document.getElementById(destino);
		if (!titulo) return;
		const reducirMovimiento =
			this.document.defaultView?.matchMedia?.('(prefers-reduced-motion: reduce)').matches ??
			false;
		titulo.scrollIntoView({ block: 'center', behavior: reducirMovimiento ? 'auto' : 'smooth' });
		titulo.focus({ preventScroll: true });
	}
	// #endregion
}
