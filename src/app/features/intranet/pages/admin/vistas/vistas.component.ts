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

import { logger } from '@core/helpers';
import { ErrorHandlerService, PermisosService, Vista } from '@core/services';
import { AdminUtilsService } from '@shared/services';
import {
	UI_ADMIN_ERROR_DETAILS,
	UI_SUMMARIES,
	buildDeleteVistaMessage,
} from '@app/shared/constants';

interface VistaForm {
	ruta: string;
	nombre: string;
	estado: number;
}

@Component({
	selector: 'app-vistas',
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
	],
	templateUrl: './vistas.component.html',
	styleUrl: './vistas.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VistasComponent implements OnInit {
	private permisosService = inject(PermisosService);
	private destroyRef = inject(DestroyRef);
	private errorHandler = inject(ErrorHandlerService);
	readonly adminUtils = inject(AdminUtilsService);

	// State
	vistas = signal<Vista[]>([]);
	loading = signal(false);

	// Dialogs
	dialogVisible = signal(false);
	isEditing = signal(false);

	// Form
	selectedVista = signal<Vista | null>(null);
	formData = signal<VistaForm>({ ruta: '', nombre: '', estado: 1 });

	// Filters
	searchTerm = signal('');
	filterModulo = signal<string | null>(null);
	filterEstado = signal<number | null>(null);

	// Options
	estadoOptions = [
		{ label: 'Todos', value: null },
		{ label: 'Activas', value: 1 },
		{ label: 'Inactivas', value: 0 },
	];

	// Computed - Modules
	modulos = computed(() => {
		const modulosSet = new Set<string>();
		this.vistas().forEach((v) => {
			modulosSet.add(this.adminUtils.getModuloFromRuta(v.ruta));
		});
		return Array.from(modulosSet).sort();
	});

	modulosOptions = computed(() => {
		return [{ label: 'Todos los modulos', value: null as string | null }].concat(
			this.modulos().map((m) => ({
				label: m.charAt(0).toUpperCase() + m.slice(1),
				value: m as string | null,
			})),
		);
	});

	// Computed - Statistics
	totalVistas = computed(() => this.vistas().length);
	vistasActivas = computed(() => this.vistas().filter((v) => v.estado === 1).length);
	vistasInactivas = computed(() => this.vistas().filter((v) => v.estado === 0).length);
	totalModulos = computed(() => this.modulos().length);

	// Computed - Filtered data
	filteredVistas = computed(() => {
		let data = this.vistas();
		const search = this.searchTerm().toLowerCase();
		const filtroModulo = this.filterModulo();
		const filtroEstado = this.filterEstado();

		if (search) {
			data = data.filter(
				(v) =>
					v.nombre.toLowerCase().includes(search) ||
					v.ruta.toLowerCase().includes(search),
			);
		}

		if (filtroModulo) {
			data = data.filter((v) => this.adminUtils.getModuloFromRuta(v.ruta) === filtroModulo);
		}

		if (filtroEstado !== null) {
			data = data.filter((v) => v.estado === filtroEstado);
		}

		return data;
	});

	ngOnInit(): void {
		this.loadData();
	}

	loadData(): void {
		this.loading.set(true);

		this.permisosService
			.getVistas()
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: (vistas) => {
					this.vistas.set(vistas);
					this.loading.set(false);
				},
				error: (err) => {
					logger.error('Error al cargar vistas:', err);
					this.errorHandler.showError(
						UI_SUMMARIES.error,
						UI_ADMIN_ERROR_DETAILS.loadVistas,
					);
					this.loading.set(false);
				},
			});
	}

	refresh(): void {
		this.loadData();
	}

	clearFilters(): void {
		this.searchTerm.set('');
		this.filterModulo.set(null);
		this.filterEstado.set(null);
	}

	// === Edit Dialog ===
	openNew(): void {
		this.selectedVista.set(null);
		this.formData.set({ ruta: '', nombre: '', estado: 1 });
		this.isEditing.set(false);
		this.dialogVisible.set(true);
	}

	editVista(vista: Vista): void {
		this.selectedVista.set(vista);
		this.formData.set({
			ruta: vista.ruta,
			nombre: vista.nombre,
			estado: vista.estado ?? 1,
		});
		this.isEditing.set(true);
		this.dialogVisible.set(true);
	}

	hideDialog(): void {
		this.dialogVisible.set(false);
	}

	saveVista(): void {
		const data = this.formData();
		this.loading.set(true);

		const operation$ = this.isEditing()
			? (() => {
					const vista = this.selectedVista();
					if (!vista) return null;
					return this.permisosService.actualizarVista(vista.id, {
						ruta: data.ruta,
						nombre: data.nombre,
						estado: data.estado,
					});
				})()
			: this.permisosService.crearVista({
					ruta: data.ruta,
					nombre: data.nombre,
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
				this.errorHandler.showError(
					UI_SUMMARIES.error,
					UI_ADMIN_ERROR_DETAILS.saveVista,
				);
				this.loading.set(false);
			},
		});
	}

	deleteVista(vista: Vista): void {
		if (confirm(buildDeleteVistaMessage(vista.nombre))) {
			this.loading.set(true);
			this.permisosService
				.eliminarVista(vista.id)
				.pipe(takeUntilDestroyed(this.destroyRef))
				.subscribe({
					next: () => this.loadData(),
					error: (err) => {
						logger.error('Error al eliminar:', err);
						this.errorHandler.showError(
							UI_SUMMARIES.error,
							UI_ADMIN_ERROR_DETAILS.deleteVista,
						);
						this.loading.set(false);
					},
				});
		}
	}

	toggleEstado(vista: Vista): void {
		const nuevoEstado = vista.estado === 1 ? 0 : 1;
		this.loading.set(true);
		this.permisosService
			.actualizarVista(vista.id, {
				ruta: vista.ruta,
				nombre: vista.nombre,
				estado: nuevoEstado,
			})
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: () => this.loadData(),
			error: (err) => {
				logger.error('Error al cambiar estado:', err);
				this.errorHandler.showError(
					UI_SUMMARIES.error,
					UI_ADMIN_ERROR_DETAILS.changeEstado,
				);
				this.loading.set(false);
			},
		});
	}

	// === UI Helpers ===
	isFormValid(): boolean {
		const data = this.formData();
		return !!(data.ruta && data.nombre);
	}

	updateFormField(field: keyof VistaForm, value: unknown): void {
		this.formData.update((current) => ({ ...current, [field]: value }));
	}
}
