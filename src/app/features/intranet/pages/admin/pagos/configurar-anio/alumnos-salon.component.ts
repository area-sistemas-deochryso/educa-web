// #region Imports
import { ChangeDetectionStrategy, Component, effect, inject, input, output, signal, untracked } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { EduButton, EduSelect } from '@edu-ui';
import { AlumnosSalonFacade } from './alumnos-salon.facade';
import { alternarNuevo, resumenNuevos } from './alumnos-salon.logic';
// #endregion

/** Lo que el filtro por salón le pide al paso «Generar cargos»: acotar a un salón y qué alumnos reciben inscripción. */
export interface AlumnosSalonCambio {
	salonId: number | null;
	nuevos: number[];
}

/**
 * Filtro por salón del paso 4 de «Configurar año» (P123 F8): genera solo los cargos de un salón y, al elegirlo, lista sus
 * alumnos con la casilla «Nuevo» (los que reciben inscripción). Es también el camino de la alta masiva: los estudiantes
 * importados se matriculan en su salón y acá se marca quién es nuevo, sin tocar el importador.
 * Sin salón elegido no hace nada: el paso sigue generando para todo el año.
 */
@Component({
	selector: 'app-alumnos-salon',
	standalone: true,
	imports: [FormsModule, EduButton, EduSelect],
	template: `
		<div class="inscripcion" data-testid="alumnos-salon">
			<div class="campo campo--auto">
				<span id="alumnos-salon-label">Salón (opcional)</span>
				<edu-select
					[options]="facade.opciones()"
					[ngModel]="salonId()"
					(ngModelChange)="elegirSalon($event)"
					optionLabel="nombre"
					optionValue="salonId"
					placeholder="Todos los salones"
					appendTo="body"
					[disabled]="disabled()"
					[pt]="{ root: { 'aria-labelledby': 'alumnos-salon-label' } }"
				/>
				<small>Elige un salón para generar solo sus cargos y marcar a sus alumnos nuevos.</small>
			</div>

			@if (facade.error(); as mensaje) {
				<small role="alert">{{ mensaje }}</small>
			}

			@if (salonId() !== null) {
				@if (facade.cargandoAlumnos()) {
					<p class="ayuda" aria-live="polite">Cargando alumnos del salón…</p>
				} @else {
					<p class="ayuda" aria-live="polite" data-testid="resumen-nuevos">{{ resumen() }}</p>
					@if (!inscripcion()) {
						<p class="ayuda">Marca «Inscripción» en los conceptos para elegir a los alumnos nuevos.</p>
					}
					@if (facade.alumnos().length > 0) {
						<div class="acciones">
							<edu-button
								label="Marcar todos como nuevos"
								severity="secondary"
								[text]="true"
								[disabled]="!inscripcion() || disabled()"
								(click)="marcarTodos()"
							/>
							<edu-button
								label="Quitar marcas"
								severity="secondary"
								[text]="true"
								[disabled]="!inscripcion() || disabled() || nuevos().length === 0"
								(click)="quitarTodos()"
							/>
						</div>
						<div class="tabla-scroll">
							<table class="tabla">
								<caption class="sr-only">Alumnos del salón</caption>
								<thead>
									<tr>
										<th scope="col">Alumno</th>
										<th scope="col">DNI</th>
										<th scope="col">Matrícula</th>
										<th scope="col">Nuevo</th>
									</tr>
								</thead>
								<tbody>
									@for (alumno of facade.alumnos(); track alumno.estudianteId) {
										<tr>
											<td>{{ alumno.nombreCompleto }}</td>
											<td>{{ alumno.dni }}</td>
											<td>{{ alumno.estadoMatricula }}</td>
											<td>
												<input
													type="checkbox"
													[checked]="esNuevo(alumno.estudianteId)"
													[disabled]="!inscripcion() || disabled()"
													[attr.aria-label]="'Marcar como nuevo a ' + alumno.nombreCompleto"
													(change)="alternar(alumno.estudianteId, $any($event.target).checked)"
												/>
											</td>
										</tr>
									}
								</tbody>
							</table>
						</div>
					}
				}
			}
		</div>
	`,
	providers: [AlumnosSalonFacade],
	styleUrl: './configurar-anio.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AlumnosSalonComponent {
	protected readonly facade = inject(AlumnosSalonFacade);

	readonly anio = input.required<number>();
	/** El concepto «Inscripción» está elegido: sin él, la lista se ve pero no se puede marcar a nadie. */
	readonly inscripcion = input(false);
	readonly disabled = input(false);
	readonly cambio = output<AlumnosSalonCambio>();

	protected readonly salonId = signal<number | null>(null);
	protected readonly nuevos = signal<number[]>([]);

	constructor() {
		// Cambiar de año deja sin efecto el salón y las marcas: eran de otro calendario.
		effect(() => {
			const anio = this.anio();
			untracked(() => {
				this.facade.cargarSalones(anio);
				this.reiniciar(null);
			});
		});
	}

	protected esNuevo(estudianteId: number): boolean {
		return this.nuevos().includes(estudianteId);
	}

	protected resumen(): string {
		return resumenNuevos(this.facade.alumnos().length, this.nuevos().length);
	}

	protected elegirSalon(salonId: number | null): void {
		this.reiniciar(salonId);
	}

	protected alternar(estudianteId: number, marcado: boolean): void {
		this.nuevos.update((actual) => alternarNuevo(actual, estudianteId, marcado));
		this.emitir();
	}

	protected marcarTodos(): void {
		this.nuevos.set(this.facade.alumnos().map((a) => a.estudianteId));
		this.emitir();
	}

	protected quitarTodos(): void {
		this.nuevos.set([]);
		this.emitir();
	}

	private reiniciar(salonId: number | null): void {
		this.salonId.set(salonId);
		this.nuevos.set([]);
		this.facade.elegirSalon(salonId);
		this.emitir();
	}

	private emitir(): void {
		this.cambio.emit({ salonId: this.salonId(), nuevos: [...this.nuevos()] });
	}
}
