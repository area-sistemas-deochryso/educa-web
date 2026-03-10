import { Component, ChangeDetectionStrategy, input, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SelectModule } from 'primeng/select';
import { EstudianteMisNotasDto } from '../../../models';
import { NotasCursoCardComponent } from '../../../notas/components/notas-curso-card/notas-curso-card.component';

@Component({
	selector: 'app-estudiante-notas-salon-tab',
	standalone: true,
	imports: [CommonModule, FormsModule, SelectModule, NotasCursoCardComponent],
	changeDetection: ChangeDetectionStrategy.OnPush,
	template: `
		<!-- #region Curso selector -->
		@if (cursoOptions().length > 1) {
			<div class="tab-header">
				<p-select
					[options]="cursoOptions()"
					[ngModel]="selectedCurso()"
				(ngModelChange)="selectedCurso.set($event)"
					optionLabel="label"
					optionValue="value"
					placeholder="Seleccionar curso"
					appendTo="body"
					styleClass="w-full md:w-20rem"
				/>
			</div>
		}
		<!-- #endregion -->

		<!-- #region Content -->
		@if (loading()) {
			<div class="loading-state">
				<i class="pi pi-spin pi-spinner" style="font-size: 1.5rem"></i>
				<p>Cargando notas...</p>
			</div>
		} @else if (filteredNotas().length === 0) {
			<div class="empty-state">
				<i class="pi pi-chart-bar" style="font-size: 2rem; opacity: 0.3"></i>
				<p>No hay notas disponibles</p>
			</div>
		} @else {
			<div class="notas-container">
				@for (curso of filteredNotas(); track curso.cursoNombre) {
					<app-notas-curso-card
						[curso]="curso"
						[vistaActual]="'periodo'"
					/>
				}
			</div>
		}
		<!-- #endregion -->
	`,
	styles: [`
		.tab-header { margin-bottom: 1rem; }

		.loading-state, .empty-state {
			display: flex;
			flex-direction: column;
			align-items: center;
			justify-content: center;
			gap: 0.75rem;
			min-height: 200px;
			color: var(--text-color-secondary);
			p { margin: 0; font-size: 0.9rem; }
		}

		.notas-container {
			display: flex;
			flex-direction: column;
			gap: 1rem;
		}
	`],
})
export class EstudianteNotasSalonTabComponent {
	// #region Inputs
	readonly notasData = input<EstudianteMisNotasDto[]>([]);
	readonly loading = input<boolean>(false);
	readonly cursoOptions = input<{ label: string; value: number }[]>([]);
	// #endregion

	// #region Estado local
	readonly selectedCurso = signal<number | null>(null);
	// #endregion

	// #region Computed
	readonly filteredNotas = computed(() => {
		const notas = this.notasData();
		const options = this.cursoOptions();

		// Filtrar por salón: solo cursos que pertenecen al salón seleccionado
		const salonCursoNames = new Set(options.map((o) => o.label));
		const salonNotas =
			salonCursoNames.size > 0 ? notas.filter((n) => salonCursoNames.has(n.cursoNombre)) : notas;

		// Filtrar por curso seleccionado
		const selected = this.selectedCurso();
		if (!selected) return salonNotas;

		const opt = options.find((o) => o.value === selected);
		if (!opt) return salonNotas;

		return salonNotas.filter((n) => n.cursoNombre === opt.label);
	});
	// #endregion
}
