import { Component, ChangeDetectionStrategy, input, output, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SelectModule } from 'primeng/select';
import { TagModule } from 'primeng/tag';
import { GruposResumenDto } from '@features/intranet/pages/estudiante/models';

@Component({
	selector: 'app-estudiante-grupos-tab',
	standalone: true,
	imports: [CommonModule, FormsModule, SelectModule, TagModule],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: './estudiante-grupos-tab.component.html',
	styleUrl: './estudiante-grupos-tab.component.scss',
})
export class EstudianteGruposTabComponent {
	// #region Inputs/Outputs
	readonly gruposData = input<GruposResumenDto | null>(null);
	readonly loading = input<boolean>(false);
	readonly cursoOptions = input<{ label: string; value: number }[]>([]);
	readonly selectedCurso = input<number | null>(null);
	readonly cursoChange = output<number>();
	// #endregion

	// #region Estado local
	selectedCursoLocal: number | null = null;
	// #endregion

	// #region Computed
	readonly grupos = computed(() => this.gruposData()?.grupos ?? []);
	readonly sinGrupo = computed(() => this.gruposData()?.estudiantesSinGrupo ?? []);
	readonly hasData = computed(() => this.gruposData() !== null);
	// #endregion

	constructor() {
		effect(() => {
			const opts = this.cursoOptions();
			if (opts.length > 0 && !this.selectedCursoLocal) {
				this.selectedCursoLocal = opts[0].value;
				this.cursoChange.emit(opts[0].value);
			}
		});
	}

	// #region Handlers
	onCursoChange(value: number): void {
		this.selectedCursoLocal = value;
		this.cursoChange.emit(value);
	}
	// #endregion
}
