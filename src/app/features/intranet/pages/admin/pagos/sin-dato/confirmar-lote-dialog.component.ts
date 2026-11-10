// #region Imports
import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import type { ConceptoGenerable, DesenlaceSinDato, PagosSalonOpcion } from '@data/models';
import { EduButton, EduDialog, EduInputNumber, EduMessage, EduSelect, EduTextarea } from '@edu-ui';
import {
	CONCEPTOS,
	DESENLACES,
	armarFiltroSinDato,
	armarPayloadConfirmacion,
	cantidadCargos,
	etiquetaConcepto,
	opcionesAnio,
	rangoCuotasValido,
	resumenConfirmacion,
	tieneFiltroAdemasDelAnio,
} from '../utils/carga-inicial.logic';
import { ConfirmarLoteFacade } from './confirmar-lote.facade';
// #endregion

const TODOS_LOS_SALONES = { salonId: null, nombre: 'Todos los salones' };
const TODOS_LOS_CONCEPTOS = { value: null, label: 'Todos los conceptos' };

/**
 * Diálogo para confirmar «sin dato» en bloque (D7, D9): se eligen año y filtros, se ve «N cargos de M alumnos» y recién
 * entonces se elige el desenlace. El desenlace no tiene valor por defecto: «Saldado» no se confirma por descuido.
 */
@Component({
	selector: 'app-confirmar-lote-dialog',
	standalone: true,
	imports: [FormsModule, EduButton, EduDialog, EduInputNumber, EduMessage, EduSelect, EduTextarea],
	providers: [ConfirmarLoteFacade],
	template: `
		<edu-dialog
			[visible]="visible()"
			(visibleChange)="onVisibleChange($event)"
			[modal]="true"
			[draggable]="false"
			[resizable]="false"
			[closable]="!facade.confirmando()"
			header="Confirmar «sin dato» en bloque"
			[style]="{ width: '560px' }"
			appendTo="body"
		>
			<div class="dialogo">
				<p class="dialogo__nota">
					Elige qué cargos «sin dato» confirmar. Además del año hace falta al menos un filtro: salón, concepto o cuotas.
				</p>

				<label class="campo">
					<span>Año</span>
					<edu-select [options]="anios" [ngModel]="anio()" (ngModelChange)="cambiar(anio, $event)" appendTo="body" />
				</label>
				<label class="campo">
					<span>Salón</span>
					<edu-select
						[options]="opcionesSalon()"
						[ngModel]="salonId()"
						(ngModelChange)="cambiar(salonId, $event)"
						optionLabel="nombre"
						optionValue="salonId"
						appendTo="body"
					/>
				</label>
				<label class="campo">
					<span>Concepto</span>
					<edu-select
						[options]="opcionesConcepto"
						[ngModel]="concepto()"
						(ngModelChange)="cambiar(concepto, $event)"
						optionLabel="label"
						optionValue="value"
						appendTo="body"
					/>
				</label>
				<div class="fila">
					<label class="campo campo--mitad">
						<span>Cuota desde</span>
						<edu-input-number [ngModel]="cuotaDesde()" (ngModelChange)="cambiar(cuotaDesde, $event)" [min]="1" [showButtons]="false" placeholder="Ej. 1" />
					</label>
					<label class="campo campo--mitad">
						<span>Cuota hasta</span>
						<edu-input-number [ngModel]="cuotaHasta()" (ngModelChange)="cambiar(cuotaHasta, $event)" [min]="1" [showButtons]="false" placeholder="Ej. 1" />
					</label>
				</div>
				@if (!rangoValido()) {
					<edu-message severity="danger" text="«Cuota desde» no puede ser mayor que «Cuota hasta»." />
				}

				<div class="acciones">
					<edu-button
						label="Calcular vista previa"
						icon="pi pi-search"
						severity="secondary"
						[loading]="facade.calculando()"
						[disabled]="!puedeCalcular()"
						(click)="calcular()"
					/>
				</div>

				@if (facade.error(); as mensaje) {
					<edu-message severity="danger" [text]="mensaje" />
				}

				@if (facade.vistaPrevia(); as vp) {
					<div class="vista-previa" aria-live="polite">
						@if (vp.cargos === 0) {
							<edu-message severity="info" text="No hay cargos «sin dato» con ese filtro." />
						} @else {
							<p class="vista-previa__resumen">
								<strong>{{ resumen(vp.cargos, vp.alumnos) }}</strong>
							</p>
							<ul class="vista-previa__lista">
								@for (fila of vp.porConcepto; track fila.concepto) {
									<li>{{ etiqueta(fila.concepto) }}: {{ fila.cargos }}</li>
								}
							</ul>
							<label class="campo">
								<span>¿Qué pasa con estos cargos? <span aria-hidden="true">*</span></span>
								<edu-select
									[options]="desenlaces"
									[ngModel]="desenlace()"
									(ngModelChange)="desenlace.set($event)"
									optionLabel="label"
									optionValue="value"
									placeholder="Elige un desenlace"
									appendTo="body"
								/>
							</label>
							@if (detalleDesenlace(); as detalle) {
								<small>{{ detalle }}</small>
							}
							<label class="campo">
								<span>Motivo (opcional)</span>
								<textarea
									eduTextarea
									rows="2"
									maxlength="500"
									[ngModel]="motivo()"
									(ngModelChange)="motivo.set($event)"
									placeholder="Por ejemplo: pagado antes del arranque, según el cuaderno de caja"
									class="campo__texto"
								></textarea>
							</label>
						}
					</div>
				}

				@if (facade.resultado(); as res) {
					<edu-message severity="success" [text]="mensajeResultado(res.confirmados, res.omitidos)" />
				}

				<div class="acciones">
					<edu-button
						[label]="facade.resultado() ? 'Cerrar' : 'Cancelar'"
						severity="secondary"
						[text]="true"
						[disabled]="facade.confirmando()"
						(click)="onVisibleChange(false)"
					/>
					@if (facade.vistaPrevia(); as vp) {
						@if (vp.cargos > 0) {
							<edu-button
								[label]="'Confirmar ' + cantidad(vp.cargos)"
								icon="pi pi-check"
								[loading]="facade.confirmando()"
								[disabled]="!puedeConfirmar()"
								(click)="confirmar(vp.cargos)"
							/>
						}
					}
				</div>
			</div>
		</edu-dialog>
	`,
	styleUrl: './confirmar-lote-dialog.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConfirmarLoteDialogComponent {
	readonly salones = input<PagosSalonOpcion[]>([]);
	/** Se emite al cerrar si se confirmó algo: la lista de «Sin dato» ya no es la real y hay que recargarla. */
	readonly cerrado = output<{ huboCambios: boolean }>();

	protected readonly facade = inject(ConfirmarLoteFacade);

	protected readonly anios = opcionesAnio(new Date());
	protected readonly opcionesConcepto: { value: ConceptoGenerable | null; label: string }[] = [
		TODOS_LOS_CONCEPTOS,
		...CONCEPTOS,
	];
	protected readonly desenlaces = DESENLACES;
	protected readonly etiqueta = etiquetaConcepto;
	protected readonly resumen = resumenConfirmacion;
	protected readonly cantidad = cantidadCargos;

	protected readonly visible = signal(false);
	protected readonly anio = signal(new Date().getFullYear());
	protected readonly salonId = signal<number | null>(null);
	protected readonly concepto = signal<ConceptoGenerable | null>(null);
	protected readonly cuotaDesde = signal<number | null>(null);
	protected readonly cuotaHasta = signal<number | null>(null);
	protected readonly desenlace = signal<DesenlaceSinDato | null>(null);
	protected readonly motivo = signal('');

	protected readonly opcionesSalon = computed(() => [TODOS_LOS_SALONES, ...this.salones()]);
	protected readonly datos = computed(() => ({
		anio: this.anio(),
		salonId: this.salonId(),
		concepto: this.concepto(),
		cuotaDesde: this.cuotaDesde(),
		cuotaHasta: this.cuotaHasta(),
	}));
	protected readonly rangoValido = computed(() => rangoCuotasValido(this.cuotaDesde(), this.cuotaHasta()));
	protected readonly puedeCalcular = computed(
		() => this.rangoValido() && tieneFiltroAdemasDelAnio(this.datos()) && !this.facade.calculando() && !this.facade.confirmando(),
	);
	protected readonly puedeConfirmar = computed(
		() => this.desenlace() !== null && !this.facade.confirmando() && !this.facade.calculando() && !this.facade.resultado(),
	);
	protected readonly detalleDesenlace = computed(() => DESENLACES.find((d) => d.value === this.desenlace())?.detalle ?? null);

	open(): void {
		this.anio.set(new Date().getFullYear());
		this.salonId.set(null);
		this.concepto.set(null);
		this.cuotaDesde.set(null);
		this.cuotaHasta.set(null);
		this.desenlace.set(null);
		this.motivo.set('');
		this.facade.reiniciar();
		this.visible.set(true);
	}

	/** Cambiar cualquier filtro invalida el conteo y el desenlace elegido para él. */
	protected cambiar<T>(campo: { set(valor: T): void }, valor: T): void {
		campo.set(valor);
		this.desenlace.set(null);
		this.facade.reiniciar();
	}

	protected calcular(): void {
		if (!this.puedeCalcular()) return;
		this.facade.calcular(armarFiltroSinDato(this.datos()));
	}

	protected confirmar(cargosEsperados: number): void {
		const desenlace = this.desenlace();
		if (!desenlace || !this.puedeConfirmar()) return;
		this.facade.confirmar(armarPayloadConfirmacion(armarFiltroSinDato(this.datos()), desenlace, this.motivo(), cargosEsperados));
	}

	protected mensajeResultado(confirmados: number, omitidos: number): string {
		const base = confirmados === 1 ? 'Se confirmó 1 cargo.' : `Se confirmaron ${confirmados} cargos.`;
		return omitidos > 0 ? `${base} ${omitidos} se omitieron (monto base 0, nada que saldar).` : base;
	}

	protected onVisibleChange(visible: boolean): void {
		if (visible) return;
		this.visible.set(false);
		this.cerrado.emit({ huboCambios: this.facade.resultado() !== null });
	}
}
