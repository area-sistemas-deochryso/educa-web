import { Component, ChangeDetectionStrategy, inject, input, computed, effect, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Select } from 'primeng/select';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { CardModule } from 'primeng/card';
import { PageHeaderComponent } from '@intranet-shared/components';
import { SkeletonLoaderComponent } from '@shared/components';
import { EstudianteNotasFacade } from './services/estudiante-notas.facade';
import { NotasCursoCardComponent } from './components/notas-curso-card/notas-curso-card.component';
import { SimuladorNotasComponent } from './components/simulador-notas/simulador-notas.component';

@Component({
	selector: 'app-estudiante-notas',
	standalone: true,
	imports: [
		CommonModule,
		FormsModule,
		Select,
		ButtonModule,
		TagModule,
		CardModule,
		PageHeaderComponent,
		SkeletonLoaderComponent,
		NotasCursoCardComponent,
		SimuladorNotasComponent,
	],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: './estudiante-notas.component.html',
	styleUrl: './estudiante-notas.component.scss',
})
export class EstudianteNotasComponent implements OnInit {
	private readonly facade = inject(EstudianteNotasFacade);
	private readonly rawVm = this.facade.vm;

	/** Cuando se define, restringe la vista a estos nombres de curso (uso embebido en el tab de salón). */
	readonly cursoNombres = input<string[] | null>(null);
	/** Oculta el header de página cuando se embebe dentro de otro contenedor (ej. tab de salón). */
	readonly embedded = input(false);

	readonly vm = computed(() => {
		const raw = this.rawVm();
		const filter = this.cursoNombres();
		if (!filter) return { ...raw, isEmptyFiltered: false };

		const cursoOptions = raw.cursoOptions.filter((_, i) =>
			filter.includes(raw.cursos[i]?.cursoNombre),
		);
		const selectedCurso = cursoOptions.some((o) => o.value === raw.selectedCursoIndex)
			? raw.selectedCurso
			: (raw.cursos[cursoOptions[0]?.value] ?? null);

		return { ...raw, cursoOptions, selectedCurso, isEmptyFiltered: cursoOptions.length === 0 };
	});

	constructor() {
		// Auto-selecciona el primer curso del salón filtrado cuando cambian los datos.
		effect(() => {
			const filter = this.cursoNombres();
			if (!filter) return;
			const options = this.vm().cursoOptions;
			if (options.length > 0 && !options.some((o) => o.value === this.facade.vm().selectedCursoIndex)) {
				this.facade.selectCurso(options[0].value);
			}
		});
	}

	ngOnInit(): void {
		this.facade.loadNotas();
	}

	// #region Event handlers
	onRetry(): void {
		this.facade.loadNotas();
	}

	onCursoChange(index: number): void {
		this.facade.selectCurso(index);
	}

	onOpenSimulador(): void {
		this.facade.openSimulador();
	}

	onCloseSimulador(): void {
		this.facade.closeSimulador();
	}

	onSimulacionChange(event: { calificacionId: number; nota: number | null }): void {
		this.facade.updateSimulacion(event.calificacionId, event.nota);
	}

	onResetSimulacion(): void {
		this.facade.resetSimulacion();
	}
	// #endregion
}
