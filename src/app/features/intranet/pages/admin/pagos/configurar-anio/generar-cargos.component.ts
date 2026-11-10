// #region Imports
import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { FormsModule } from '@angular/forms';

import type { ConceptoGenerable, EstudianteBusqueda } from '@data/models';
import { EduAutoComplete, EduButton, EduCheckbox, EduMessage, EduTemplate } from '@edu-ui';
import { CONCEPTOS, armarPayloadGeneracion, cantidadCargos, describirOmision, etiquetaConcepto } from '../utils/carga-inicial.logic';
import { GenerarCargosFacade } from './generar-cargos.facade';
// #endregion

/**
 * Generar los cargos del año (D2-D6): elegir conceptos → vista previa → confirmar.
 * Es una acción explícita, nunca un job: el error más caro del arranque es el cobro doble, así que una persona
 * ve cuántos cargos nacen, cuántos ya existen y cuántos se omiten (y por qué) antes de escribir.
 */
@Component({
	selector: 'app-generar-cargos',
	standalone: true,
	imports: [FormsModule, EduAutoComplete, EduButton, EduCheckbox, EduMessage, EduTemplate],
	template: `
		<section class="seccion" aria-labelledby="generar-title">
			<h3 id="generar-title" class="seccion__title">2. Generar cargos del año {{ anio() }}</h3>
			<p class="seccion__nota">
				Crea los cargos de matrícula, inscripción y pensión de los alumnos matriculados. Es seguro repetirlo: lo que ya existe no se duplica. Los útiles todavía no se
				generan.
			</p>

			<fieldset class="conceptos">
				<legend>Conceptos a generar</legend>
				@for (c of conceptos; track c.value) {
					<edu-checkbox
						[label]="c.label"
						[ngModel]="elegido(c.value)"
						(ngModelChange)="alternar(c.value, $event)"
						[disabled]="facade.generando()"
					/>
				}
			</fieldset>

			@if (elegido('INSCRIPCION')) {
				<div class="inscripcion">
					<label class="campo">
						<span>Alumnos nuevos a inscribir</span>
						<edu-autocomplete
							[suggestions]="facade.sugerencias()"
							[ngModel]="busqueda()"
							(ngModelChange)="busqueda.set($event)"
							(completeMethod)="facade.buscarEstudiantes($event.query)"
							(onSelect)="agregarAlumno($event.value)"
							optionLabel="nombreCompleto"
							placeholder="Escribe al menos 2 letras o el DNI completo"
							[minLength]="2"
							[delay]="300"
							[style]="{ width: '100%' }"
							[inputStyle]="{ width: '100%' }"
						>
							<ng-template let-alumno pTemplate="item">
								<span>
									<strong>{{ alumno.nombreCompleto }}</strong> · {{ alumno.salon?.nombre ?? 'Sin matrícula activa' }}
								</span>
							</ng-template>
						</edu-autocomplete>
						<small>La inscripción solo nace para los alumnos que elijas aquí. Sin ninguno, no se genera ninguna inscripción.</small>
					</label>
					@if (facade.errorBusqueda(); as errorBusqueda) {
						<small role="alert">{{ errorBusqueda }}</small>
					}
					@if (inscritos().length > 0) {
						<ul class="inscritos" aria-label="Alumnos elegidos para inscripción">
							@for (alumno of inscritos(); track alumno.estudianteId) {
								<li>
									<span>{{ alumno.nombreCompleto }}</span>
									<edu-button
										icon="pi pi-times"
										severity="secondary"
										[text]="true"
										[attr.aria-label]="'Quitar a ' + alumno.nombreCompleto"
										[disabled]="facade.generando()"
										(click)="quitarAlumno(alumno.estudianteId)"
									/>
								</li>
							}
						</ul>
					}
				</div>
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
					<dl class="totales" aria-label="Resumen de la vista previa">
						<div>
							<dt>Cargos a crear</dt>
							<dd>{{ vp.aCrear }}</dd>
						</div>
						<div>
							<dt>Ya existen</dt>
							<dd>{{ vp.yaExisten }}</dd>
						</div>
						<div>
							<dt>Nacen «sin dato»</dt>
							<dd>{{ vp.nacenSinDato }}</dd>
						</div>
						<div>
							<dt>Nacen confirmados</dt>
							<dd>{{ vp.nacenConfirmados }}</dd>
						</div>
					</dl>

					@if (vp.porConcepto.length > 0) {
						<table class="tabla">
							<caption class="sr-only">Cargos por concepto</caption>
							<thead>
								<tr>
									<th scope="col">Concepto</th>
									<th scope="col" class="num">A crear</th>
									<th scope="col" class="num">Ya existen</th>
								</tr>
							</thead>
							<tbody>
								@for (fila of vp.porConcepto; track fila.concepto) {
									<tr>
										<td>{{ etiqueta(fila.concepto) }}</td>
										<td class="num">{{ fila.aCrear }}</td>
										<td class="num">{{ fila.yaExisten }}</td>
									</tr>
								}
							</tbody>
						</table>
					}

					@if (vp.omitidos.length > 0) {
						<div class="omitidos">
							<strong>Se omiten</strong>
							<ul>
								@for (o of vp.omitidos; track $index) {
									<li>{{ describir(o) }}</li>
								}
							</ul>
						</div>
					}

					@if (vp.aCrear === 0) {
						<edu-message severity="info" text="No hay cargos nuevos para crear con esta elección." />
					} @else {
						<div class="acciones">
							<edu-button
								[label]="'Generar ' + cantidad(vp.aCrear)"
								icon="pi pi-check"
								[loading]="facade.generando()"
								[disabled]="facade.generando() || facade.calculando()"
								(click)="facade.generar()"
							/>
						</div>
					}
				</div>
			}

			@if (facade.resultado(); as res) {
				<edu-message
					severity="success"
					[text]="'Listo: se crearon ' + cantidad(res.creados) + ' (' + res.yaExisten + ' ya existían). Revisa los «sin dato» en la pestaña correspondiente.'"
				/>
			}
		</section>
	`,
	styleUrl: './configurar-anio.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GenerarCargosComponent {
	readonly anio = input.required<number>();
	protected readonly facade = inject(GenerarCargosFacade);

	protected readonly conceptos = CONCEPTOS;
	protected readonly etiqueta = etiquetaConcepto;
	protected readonly describir = describirOmision;
	protected readonly cantidad = cantidadCargos;

	protected readonly seleccion = signal<ConceptoGenerable[]>(['MATRICULA', 'PENSION']);
	protected readonly inscritos = signal<EstudianteBusqueda[]>([]);
	protected readonly busqueda = signal<EstudianteBusqueda | string | null>(null);

	protected readonly puedeCalcular = computed(
		() => this.seleccion().length > 0 && !this.facade.calculando() && !this.facade.generando(),
	);

	constructor() {
		// Cambiar de año deja sin efecto lo calculado: el conteo era de otro año.
		effect(() => {
			this.anio();
			untracked(() => this.facade.invalidar());
		});
	}

	protected elegido(concepto: ConceptoGenerable): boolean {
		return this.seleccion().includes(concepto);
	}

	protected alternar(concepto: ConceptoGenerable, marcado: boolean): void {
		this.seleccion.update((actual) => (marcado ? [...actual.filter((c) => c !== concepto), concepto] : actual.filter((c) => c !== concepto)));
		this.facade.invalidar();
	}

	protected agregarAlumno(alumno: EstudianteBusqueda): void {
		this.busqueda.set(null);
		if (this.inscritos().some((a) => a.estudianteId === alumno.estudianteId)) return;
		this.inscritos.update((lista) => [...lista, alumno]);
		this.facade.invalidar();
	}

	protected quitarAlumno(estudianteId: number): void {
		this.inscritos.update((lista) => lista.filter((a) => a.estudianteId !== estudianteId));
		this.facade.invalidar();
	}

	protected calcular(): void {
		if (!this.puedeCalcular()) return;
		this.facade.calcular(
			armarPayloadGeneracion(
				this.anio(),
				this.seleccion(),
				this.inscritos().map((a) => a.estudianteId),
			),
		);
	}
}
