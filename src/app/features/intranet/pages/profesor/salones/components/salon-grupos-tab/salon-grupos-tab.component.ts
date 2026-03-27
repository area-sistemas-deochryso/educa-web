import { Component, ChangeDetectionStrategy, inject, input, output, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CdkDropList, CdkDrag, CdkDragHandle, CdkDragDrop } from '@shared/directives/drag-drop';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { DialogModule } from 'primeng/dialog';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { SkeletonModule } from 'primeng/skeleton';
import { CheckboxModule } from 'primeng/checkbox';
import { ConfirmationService } from 'primeng/api';
import {
	GrupoContenidoDto,
	GrupoEstudianteDto,
	EstudianteSinGrupoDto,
} from '../../../models';

interface DragData {
	estudianteId: number;
	grupoId: number | null;
}

interface DropListData {
	grupoId: number | null;
}

@Component({
	selector: 'app-salon-grupos-tab',
	standalone: true,
	imports: [
		CommonModule,
		FormsModule,
		CdkDropList,
		CdkDrag,
		CdkDragHandle,
		ButtonModule,
		InputTextModule,
		SelectModule,
		TagModule,
		TooltipModule,
		DialogModule,
		ConfirmDialogModule,
		SkeletonModule,
		CheckboxModule,
	],
	providers: [ConfirmationService],
	templateUrl: './salon-grupos-tab.component.html',
	styleUrl: './salon-grupos-tab.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SalonGruposTabComponent {
	private readonly confirmationService = inject(ConfirmationService);

	// #region Inputs
	readonly grupos = input<GrupoContenidoDto[]>([]);
	readonly estudiantesSinGrupo = input<EstudianteSinGrupoDto[]>([]);
	readonly maxEstudiantesPorGrupo = input<number | null>(null);
	readonly loading = input<boolean>(false);
	readonly saving = input<boolean>(false);
	readonly noContenido = input<boolean>(false);
	readonly contenidoId = input<number | null>(null);
	readonly cursoOptions = input<{ label: string; value: number }[]>([]);
	readonly selectedCurso = input<number | null>(null);
	// Assign dialog
	readonly asignarDialogVisible = input<boolean>(false);
	readonly asignarGrupo = input<GrupoContenidoDto | null>(null);
	// #endregion

	// #region Outputs
	readonly cursoChange = output<number>();
	readonly crearGrupo = output<string>();
	readonly eliminarGrupo = output<number>();
	readonly renombrarGrupo = output<{ grupoId: number; nombre: string }>();
	readonly asignarEstudiantes = output<{ grupoId: number; estudianteIds: number[] }>();
	readonly removerEstudiante = output<{ grupoId: number; estudianteId: number }>();
	readonly dropEstudiante = output<{ estudianteId: number; fromGrupoId: number | null; toGrupoId: number | null }>();
	readonly configurarMax = output<number | null>();
	readonly openAsignar = output<number>();
	readonly closeAsignar = output<void>();
	readonly confirmDialogHide = output<void>();
	// #endregion

	// #region Estado local
	nuevoGrupoNombre = '';
	editingGrupoId = signal<number | null>(null);
	editingGrupoNombre = signal('');
	private readonly _maxInputValue = signal<number | null>(null);
	selectedEstudianteIds = signal<number[]>([]);
	// #endregion

	// #region Computed
	readonly totalEstudiantesEnGrupos = computed(() =>
		this.grupos().reduce((sum, g) => sum + g.estudiantes.length, 0),
	);

	readonly maxLabel = computed(() => {
		const max = this.maxEstudiantesPorGrupo();
		return max ? `Máx: ${max} por grupo` : 'Sin límite';
	});

	readonly maxInputValue = computed(() => this._maxInputValue());

	readonly maxInputDirty = computed(() => {
		const input = this._maxInputValue();
		const stored = this.maxEstudiantesPorGrupo();
		return input !== stored && input !== null && input >= 1;
	});

	readonly dropListIds = computed(() => [
		...this.grupos().map((g) => 'grupo-' + g.id),
		'sin-grupo',
	]);
	// #endregion

	constructor() {
		// Sync max input with server value when it changes
		effect(() => {
			const serverMax = this.maxEstudiantesPorGrupo();
			this._maxInputValue.set(serverMax);
		});
	}

	// #region Event handlers
	onCursoChange(cursoId: number): void {
		this.cursoChange.emit(cursoId);
	}

	onCrearGrupo(): void {
		const nombre = this.nuevoGrupoNombre.trim();
		if (!nombre) return;
		this.crearGrupo.emit(nombre);
		this.nuevoGrupoNombre = '';
	}

	onStartEditing(grupo: GrupoContenidoDto): void {
		this.editingGrupoId.set(grupo.id);
		this.editingGrupoNombre.set(grupo.nombre);
	}

	onCancelEditing(): void {
		this.editingGrupoId.set(null);
		this.editingGrupoNombre.set('');
	}

	onSaveEditing(grupoId: number): void {
		const nombre = this.editingGrupoNombre().trim();
		if (!nombre) return;
		this.renombrarGrupo.emit({ grupoId, nombre });
		this.editingGrupoId.set(null);
		this.editingGrupoNombre.set('');
	}

	onEliminarGrupo(grupo: GrupoContenidoDto): void {
		this.confirmationService.confirm({
			message: `¿Eliminar "${grupo.nombre}"? Los estudiantes volverán a la lista sin grupo.`,
			header: 'Confirmar eliminación',
			acceptLabel: 'Eliminar',
			rejectLabel: 'Cancelar',
			acceptButtonStyleClass: 'p-button-danger',
			accept: () => this.eliminarGrupo.emit(grupo.id),
		});
	}

	onOpenAsignar(grupoId: number): void {
		this.selectedEstudianteIds.set([]);
		this.openAsignar.emit(grupoId);
	}

	onCloseAsignar(): void {
		this.closeAsignar.emit();
		this.selectedEstudianteIds.set([]);
	}

	onAsignarEstudiantes(): void {
		const grupo = this.asignarGrupo();
		if (!grupo) return;
		const ids = this.selectedEstudianteIds();
		if (ids.length === 0) return;
		this.asignarEstudiantes.emit({ grupoId: grupo.id, estudianteIds: ids });
	}

	onRemoverEstudiante(grupoId: number, estudiante: GrupoEstudianteDto): void {
		this.confirmationService.confirm({
			message: `¿Remover a "${estudiante.estudianteNombre}" de este grupo?`,
			header: 'Confirmar',
			acceptLabel: 'Remover',
			rejectLabel: 'Cancelar',
			accept: () => this.removerEstudiante.emit({ grupoId, estudianteId: estudiante.estudianteId }),
		});
	}

	onMaxInputChange(value: number | string | null): void {
		const num = typeof value === 'string' ? parseInt(value, 10) : value;
		this._maxInputValue.set(num && !isNaN(num) ? Math.min(Math.max(num, 1), 50) : null);
	}

	onSaveMax(): void {
		const val = this._maxInputValue();
		if (val !== null && val >= 1) {
			this.configurarMax.emit(val);
		}
	}

	toggleEstudiante(estudianteId: number): void {
		this.selectedEstudianteIds.update((ids) => {
			if (ids.includes(estudianteId)) {
				return ids.filter((id) => id !== estudianteId);
			}
			return [...ids, estudianteId];
		});
	}

	grupoCountLabel(grupo: GrupoContenidoDto): string {
		const max = this.maxEstudiantesPorGrupo();
		const count = grupo.estudiantes.length;
		return max ? `${count}/${max}` : `${count}`;
	}

	onDrop(event: CdkDragDrop<DropListData, DropListData, DragData>): void {
		if (event.previousContainer === event.container) return;

		const { estudianteId, grupoId: fromGrupoId } = event.item.data;
		const { grupoId: toGrupoId } = event.container.data;

		this.dropEstudiante.emit({ estudianteId, fromGrupoId, toGrupoId });
	}
	// #endregion

	// #region Dialog handlers
	onAsignarDialogVisibleChange(visible: boolean): void {
		if (!visible) {
			this.onCloseAsignar();
		}
	}

	onConfirmDialogHide(): void {
		this.confirmDialogHide.emit();
	}
	// #endregion
}
