import {
	ChangeDetectionStrategy,
	Component,
	DestroyRef,
	inject,
	OnInit,
	signal,
	computed,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { TooltipModule } from 'primeng/tooltip';
import { TagModule } from 'primeng/tag';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { ToggleSwitch } from 'primeng/toggleswitch';
import { MultiSelectModule } from 'primeng/multiselect';

import { logger } from '@core/helpers';
import { ErrorHandlerService } from '@core/services';
import { CursosService, Curso } from '@core/services/cursos';
import { GradosService, Grado } from '@core/services/grados/grados.service';
import { AdminUtilsService } from '@shared/services';

interface CursoForm {
	nombre: string;
	estado: boolean;
	gradosIds: number[];
}

@Component({
	selector: 'app-cursos',
	standalone: true,
	imports: [
		CommonModule,
		FormsModule,
		TableModule,
		ButtonModule,
		DialogModule,
		TooltipModule,
		TagModule,
		ProgressSpinnerModule,
		InputTextModule,
		SelectModule,
		ToggleSwitch,
		MultiSelectModule,
	],
	templateUrl: './cursos.component.html',
	styleUrl: './cursos.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CursosComponent implements OnInit {
	private cursosService = inject(CursosService);
	private gradosService = inject(GradosService);
	private destroyRef = inject(DestroyRef);
	private errorHandler = inject(ErrorHandlerService);
	readonly adminUtils = inject(AdminUtilsService);

	// ============ Estado ============
	cursos = signal<Curso[]>([]);
	grados = signal<Grado[]>([]);
	loading = signal(false);

	// ============ Computed - Grados por nivel ============
	readonly gradosInicial = computed(() =>
		this.grados()
			.filter((g) => g.nombre.toUpperCase().includes('INICIAL'))
			.map((g) => ({
				id: g.id,
				nombre: g.nombre.replace(/INICIAL\s*/i, '').trim(),
			})),
	);

	readonly gradosPrimaria = computed(() =>
		this.grados()
			.filter((g) => g.nombre.toUpperCase().includes('PRIMARIA'))
			.map((g) => ({
				id: g.id,
				nombre: g.nombre.replace(/PRIMARIA/i, '').trim(),
			})),
	);

	readonly gradosSecundaria = computed(() =>
		this.grados()
			.filter((g) => g.nombre.toUpperCase().includes('SECUNDARIA'))
			.map((g) => ({
				id: g.id,
				nombre: g.nombre.replace(/SECUNDARIA/i, '').trim(),
			})),
	);

	// ============ Selecciones por nivel ============
	readonly selectedInicial = signal<number[]>([]);
	readonly selectedPrimaria = signal<number[]>([]);
	readonly selectedSecundaria = signal<number[]>([]);

	// Computed que combina todas las selecciones
	readonly allGradosIds = computed(() => [
		...this.selectedInicial(),
		...this.selectedPrimaria(),
		...this.selectedSecundaria(),
	]);

	// ============ Computed - Grados disponibles (no seleccionados) por nivel ============
	readonly availableInicial = computed(() =>
		this.gradosInicial().filter((g) => !this.selectedInicial().includes(g.id)),
	);

	readonly availablePrimaria = computed(() =>
		this.gradosPrimaria().filter((g) => !this.selectedPrimaria().includes(g.id)),
	);

	readonly availableSecundaria = computed(() =>
		this.gradosSecundaria().filter((g) => !this.selectedSecundaria().includes(g.id)),
	);

	// ============ Computed - Grados seleccionados con nombres formateados ============
	readonly selectedGradosInicial = computed(() =>
		this.gradosInicial().filter((g) => this.selectedInicial().includes(g.id)),
	);

	readonly selectedGradosPrimaria = computed(() =>
		this.gradosPrimaria().filter((g) => this.selectedPrimaria().includes(g.id)),
	);

	readonly selectedGradosSecundaria = computed(() =>
		this.gradosSecundaria().filter((g) => this.selectedSecundaria().includes(g.id)),
	);

	// ============ Computed - Grados del curso seleccionado para visualización ============
	readonly cursoGradosInicial = computed(() => {
		const curso = this.selectedCursoForGrados();
		if (!curso?.grados) return [];
		return curso.grados.filter((g) => g.nombre.toUpperCase().includes('INICIAL'));
	});

	readonly cursoGradosPrimaria = computed(() => {
		const curso = this.selectedCursoForGrados();
		if (!curso?.grados) return [];
		return curso.grados.filter((g) => g.nombre.toUpperCase().includes('PRIMARIA'));
	});

	readonly cursoGradosSecundaria = computed(() => {
		const curso = this.selectedCursoForGrados();
		if (!curso?.grados) return [];
		return curso.grados.filter((g) => g.nombre.toUpperCase().includes('SECUNDARIA'));
	});

	// ============ Dialogs ============
	dialogVisible = signal(false);
	isEditing = signal(false);
	gradosDialogVisible = signal(false);
	selectedCursoForGrados = signal<Curso | null>(null);

	// ============ Form ============
	selectedCurso = signal<Curso | null>(null);
	formData = signal<CursoForm>({ nombre: '', estado: true, gradosIds: [] });

	// ============ Filters ============
	searchTerm = signal('');
	filterEstado = signal<boolean | null>(null);
	filterNivel = signal<string | null>(null);

	// ============ Options ============
	estadoOptions = [
		{ label: 'Todos', value: null },
		{ label: 'Activos', value: true },
		{ label: 'Inactivos', value: false },
	];

	nivelOptions = [
		{ label: 'Todos los niveles', value: null },
		{ label: 'Inicial', value: 'INICIAL' },
		{ label: 'Primaria', value: 'PRIMARIA' },
		{ label: 'Secundaria', value: 'SECUNDARIA' },
	];

	// ============ Computed - Statistics ============
	totalCursos = computed(() => this.cursos().length);
	cursosActivos = computed(() => this.cursos().filter((c) => c.estado).length);
	cursosInactivos = computed(() => this.cursos().filter((c) => !c.estado).length);

	// ============ Computed - Filtered data ============
	filteredCursos = computed(() => {
		let data = this.cursos();
		const search = this.searchTerm().toLowerCase();
		const filtroEstado = this.filterEstado();
		const filtroNivel = this.filterNivel();

		if (search) {
			data = data.filter((c) => c.nombre.toLowerCase().includes(search));
		}

		if (filtroEstado !== null) {
			data = data.filter((c) => c.estado === filtroEstado);
		}

		if (filtroNivel !== null) {
			data = data.filter((c) =>
				c.grados?.some((g) => g.nombre.toUpperCase().includes(filtroNivel))
			);
		}

		return data;
	});

	ngOnInit(): void {
		this.loadData();
		this.loadGrados();
	}

	loadData(): void {
		this.loading.set(true);

		this.cursosService
			.getCursos()
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: (cursos) => {
					this.cursos.set(cursos);
					this.loading.set(false);
				},
				error: (err) => {
					logger.error('Error al cargar cursos:', err);
					this.errorHandler.showError('Error', 'No se pudieron cargar los cursos');
					this.loading.set(false);
				},
			});
	}

	loadGrados(): void {
		this.gradosService
			.getGrados()
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: (grados) => {
					this.grados.set(grados);
				},
				error: (err) => {
					logger.error('Error al cargar grados:', err);
					this.errorHandler.showError('Error', 'No se pudieron cargar los grados');
				},
			});
	}

	refresh(): void {
		this.loadData();
	}

	clearFilters(): void {
		this.searchTerm.set('');
		this.filterEstado.set(null);
		this.filterNivel.set(null);
	}

	// ============ Edit Dialog ============
	openNew(): void {
		this.selectedCurso.set(null);
		this.formData.set({ nombre: '', estado: true, gradosIds: [] });
		this.selectedInicial.set([]);
		this.selectedPrimaria.set([]);
		this.selectedSecundaria.set([]);
		this.isEditing.set(false);
		this.dialogVisible.set(true);
	}

	editCurso(curso: Curso): void {
		this.selectedCurso.set(curso);
		this.formData.set({
			nombre: curso.nombre,
			estado: curso.estado ?? true,
			gradosIds: curso.grados?.map((g) => g.id) || [],
		});

		// Dividir gradosIds por nivel
		const gradosIds = curso.grados?.map((g) => g.id) || [];
		const inicialIds = this.gradosInicial().map((g) => g.id);
		const primariaIds = this.gradosPrimaria().map((g) => g.id);
		const secundariaIds = this.gradosSecundaria().map((g) => g.id);

		this.selectedInicial.set(gradosIds.filter((id) => inicialIds.includes(id)));
		this.selectedPrimaria.set(gradosIds.filter((id) => primariaIds.includes(id)));
		this.selectedSecundaria.set(gradosIds.filter((id) => secundariaIds.includes(id)));

		this.isEditing.set(true);
		this.dialogVisible.set(true);
	}

	hideDialog(): void {
		this.dialogVisible.set(false);
	}

	// ============ Grados Dialog ============
	showGrados(curso: Curso): void {
		this.selectedCursoForGrados.set(curso);
		this.gradosDialogVisible.set(true);
	}

	hideGradosDialog(): void {
		this.gradosDialogVisible.set(false);
		this.selectedCursoForGrados.set(null);
	}

	// ============ Grado Selection Management ============
	addGrado(gradoId: number): void {
		// Determinar a qué nivel pertenece el grado
		const isInicial = this.gradosInicial().some((g) => g.id === gradoId);
		const isPrimaria = this.gradosPrimaria().some((g) => g.id === gradoId);
		const isSecundaria = this.gradosSecundaria().some((g) => g.id === gradoId);

		if (isInicial) {
			this.selectedInicial.update((ids) => [...ids, gradoId]);
		} else if (isPrimaria) {
			this.selectedPrimaria.update((ids) => [...ids, gradoId]);
		} else if (isSecundaria) {
			this.selectedSecundaria.update((ids) => [...ids, gradoId]);
		}
	}

	removeGrado(gradoId: number): void {
		// Buscar en qué nivel está el grado y removerlo
		if (this.selectedInicial().includes(gradoId)) {
			this.selectedInicial.update((ids) => ids.filter((id) => id !== gradoId));
		} else if (this.selectedPrimaria().includes(gradoId)) {
			this.selectedPrimaria.update((ids) => ids.filter((id) => id !== gradoId));
		} else if (this.selectedSecundaria().includes(gradoId)) {
			this.selectedSecundaria.update((ids) => ids.filter((id) => id !== gradoId));
		}
	}

	saveCurso(): void {
		const data = this.formData();
		const gradosIds = this.allGradosIds();

		this.loading.set(true);

		const operation$ = this.isEditing()
			? (() => {
					const curso = this.selectedCurso();
					if (!curso) return null;
					return this.cursosService.actualizarCurso(curso.id, {
						nombre: data.nombre,
						estado: data.estado,
						gradosIds: gradosIds,
					});
				})()
			: this.cursosService.crearCurso({
					nombre: data.nombre,
					gradosIds: gradosIds,
				});

		if (!operation$) {
			this.loading.set(false);
			return;
		}

		operation$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
			next: () => {
				this.hideDialog();
				this.loadData();
			},
			error: (err) => {
				logger.error('Error:', err);
				this.errorHandler.showError('Error', 'No se pudo guardar el curso');
				this.loading.set(false);
			},
		});
	}

	deleteCurso(curso: Curso): void {
		if (confirm(`¿Está seguro de eliminar el curso "${curso.nombre}"?`)) {
			this.loading.set(true);
			this.cursosService
				.eliminarCurso(curso.id)
				.pipe(takeUntilDestroyed(this.destroyRef))
				.subscribe({
					next: () => this.loadData(),
					error: (err) => {
						logger.error('Error al eliminar:', err);
						this.errorHandler.showError('Error', 'No se pudo eliminar el curso');
						this.loading.set(false);
					},
				});
		}
	}

	toggleEstado(curso: Curso): void {
		const nuevoEstado = !curso.estado;
		this.loading.set(true);
		this.cursosService
			.actualizarCurso(curso.id, {
				nombre: curso.nombre,
				estado: nuevoEstado,
				gradosIds: curso.grados?.map((g) => g.id) || [],
			})
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: () => this.loadData(),
				error: (err) => {
					logger.error('Error al cambiar estado:', err);
					this.errorHandler.showError('Error', 'No se pudo cambiar el estado');
					this.loading.set(false);
				},
			});
	}

	// ============ UI Helpers ============
	isFormValid(): boolean {
		const data = this.formData();
		return !!data.nombre?.trim();
	}

	updateFormField(field: keyof CursoForm, value: unknown): void {
		this.formData.update((current) => ({ ...current, [field]: value }));
	}
}
