// #region Imports
import {
	ChangeDetectionStrategy,
	Component,
	ElementRef,
	Injector,
	afterNextRender,
	computed,
	effect,
	inject,
	input,
	linkedSignal,
	untracked,
} from '@angular/core';
import { FormsModule } from '@angular/forms';

import { EduButton, EduDatePicker, EduInputNumber, EduMessage } from '@edu-ui';
import {
	type DatosParametros,
	fechaDesdeIso,
	fechaInicialEnAnio,
	parametrosValidos,
} from '../utils/carga-inicial.logic';
import { ParametrosAnioFacade } from './parametros-anio.facade';
import { parametrosCambiaron } from './seccion.logic';
// #endregion

/**
 * Paso 1 de «Configurar año»: los parámetros del año (D1). La fecha inicial es opcional: sin ella rige `INV-PG14` tal cual
 * (las cuotas vencidas nacen «sin dato»). Cambiarla no reescribe cargos ya generados.
 * El formulario se deriva de lo último que devolvió el servidor (`linkedSignal`), así que `hayCambios` compara siempre
 * contra esa base: la pantalla lo lee para avisar antes de perder ediciones y para bloquear «Generar».
 */
@Component({
	selector: 'app-parametros-anio',
	standalone: true,
	imports: [FormsModule, EduButton, EduDatePicker, EduInputNumber, EduMessage],
	template: `
		<section class="seccion" aria-labelledby="parametros-title">
			<h3 id="parametros-title" class="seccion__title" tabindex="-1">1. Parámetros del año {{ anio() }}</h3>

			@switch (facade.estado()) {
				@case ('cargando') {
					<p class="seccion__nota" role="status">Cargando parámetros…</p>
				}
				@case ('error') {
					@if (facade.error(); as mensaje) {
						<edu-message severity="danger" [text]="mensaje" />
					}
					<div class="acciones">
						<edu-button
							data-testid="recargar-parametros"
							label="Volver a cargar"
							icon="pi pi-refresh"
							severity="secondary"
							[outlined]="true"
							(click)="recargar()"
						/>
					</div>
				}
				@default {
					@if (!facade.parametros() && !facade.error()) {
						<edu-message severity="info" text="Este año todavía no tiene parámetros. Complétalos y guárdalos para poder generar cargos." />
					}
					<div class="campos">
						<label class="campo">
							<span>Pago mínimo por partes (S/) <span aria-hidden="true">*</span></span>
							<edu-input-number
								[ngModel]="pagoMinimoPartes()"
								(ngModelChange)="pagoMinimoPartes.set($event)"
								[min]="0"
								[minFractionDigits]="2"
								[maxFractionDigits]="2"
								[showButtons]="false"
								placeholder="0.00"
							/>
							<small>Un pago por partes se acepta solo si supera este monto.</small>
						</label>
						<label class="campo">
							<span>Recargo por cuota vencida (S/) <span aria-hidden="true">*</span></span>
							<edu-input-number
								[ngModel]="montoRecargo()"
								(ngModelChange)="montoRecargo.set($event)"
								[min]="0"
								[minFractionDigits]="2"
								[maxFractionDigits]="2"
								[showButtons]="false"
								placeholder="0.00"
							/>
						</label>
						<label class="campo">
							<span>Fecha inicial del sistema (opcional)</span>
							<edu-datepicker
								[ngModel]="fechaInicial()"
								(ngModelChange)="fechaInicial.set($event)"
								[minDate]="inicioAnio()"
								[maxDate]="finAnio()"
								[showClear]="true"
								dateFormat="dd/mm/yyyy"
								appendTo="body"
							/>
							<small>
								Las cuotas que vencieron antes de esta fecha nacen «sin dato». Sin fecha, nacen «sin dato» todas las ya vencidas. Cambiarla no reescribe cargos
								ya generados.
							</small>
						</label>
					</div>
					@if (!fechaEnAnio()) {
						<edu-message severity="danger" text="La fecha inicial debe caer dentro del año elegido." />
					}
					@if (facade.error(); as mensaje) {
						<edu-message severity="danger" [text]="mensaje" />
					}
					@if (facade.guardado() && !hayCambios()) {
						<edu-message severity="success" text="Parámetros guardados." />
					}
					<div class="acciones">
						<edu-button
							label="Guardar parámetros"
							icon="pi pi-save"
							severity="success"
							[loading]="facade.guardando()"
							[disabled]="!puedeGuardar()"
							(click)="guardar()"
						/>
					</div>
				}
			}
		</section>
	`,
	styleUrl: './configurar-anio.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ParametrosAnioComponent {
	readonly anio = input.required<number>();
	protected readonly facade = inject(ParametrosAnioFacade);
	private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
	private readonly injector = inject(Injector);

	// #region Formulario
	/**
	 * La base del formulario. Lleva el año además de lo leído: un año sin fila seguido de otro sin fila deja `parametros`
	 * en `null` sin cambio, y aun así el formulario tiene que vaciarse.
	 */
	private readonly base = computed(() => ({ anio: this.anio(), parametros: this.facade.parametros() }));

	protected readonly pagoMinimoPartes = linkedSignal({
		source: this.base,
		computation: ({ parametros }) => parametros?.pagoMinimoPartes ?? null,
	});
	protected readonly montoRecargo = linkedSignal({
		source: this.base,
		computation: ({ parametros }) => parametros?.montoRecargo ?? null,
	});
	protected readonly fechaInicial = linkedSignal({
		source: this.base,
		computation: ({ parametros }) => fechaDesdeIso(parametros?.fechaInicial),
	});

	private readonly datos = computed<DatosParametros>(() => ({
		anio: this.anio(),
		pagoMinimoPartes: this.pagoMinimoPartes(),
		montoRecargo: this.montoRecargo(),
		fechaInicial: this.fechaInicial(),
	}));
	// #endregion

	/** Ediciones respecto de lo guardado; lo lee la pantalla para avisar antes de perderlas. */
	readonly hayCambios = computed(() => parametrosCambiaron(this.datos(), this.facade.parametros()));

	protected readonly inicioAnio = computed(() => new Date(this.anio(), 0, 1));
	protected readonly finAnio = computed(() => new Date(this.anio(), 11, 31));
	protected readonly fechaEnAnio = computed(() => fechaInicialEnAnio(this.fechaInicial(), this.anio()));
	protected readonly puedeGuardar = computed(
		() =>
			this.facade.estado() === 'lista' &&
			!this.facade.guardando() &&
			this.hayCambios() &&
			parametrosValidos(this.datos()),
	);

	constructor() {
		effect(() => {
			const anio = this.anio();
			untracked(() => this.facade.cargar(anio));
		});
	}

	// #region Handlers
	protected guardar(): void {
		if (!this.puedeGuardar()) return;
		this.facade.guardar(this.datos());
	}

	/** «Volver a cargar» desaparece al usarlo: el foco pasa al título para no caer al inicio de la página. */
	protected recargar(): void {
		this.facade.recargar();
		afterNextRender(
			() => this.host.nativeElement.querySelector<HTMLElement>('#parametros-title')?.focus(),
			{ injector: this.injector },
		);
	}
	// #endregion
}
