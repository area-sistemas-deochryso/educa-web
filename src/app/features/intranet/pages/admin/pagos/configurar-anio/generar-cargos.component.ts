// #region Imports
import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { FormsModule } from '@angular/forms';

import type { ConceptoGenerable, EstudianteBusqueda } from '@data/models';
import { EduAutoComplete, EduButton, EduCheckbox, EduMessage, EduTemplate } from '@edu-ui';
import { CONCEPTOS, armarPayloadGeneracion, cantidadCargos, describirOmision, etiquetaConcepto } from '../utils/carga-inicial.logic';
import { type AlumnosSalonCambio, AlumnosSalonComponent } from './alumnos-salon.component';
import { idsInscripcion } from './alumnos-salon.logic';
import { GenerarCargosFacade } from './generar-cargos.facade';
// #endregion

/**
 * Paso 4 de «Configurar año»: generar los cargos del año (D2-D6): elegir conceptos → vista previa → confirmar.
 * Es una acción explícita, nunca un job: el error más caro del arranque es el cobro doble, así que una persona
 * ve cuántos cargos nacen, cuántos ya existen y cuántos se omiten (y por qué) antes de escribir.
 * La pantalla decide cuándo no se puede generar (`bloqueo`: cargando, sin parámetros o con cambios sin guardar, porque
 * los cargos copian lo guardado) y qué se omitirá (`avisos`: montos o cronograma incompletos).
 */
@Component({
	selector: 'app-generar-cargos',
	standalone: true,
	imports: [FormsModule, AlumnosSalonComponent, EduAutoComplete, EduButton, EduCheckbox, EduMessage, EduTemplate],
	template: `
		<section class="seccion" aria-labelledby="generar-title">
			<h3 id="generar-title" class="seccion__title" tabindex="-1">4. Generar cargos del año {{ anio() }}</h3>
			<p class="seccion__nota">
				Crea los cargos de matrícula, inscripción y pensión de los alumnos matriculados. Es seguro repetirlo: lo que ya existe no se duplica. Los útiles todavía no se
				generan.
			</p>
			@if (bloqueo(); as motivo) {
				<p class="ayuda" data-testid="motivo-bloqueo">
					<i class="pi pi-lock" aria-hidden="true"></i> {{ motivo }}
				</p>
			} @else if (avisos().length > 0) {
				<ul class="avisos" data-testid="avisos-generacion" aria-label="Avisos antes de generar">
					@for (aviso of avisos(); track aviso) {
						<li>{{ aviso }}</li>
					}
				</ul>
			}

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

			<app-alumnos-salon [anio]="anio()" [inscripcion]="elegido('INSCRIPCION')" [disabled]="facade.generando()" (cambio)="cambiarSalon($event)" />

			@if (elegido('INSCRIPCION') && salonId() !== null && inscritos().length > 0) {
				<p class="ayuda" data-testid="aviso-buscador-ignorado">
					<i class="pi pi-info-circle" aria-hidden="true"></i> Con un salón elegido solo se inscribe a los alumnos marcados en su lista. Los {{ inscritos().length }} elegidos por buscador no se
					inscribirán; quita el salón para usarlos.
				</p>
			}

			@if (elegido('INSCRIPCION') && salonId() === null) {
				<div class="inscripcion">
					<label class="campo campo--auto">
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
										[pt]="{ root: { 'aria-label': 'Quitar a ' + alumno.nombreCompleto } }"
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
						<div class="tabla-scroll">
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
						</div>
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
								[disabled]="facade.generando() || facade.calculando() || bloqueo() !== null"
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
	/** Por qué no se puede generar todavía (lo decide la pantalla); `null` = se puede. */
	readonly bloqueo = input<string | null>(null);
	/** Lo que se omitirá al generar, sin impedirlo. */
	readonly avisos = input<readonly string[]>([]);
	protected readonly facade = inject(GenerarCargosFacade);

	protected readonly conceptos = CONCEPTOS;
	protected readonly etiqueta = etiquetaConcepto;
	protected readonly describir = describirOmision;
	protected readonly cantidad = cantidadCargos;

	protected readonly seleccion = signal<ConceptoGenerable[]>(['MATRICULA', 'PENSION']);
	protected readonly inscritos = signal<EstudianteBusqueda[]>([]);
	protected readonly busqueda = signal<EstudianteBusqueda | string | null>(null);
	/** Filtro por salón y alumnos marcados como nuevos en su lista (P123 F8). */
	protected readonly salonId = signal<number | null>(null);
	protected readonly nuevosDelSalon = signal<number[]>([]);

	protected readonly puedeCalcular = computed(
		() =>
			this.bloqueo() === null &&
			this.seleccion().length > 0 &&
			!this.facade.calculando() &&
			!this.facade.generando(),
	);

	constructor() {
		// Cambiar de año o quedar bloqueado deja sin efecto lo calculado.
		effect(() => {
			this.anio();
			this.bloqueo();
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

	protected cambiarSalon(cambio: AlumnosSalonCambio): void {
		this.salonId.set(cambio.salonId);
		this.nuevosDelSalon.set(cambio.nuevos);
		this.facade.invalidar();
	}

	protected calcular(): void {
		if (!this.puedeCalcular()) return;
		this.facade.calcular(
			armarPayloadGeneracion(
				this.anio(),
				this.seleccion(),
				// Con salón elegido el BE ignora en silencio a los alumnos de otro salón: la lista del salón es el único camino.
				idsInscripcion(
					this.salonId() === null ? this.inscritos().map((a) => a.estudianteId) : [],
					this.nuevosDelSalon(),
				),
				this.salonId(),
			),
		);
	}
}
