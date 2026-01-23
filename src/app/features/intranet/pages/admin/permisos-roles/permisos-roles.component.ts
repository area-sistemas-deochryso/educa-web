import { Component, DestroyRef, inject, OnInit, signal, computed } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { forkJoin, switchMap } from 'rxjs';

import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { MultiSelectModule } from 'primeng/multiselect';
import { TooltipModule } from 'primeng/tooltip';
import { TagModule } from 'primeng/tag';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { InputTextModule } from 'primeng/inputtext';
import { CheckboxModule } from 'primeng/checkbox';
import { DrawerModule } from 'primeng/drawer';
import { SelectModule } from 'primeng/select';

import { PermisosService, PermisoRol, Vista, ROLES_DISPONIBLES, RolTipo } from '@core/services';

interface ModuloVistas {
	nombre: string;
	vistas: Vista[];
	seleccionadas: number;
	total: number;
}

@Component({
	selector: 'app-permisos-roles',
	standalone: true,
	imports: [
		CommonModule,
		FormsModule,
		TableModule,
		ButtonModule,
		DialogModule,
		MultiSelectModule,
		TooltipModule,
		TagModule,
		ProgressSpinnerModule,
		InputTextModule,
		CheckboxModule,
		DrawerModule,
		SelectModule,
	],
	templateUrl: './permisos-roles.component.html',
	styleUrl: './permisos-roles.component.scss',
})
export class PermisosRolesComponent implements OnInit {
	private permisosService = inject(PermisosService);
	private destroyRef = inject(DestroyRef);

	// State
	permisosRol = signal<PermisoRol[]>([]);
	vistas = signal<Vista[]>([]);
	loading = signal(false);

	// Dialogs
	dialogVisible = signal(false);
	detailDrawerVisible = signal(false);
	isEditing = signal(false);

	// Form
	selectedPermiso = signal<PermisoRol | null>(null);
	selectedRol = signal<RolTipo | null>(null);
	selectedVistas = signal<string[]>([]);

	// Edit modal - module tabs
	modulosVistas = signal<ModuloVistas[]>([]);
	activeModuloIndex = signal(0);
	vistasBusqueda = signal('');

	// Options
	rolesDisponibles = ROLES_DISPONIBLES;
	rolesSelectOptions: { label: string; value: RolTipo }[] = [];

	// Computed - Statistics
	totalRoles = computed(() => this.permisosRol().length);

	totalVistas = computed(() => this.vistas().length);

	totalModulos = computed(() => {
		const modulos = new Set<string>();
		this.vistas().forEach((v) => {
			const modulo = this.getModuloFromRuta(v.ruta);
			modulos.add(modulo);
		});
		return modulos.size;
	});

	rolesConfigurados = computed(() => this.permisosRol().length);

	// Computed - Vistas filtradas por búsqueda en modal de edición
	vistasFiltradas = computed(() => {
		const modulos = this.modulosVistas();
		const busqueda = this.vistasBusqueda().toLowerCase();
		const activeIndex = this.activeModuloIndex();

		if (activeIndex >= modulos.length) return [];

		const modulo = modulos[activeIndex];
		if (!busqueda) return modulo.vistas;

		return modulo.vistas.filter(
			(v) =>
				v.nombre.toLowerCase().includes(busqueda) ||
				v.ruta.toLowerCase().includes(busqueda),
		);
	});

	ngOnInit(): void {
		this.loadData();
	}

	loadData(): void {
		this.loading.set(true);

		forkJoin({
			vistas: this.permisosService.getVistas(),
			permisosRol: this.permisosService.getPermisosRol(),
		})
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: ({ vistas, permisosRol }) => {
					this.vistas.set(vistas.filter((v) => v.estado === 1));
					this.permisosRol.set(permisosRol);
					this.updateRolesSelectOptions();
					this.loading.set(false);
				},
				error: () => {
					this.loading.set(false);
				},
			});
	}

	refresh(): void {
		this.loadData();
	}

	private updateRolesSelectOptions(): void {
		const rolesConfigurados = this.permisosRol().map((p) => p.rol);
		this.rolesSelectOptions = this.rolesDisponibles
			.filter((r) => !rolesConfigurados.includes(r))
			.map((r) => ({ label: r, value: r }));
	}

	// === Detail Drawer ===
	openDetail(permiso: PermisoRol): void {
		this.selectedPermiso.set(permiso);
		this.detailDrawerVisible.set(true);
	}

	closeDetail(): void {
		this.detailDrawerVisible.set(false);
	}

	// === Edit Dialog ===
	openNew(): void {
		this.selectedPermiso.set(null);
		this.selectedRol.set(null);
		this.selectedVistas.set([]);
		this.isEditing.set(false);
		this.buildModulosVistas([]);
		this.dialogVisible.set(true);
	}

	editPermiso(permiso: PermisoRol): void {
		this.selectedPermiso.set(permiso);
		this.selectedRol.set(permiso.rol as RolTipo);
		this.selectedVistas.set([...permiso.vistas]);
		this.isEditing.set(true);
		this.buildModulosVistas(permiso.vistas);
		this.dialogVisible.set(true);
	}

	editFromDetail(): void {
		const permiso = this.selectedPermiso();
		if (permiso) {
			this.closeDetail();
			this.editPermiso(permiso);
		}
	}

	hideDialog(): void {
		this.dialogVisible.set(false);
		this.vistasBusqueda.set('');
		this.activeModuloIndex.set(0);
	}

	savePermiso(): void {
		const vistas = this.selectedVistas();
		this.loading.set(true);

		const operation$ = this.isEditing()
			? (() => {
					const permiso = this.selectedPermiso();
					if (!permiso) return null;
					return this.permisosService.actualizarPermisoRol(permiso.id, { vistas });
				})()
			: (() => {
					const rol = this.selectedRol();
					if (!rol) return null;
					return this.permisosService.crearPermisoRol({ rol, vistas });
				})();

		if (!operation$) {
			this.loading.set(false);
			return;
		}

		operation$
			.pipe(
				switchMap(() =>
					forkJoin({
						vistas: this.permisosService.getVistas(),
						permisosRol: this.permisosService.getPermisosRol(),
					}),
				),
				takeUntilDestroyed(this.destroyRef),
			)
			.subscribe({
				next: ({ vistas, permisosRol }) => {
					this.vistas.set(vistas.filter((v) => v.estado === 1));
					this.permisosRol.set(permisosRol);
					this.updateRolesSelectOptions();
					this.loading.set(false);
					this.hideDialog();
				},
				error: (err) => {
					console.error('Error:', err);
					this.loading.set(false);
				},
			});
	}

	deletePermiso(permiso: PermisoRol): void {
		if (confirm(`¿Está seguro de eliminar los permisos del rol "${permiso.rol}"?`)) {
			this.loading.set(true);
			this.permisosService
				.eliminarPermisoRol(permiso.id)
				.pipe(
					switchMap(() =>
						forkJoin({
							vistas: this.permisosService.getVistas(),
							permisosRol: this.permisosService.getPermisosRol(),
						}),
					),
					takeUntilDestroyed(this.destroyRef),
				)
				.subscribe({
					next: ({ vistas, permisosRol }) => {
						this.vistas.set(vistas.filter((v) => v.estado === 1));
						this.permisosRol.set(permisosRol);
						this.updateRolesSelectOptions();
						this.loading.set(false);
					},
					error: (err) => {
						console.error('Error al eliminar:', err);
						this.loading.set(false);
					},
				});
		}
	}

	// === Module/Vista helpers ===
	getModuloFromRuta(ruta: string): string {
		const cleanRuta = ruta.startsWith('/') ? ruta.substring(1) : ruta;
		const parts = cleanRuta.split('/');
		return parts[0] || 'general';
	}

	private buildModulosVistas(vistasSeleccionadas: string[]): void {
		const vistasActivas = this.vistas();
		const modulosMap = new Map<string, Vista[]>();

		// Agrupar vistas por módulo
		vistasActivas.forEach((vista) => {
			const modulo = this.getModuloFromRuta(vista.ruta);
			const moduloCapitalized = modulo.charAt(0).toUpperCase() + modulo.slice(1);

			if (!modulosMap.has(moduloCapitalized)) {
				modulosMap.set(moduloCapitalized, []);
			}
			modulosMap.get(moduloCapitalized)!.push(vista);
		});

		// Convertir a array ordenado
		const modulos: ModuloVistas[] = Array.from(modulosMap.entries())
			.sort((a, b) => a[0].localeCompare(b[0]))
			.map(([nombre, vistas]) => ({
				nombre,
				vistas: vistas.sort((a, b) => a.nombre.localeCompare(b.nombre)),
				seleccionadas: vistas.filter((v) => vistasSeleccionadas.includes(v.ruta)).length,
				total: vistas.length,
			}));

		this.modulosVistas.set(modulos);
	}

	isVistaSelected(ruta: string): boolean {
		return this.selectedVistas().includes(ruta);
	}

	toggleVista(ruta: string): void {
		const current = this.selectedVistas();
		if (current.includes(ruta)) {
			this.selectedVistas.set(current.filter((v) => v !== ruta));
		} else {
			this.selectedVistas.set([...current, ruta]);
		}
		this.updateModuloCount();
	}

	toggleAllVistasModulo(): void {
		const modulos = this.modulosVistas();
		const activeIndex = this.activeModuloIndex();
		if (activeIndex >= modulos.length) return;

		const modulo = modulos[activeIndex];
		const moduloRutas = modulo.vistas.map((v) => v.ruta);
		const current = this.selectedVistas();

		const allSelected = moduloRutas.every((r) => current.includes(r));

		if (allSelected) {
			// Deseleccionar todas
			this.selectedVistas.set(current.filter((r) => !moduloRutas.includes(r)));
		} else {
			// Seleccionar todas
			const nuevas = moduloRutas.filter((r) => !current.includes(r));
			this.selectedVistas.set([...current, ...nuevas]);
		}
		this.updateModuloCount();
	}

	isAllModuloSelected(): boolean {
		const modulos = this.modulosVistas();
		const activeIndex = this.activeModuloIndex();
		if (activeIndex >= modulos.length) return false;

		const modulo = modulos[activeIndex];
		const current = this.selectedVistas();
		return modulo.vistas.every((v) => current.includes(v.ruta));
	}

	private updateModuloCount(): void {
		const modulos = this.modulosVistas();
		const selected = this.selectedVistas();

		const updated = modulos.map((m) => ({
			...m,
			seleccionadas: m.vistas.filter((v) => selected.includes(v.ruta)).length,
		}));

		this.modulosVistas.set(updated);
	}

	// === UI Helpers ===
	getRolSeverity(rol: string): 'success' | 'info' | 'warn' | 'danger' | 'secondary' {
		switch (rol) {
			case 'Director':
				return 'danger';
			case 'Profesor':
				return 'warn';
			case 'Apoderado':
				return 'info';
			case 'Estudiante':
				return 'success';
			default:
				return 'secondary';
		}
	}

	getModulosCount(vistas: string[]): number {
		const modulos = new Set<string>();
		vistas.forEach((v) => modulos.add(this.getModuloFromRuta(v)));
		return modulos.size;
	}

	getVistasCountLabel(): string {
		const count = this.selectedVistas().length;
		return count === 1 ? '1 vista seleccionada' : `${count} vistas seleccionadas`;
	}

	getModuloVistasForDetail(): ModuloVistas[] {
		const permiso = this.selectedPermiso();
		if (!permiso) return [];

		const modulosMap = new Map<string, Vista[]>();
		const vistasActivas = this.vistas();

		permiso.vistas.forEach((ruta) => {
			const modulo = this.getModuloFromRuta(ruta);
			const moduloCapitalized = modulo.charAt(0).toUpperCase() + modulo.slice(1);
			const vista = vistasActivas.find((v) => v.ruta === ruta);

			if (!modulosMap.has(moduloCapitalized)) {
				modulosMap.set(moduloCapitalized, []);
			}
			if (vista) {
				modulosMap.get(moduloCapitalized)!.push(vista);
			}
		});

		return Array.from(modulosMap.entries())
			.sort((a, b) => a[0].localeCompare(b[0]))
			.map(([nombre, vistas]) => ({
				nombre,
				vistas,
				seleccionadas: vistas.length,
				total: vistas.length,
			}));
	}

	getRolesNoConfigurados(): RolTipo[] {
		const rolesConfigurados = this.permisosRol().map((p) => p.rol);
		return this.rolesDisponibles.filter((r) => !rolesConfigurados.includes(r));
	}
}
