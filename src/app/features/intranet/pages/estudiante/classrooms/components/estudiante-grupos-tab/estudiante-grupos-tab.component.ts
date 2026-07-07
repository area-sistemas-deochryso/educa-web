import { Component, ChangeDetectionStrategy, input, output, computed, effect, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SelectModule } from 'primeng/select';
import { TagModule } from 'primeng/tag';
import { GruposResumenDto, GrupoContenidoDto } from '@features/intranet/pages/estudiante/models';
import { AuthStore } from '@core/store';

@Component({
	selector: 'app-estudiante-grupos-tab',
	standalone: true,
	imports: [CommonModule, FormsModule, SelectModule, TagModule],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: './estudiante-grupos-tab.component.html',
	styleUrl: './estudiante-grupos-tab.component.scss',
})
export class EstudianteGruposTabComponent {
	private readonly authStore = inject(AuthStore);

	readonly gruposData = input<GruposResumenDto | null>(null);
	readonly loading = input<boolean>(false);
	readonly cursoOptions = input<{ label: string; value: number }[]>([]);
	readonly selectedCurso = input<number | null>(null);
	readonly cursoChange = output<number>();

	selectedCursoLocal: number | null = null;

	readonly currentEstudianteId = computed(() => this.authStore.user()?.entityId ?? null);

	readonly myGroup = computed<GrupoContenidoDto | null>(() => {
		const id = this.currentEstudianteId();
		if (!id) return null;
		const grupos = this.gruposData()?.grupos ?? [];
		return grupos.find((g) => g.estudiantes.some((e) => e.estudianteId === id)) ?? null;
	});

	readonly otherGroups = computed<GrupoContenidoDto[]>(() => {
		const my = this.myGroup();
		const grupos = this.gruposData()?.grupos ?? [];
		return my ? grupos.filter((g) => g.id !== my.id) : grupos;
	});

	readonly sinGrupo = computed(() => this.gruposData()?.estudiantesSinGrupo ?? []);
	readonly hasData = computed(() => this.gruposData() !== null);

	readonly isCurrentStudentUnassigned = computed(() => {
		const id = this.currentEstudianteId();
		if (!id) return false;
		return !this.myGroup() && this.sinGrupo().some((e) => e.estudianteId === id);
	});

	constructor() {
		effect(() => {
			const opts = this.cursoOptions();
			if (opts.length > 0 && !this.selectedCursoLocal) {
				this.selectedCursoLocal = opts[0].value;
				this.cursoChange.emit(opts[0].value);
			}
		});
	}

	onCursoChange(value: number): void {
		this.selectedCursoLocal = value;
		this.cursoChange.emit(value);
	}

	isMe(estudianteId: number): boolean {
		return estudianteId === this.currentEstudianteId();
	}
}
