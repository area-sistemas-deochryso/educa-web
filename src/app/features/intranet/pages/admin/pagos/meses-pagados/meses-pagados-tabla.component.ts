import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import type { MesesPagados } from '@data/models';
import { MesesPagadosCeldaComponent } from './meses-pagados-celda.component';

/**
 * Matriz alumno × cuota. Las pensiones van primero; matrícula, inscripción y útiles son un grupo aparte e informativo
 * (INV-PG19) que no entra en «Meses pagados». La columna del alumno queda fija al desplazar en horizontal.
 * Las celdas de pensión se leen por posición: el BE las manda en el mismo orden que `pensiones`.
 */
@Component({
	selector: 'app-meses-pagados-tabla',
	standalone: true,
	imports: [MesesPagadosCeldaComponent],
	template: `
		<div class="matriz" tabindex="0" role="region" aria-label="Matriz de meses pagados, se desplaza en horizontal">
			<table class="matriz__tabla">
				<caption>
					Meses pagados de {{ data().salon }}
				</caption>
				<thead>
					<tr>
						<th scope="col" class="col-alumno" rowspan="2">Alumno</th>
						<th scope="colgroup" [attr.colspan]="data().pensiones.length || 1" class="grupo">Pensiones</th>
						<th scope="col" rowspan="2" class="num grupo-inicio">Meses pagados</th>
						<th scope="colgroup" colspan="3" class="grupo grupo-inicio">Informativas (no suman)</th>
					</tr>
					<tr>
						@for (p of data().pensiones; track p.numero) {
							<th scope="col" class="celda-col">{{ p.etiqueta }}</th>
						}
						<th scope="col" class="celda-col grupo-inicio">Matrícula</th>
						<th scope="col" class="celda-col">Inscripción</th>
						<th scope="col" class="celda-col">Útiles</th>
					</tr>
				</thead>
				<tbody>
					@for (fila of data().filas; track fila.estudianteId) {
						<tr>
							<th scope="row" class="col-alumno">{{ fila.estudiante }}</th>
							@for (p of data().pensiones; track p.numero; let i = $index) {
								<td class="celda-col">
									@if (fila.pensiones[i]; as celda) {
										<app-meses-pagados-celda [celda]="celda" [columna]="p.etiqueta" />
									}
								</td>
							}
							<td class="num grupo-inicio strong">{{ fila.mesesPagados }}</td>
							<td class="celda-col grupo-inicio">
								<app-meses-pagados-celda [celda]="fila.matricula" columna="Matrícula" />
							</td>
							<td class="celda-col">
								<app-meses-pagados-celda [celda]="fila.inscripcion" columna="Inscripción" />
							</td>
							<td class="celda-col">
								<app-meses-pagados-celda [celda]="fila.utiles" columna="Útiles" />
							</td>
						</tr>
					}
				</tbody>
				<tfoot>
					<tr>
						<th scope="row" class="col-alumno">Pagaron la cuota ({{ data().totales.alumnos }} alumnos)</th>
						@for (total of data().totales.pensionesPagadas; track $index) {
							<td class="celda-col num strong">{{ total }}</td>
						}
						<td class="num grupo-inicio strong">{{ data().totales.mesesPagados }}</td>
						<td colspan="3" class="grupo-inicio"></td>
					</tr>
				</tfoot>
			</table>
		</div>
	`,
	styleUrl: './meses-pagados-tabla.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MesesPagadosTablaComponent {
	readonly data = input.required<MesesPagados>();
}
