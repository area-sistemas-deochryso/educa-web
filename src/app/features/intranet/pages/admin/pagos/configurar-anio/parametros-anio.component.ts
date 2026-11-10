// #region Imports
import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { EduButton, EduDatePicker, EduInputNumber, EduMessage } from '@edu-ui';
import { fechaDesdeIso, fechaInicialEnAnio, parametrosValidos } from '../utils/carga-inicial.logic';
import { ParametrosAnioFacade } from './parametros-anio.facade';
// #endregion

/**
 * Formulario de los parámetros del año (D1). La fecha inicial es opcional: sin ella rige `INV-PG14` tal cual
 * (las cuotas vencidas nacen «sin dato»). Cambiarla no reescribe cargos ya generados.
 */
@Component({
	selector: 'app-parametros-anio',
	standalone: true,
	imports: [FormsModule, EduButton, EduDatePicker, EduInputNumber, EduMessage],
	template: `
		<section class="seccion" aria-labelledby="parametros-title">
			<h3 id="parametros-title" class="seccion__title">1. Parámetros del año {{ anio() }}</h3>

			@if (facade.cargando()) {
				<p class="seccion__nota" role="status">Cargando parámetros…</p>
			} @else {
				@if (!facade.parametros() && !facade.error()) {
					<edu-message severity="info" text="Este año todavía no tiene parámetros. Complétalos y guárdalos para poder generar cargos." />
				}
				<div class="campos">
					<label class="campo">
						<span>Pago mínimo por partes (S/) <span aria-hidden="true">*</span></span>
						<edu-input-number
							[ngModel]="pagoMinimoPartes()"
							(ngModelChange)="pagoMinimoPartes.set($event); tocar()"
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
							(ngModelChange)="montoRecargo.set($event); tocar()"
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
							(ngModelChange)="fechaInicial.set($event); tocar()"
							[minDate]="inicioAnio()"
							[maxDate]="finAnio()"
							[showClear]="true"
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
				@if (facade.guardado() && !modificado()) {
					<edu-message severity="success" text="Parámetros guardados." />
				}
				<div class="acciones">
					<edu-button
						label="Guardar parámetros"
						icon="pi pi-save"
						[loading]="facade.guardando()"
						[disabled]="!puedeGuardar()"
						(click)="guardar()"
					/>
				</div>
			}
		</section>
	`,
	styleUrl: './configurar-anio.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ParametrosAnioComponent {
	readonly anio = input.required<number>();
	protected readonly facade = inject(ParametrosAnioFacade);

	protected readonly pagoMinimoPartes = signal<number | null>(null);
	protected readonly montoRecargo = signal<number | null>(null);
	protected readonly fechaInicial = signal<Date | null>(null);
	protected readonly modificado = signal(false);

	protected readonly inicioAnio = computed(() => new Date(this.anio(), 0, 1));
	protected readonly finAnio = computed(() => new Date(this.anio(), 11, 31));
	protected readonly fechaEnAnio = computed(() => fechaInicialEnAnio(this.fechaInicial(), this.anio()));
	protected readonly puedeGuardar = computed(
		() =>
			!this.facade.guardando() &&
			parametrosValidos({
				anio: this.anio(),
				pagoMinimoPartes: this.pagoMinimoPartes(),
				montoRecargo: this.montoRecargo(),
				fechaInicial: this.fechaInicial(),
			}),
	);

	constructor() {
		effect(() => {
			const anio = this.anio();
			untracked(() => this.facade.cargar(anio));
		});
		// El formulario refleja lo último que devolvió el servidor (al cargar, al guardar y al releer tras un 409).
		effect(() => {
			const p = this.facade.parametros();
			untracked(() => {
				this.pagoMinimoPartes.set(p?.pagoMinimoPartes ?? null);
				this.montoRecargo.set(p?.montoRecargo ?? null);
				this.fechaInicial.set(fechaDesdeIso(p?.fechaInicial));
				this.modificado.set(false);
			});
		});
	}

	protected tocar(): void {
		this.modificado.set(true);
	}

	protected guardar(): void {
		if (!this.puedeGuardar()) return;
		this.facade.guardar({
			anio: this.anio(),
			pagoMinimoPartes: this.pagoMinimoPartes(),
			montoRecargo: this.montoRecargo(),
			fechaInicial: this.fechaInicial(),
		});
	}
}
