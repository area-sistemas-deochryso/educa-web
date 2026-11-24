// #region Imports
import { ChangeDetectionStrategy, Component, effect, inject, input, output, untracked } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { EduButton, EduCheckbox, EduMessage } from '@edu-ui';
import { etiquetaConcepto } from '../utils/carga-inicial.logic';
import { MatriculaOfertaFacade } from './matricula-oferta.facade';
import { cargosTexto, hayAlgoQueCrear, motivoSinCargos, resumenOferta } from './matricula-oferta.logic';
// #endregion

/** Cómo terminó el ofrecimiento: lo usa quien lo aloja para avisar (suave) si el alumno quedó sin cargo. */
export interface MatriculaOfertaResultado {
	generado: boolean;
	sinCargo: boolean;
}

/**
 * «Generar matrícula e inscripción» de un alumno (P123 F8): casilla de alumno nuevo → vista previa → confirmar, sin volver
 * a buscarlo en Pagos. Lo alojan las dos puertas de matrícula (alta de usuario y pestaña de estudiantes del salón).
 * Es una oferta, nunca automática ni bloqueante: «Omitir» siempre está disponible y deja un aviso suave si queda sin cargo.
 */
@Component({
	selector: 'app-matricula-oferta',
	standalone: true,
	imports: [FormsModule, EduButton, EduCheckbox, EduMessage],
	template: `
		<section class="oferta" aria-labelledby="oferta-title" data-testid="matricula-oferta">
			<h3 id="oferta-title" class="oferta__title">Generar matrícula e inscripción {{ anio() }}</h3>
			<p class="oferta__nota">
				Crea los cargos de <strong>{{ nombre() }}</strong
				>. Es seguro repetirlo: lo que ya existe no se duplica.
			</p>

			<edu-checkbox
				label="Alumno nuevo (también genera la inscripción)"
				[ngModel]="facade.esNuevo()"
				(ngModelChange)="facade.cambiarNuevo($event)"
				[disabled]="facade.calculando() || facade.generando() || facade.resultado() !== null"
			/>

			@if (facade.error(); as mensaje) {
				<edu-message severity="danger" [text]="mensaje" />
			}

			@if (facade.calculando()) {
				<p class="oferta__estado" aria-live="polite">Calculando vista previa…</p>
			}

			@if (facade.vistaPrevia(); as vp) {
				<div class="oferta__vista" aria-live="polite" data-testid="oferta-vista-previa">
					<p class="oferta__resumen">{{ resumen(vp) }}</p>
					@if (vp.porConcepto.length > 0) {
						<ul class="oferta__conceptos">
							@for (fila of vp.porConcepto; track fila.concepto) {
								<li>
									<span>{{ etiqueta(fila.concepto) }}</span>
									<span>{{ fila.aCrear > 0 ? 'se crea' : fila.yaExisten > 0 ? 'ya existe' : 'se omite' }}</span>
								</li>
							}
						</ul>
					}
					@if (motivo(vp); as razon) {
						<edu-message severity="info" [text]="razon" data-testid="oferta-motivo" />
					}
				</div>
			}

			@if (facade.resultado(); as res) {
				<edu-message
					severity="success"
					[text]="'Listo: se crearon ' + cantidad(res.creados) + ' (' + res.yaExisten + ' ya existían).'"
					data-testid="oferta-resultado"
				/>
			}

			<div class="oferta__acciones">
				@if (facade.resultado() === null) {
					<edu-button
						[label]="botonGenerar()"
						icon="pi pi-check"
						[loading]="facade.generando()"
						[disabled]="!puedeGenerar()"
						(click)="facade.generar()"
						data-testid="oferta-generar"
					/>
					<edu-button
						label="Omitir"
						severity="secondary"
						[text]="true"
						[disabled]="facade.generando()"
						(click)="omitir()"
						data-testid="oferta-omitir"
					/>
				} @else {
					<edu-button label="Listo" icon="pi pi-check" (click)="cerrar()" data-testid="oferta-listo" />
				}
			</div>
		</section>
	`,
	styles: `
		.oferta {
			display: flex;
			flex-direction: column;
			gap: 0.75rem;
		}
		/* Sin color propio el <h3> heredaba un negro global y en modo oscuro quedaba ilegible (~1:1). */
		.oferta__title {
			margin: 0;
			font-size: 1.05rem;
			color: var(--text-color);
		}
		.oferta__nota,
		.oferta__estado {
			margin: 0;
			color: var(--text-color-secondary, #64748b);
			font-size: 0.9rem;
		}
		.oferta__resumen {
			margin: 0 0 0.25rem;
			font-weight: 600;
			color: var(--text-color);
		}
		.oferta__conceptos {
			list-style: none;
			margin: 0 0 0.5rem;
			padding: 0;
			display: flex;
			flex-direction: column;
			gap: 0.25rem;
		}
		.oferta__conceptos li {
			display: flex;
			justify-content: space-between;
			gap: 1rem;
			font-size: 0.9rem;
			color: var(--text-color);
		}
		.oferta__acciones {
			display: flex;
			flex-wrap: wrap;
			gap: 0.5rem;
		}
	`,
	providers: [MatriculaOfertaFacade],
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MatriculaOfertaComponent {
	protected readonly facade = inject(MatriculaOfertaFacade);

	readonly estudianteId = input.required<number>();
	readonly anio = input.required<number>();
	readonly nombre = input.required<string>();
	/** El ofrecimiento terminó (se generó, o la persona lo omitió). */
	readonly terminado = output<MatriculaOfertaResultado>();

	protected readonly etiqueta = etiquetaConcepto;
	protected readonly cantidad = cargosTexto;
	protected readonly resumen = resumenOferta;
	protected readonly motivo = motivoSinCargos;

	constructor() {
		effect(() => {
			const id = this.estudianteId();
			const anio = this.anio();
			untracked(() => this.facade.iniciar(id, anio));
		});
	}

	protected puedeGenerar(): boolean {
		return hayAlgoQueCrear(this.facade.vistaPrevia()) && !this.facade.calculando() && !this.facade.generando();
	}

	protected botonGenerar(): string {
		const aCrear = this.facade.vistaPrevia()?.aCrear ?? 0;
		return aCrear > 0 ? `Generar ${cargosTexto(aCrear)}` : 'Generar';
	}

	protected async omitir(): Promise<void> {
		const sinCargo = await this.facade.quedaSinCargo();
		this.terminado.emit({ generado: false, sinCargo });
	}

	protected cerrar(): void {
		this.terminado.emit({ generado: true, sinCargo: false });
	}
}
