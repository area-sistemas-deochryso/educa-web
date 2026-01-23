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
import { InputNumberModule } from 'primeng/inputnumber';
import { SelectModule } from 'primeng/select';
import { InputTextModule } from 'primeng/inputtext';
import { CheckboxModule } from 'primeng/checkbox';
import { TabsModule } from 'primeng/tabs';
import { DrawerModule } from 'primeng/drawer';
import { AutoCompleteModule, AutoCompleteCompleteEvent, AutoCompleteSelectEvent } from 'primeng/autocomplete';

import {
	PermisosService,
	PermisoUsuario,
	PermisoRol,
	Vista,
	ROLES_DISPONIBLES,
	RolTipo,
	UsuarioBusqueda,
} from '@core/services';

interface ModuloVistas {
	nombre: string;
	vistas: Vista[];
	seleccionadas: number;
	total: number;
}

@Component({
	selector: 'app-permisos-usuarios',
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
		InputNumberModule,
		SelectModule,
		InputTextModule,
		CheckboxModule,
		TabsModule,
		DrawerModule,
		AutoCompleteModule,
	],
	templateUrl: './permisos-usuarios.component.html',
	styleUrl: './permisos-usuarios.component.scss',
})
export class PermisosUsuariosComponent implements OnInit {
	private permisosService = inject(PermisosService);
	private destroyRef = inject(DestroyRef);

	// State
	permisosUsuario = signal<PermisoUsuario[]>([]);
	permisosRol = signal<PermisoRol[]>([]);
	vistas = signal<Vista[]>([]);
	loading = signal(false);

	// Dialogs
	dialogVisible = signal(false);
	detailDrawerVisible = signal(false);
	isEditing = signal(false);

	// Form
	selectedPermiso = signal<PermisoUsuario | null>(null);
	selectedUsuarioId = signal<number | null>(null);
	selectedRol = signal<RolTipo | null>(null);
	selectedVistas = signal<string[]>([]);

	// Autocomplete usuarios
	selectedUsuario = signal<UsuarioBusqueda | null>(null);
	usuariosSugeridos = signal<UsuarioBusqueda[]>([]);

	// Filters
	searchTerm = signal('');
	filterRol = signal<RolTipo | null>(null);

	// Edit modal - module tabs
	modulosVistas = signal<ModuloVistas[]>([]);
	activeModuloIndex = signal(0);
	vistasBusqueda = signal('');

	// Options
	rolesDisponibles = ROLES_DISPONIBLES;
	rolesOptions = [{ label: 'Todos los roles', value: null as RolTipo | null }].concat(
		ROLES_DISPONIBLES.map((r) => ({ label: r, value: r as RolTipo | null })),
	);
	rolesSelectOptions = ROLES_DISPONIBLES.map((r) => ({ label: r, value: r }));

	// Computed - Statistics
	totalUsuarios = computed(() => this.permisosUsuario().length);

	totalModulos = computed(() => {
		const modulos = new Set<string>();
		this.vistas().forEach((v) => {
			const modulo = this.getModuloFromRuta(v.ruta);
			modulos.add(modulo);
		});
		return modulos.size;
	});

	// Computed - Filtered data
	filteredPermisos = computed(() => {
		let permisos = this.permisosUsuario();
		const search = this.searchTerm().toLowerCase();
		const filtroRol = this.filterRol();

		if (search) {
			permisos = permisos.filter(
				(p) =>
					p.nombreUsuario?.toLowerCase().includes(search) ||
					p.usuarioId.toString().includes(search),
			);
		}

		if (filtroRol) {
			permisos = permisos.filter((p) => p.rol === filtroRol);
		}

		return permisos;
	});

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
			permisosUsuario: this.permisosService.getPermisosUsuario(),
		})
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: ({ vistas, permisosRol, permisosUsuario }) => {
					this.vistas.set(vistas.filter((v) => v.estado === 1));
					this.permisosRol.set(permisosRol);
					this.permisosUsuario.set(permisosUsuario);
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

	clearFilters(): void {
		this.searchTerm.set('');
		this.filterRol.set(null);
	}

	// === Detail Drawer ===
	openDetail(permiso: PermisoUsuario): void {
		this.selectedPermiso.set(permiso);
		this.detailDrawerVisible.set(true);
	}

	closeDetail(): void {
		this.detailDrawerVisible.set(false);
	}

	// === Edit Dialog ===
	openNew(): void {
		this.selectedPermiso.set(null);
		this.selectedUsuarioId.set(null);
		this.selectedUsuario.set(null);
		this.selectedRol.set(null);
		this.selectedVistas.set([]);
		this.usuariosSugeridos.set([]);
		this.isEditing.set(false);
		this.buildModulosVistas([]);
		this.dialogVisible.set(true);
	}

	editPermiso(permiso: PermisoUsuario): void {
		this.selectedPermiso.set(permiso);
		this.selectedUsuarioId.set(permiso.usuarioId);
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
					return this.permisosService.actualizarPermisoUsuario(permiso.id, { vistas });
				})()
			: (() => {
					const usuarioId = this.selectedUsuarioId();
					const rol = this.selectedRol();
					if (!usuarioId || !rol) return null;
					return this.permisosService.crearPermisoUsuario({ usuarioId, rol, vistas });
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
						permisosUsuario: this.permisosService.getPermisosUsuario(),
					}),
				),
				takeUntilDestroyed(this.destroyRef),
			)
			.subscribe({
				next: ({ vistas, permisosRol, permisosUsuario }) => {
					this.vistas.set(vistas.filter((v) => v.estado === 1));
					this.permisosRol.set(permisosRol);
					this.permisosUsuario.set(permisosUsuario);
					this.loading.set(false);
					this.hideDialog();
				},
				error: (err) => {
					console.error('Error:', err);
					this.loading.set(false);
				},
			});
	}

	deletePermiso(permiso: PermisoUsuario): void {
		const nombre = permiso.nombreUsuario || `ID: ${permiso.usuarioId}`;
		const mensaje = `¿Está seguro de eliminar los permisos personalizados de "${nombre}"?\n\nEl usuario seguirá teniendo los permisos de su rol "${permiso.rol}".`;
		if (confirm(mensaje)) {
			this.loading.set(true);
			this.permisosService
				.eliminarPermisoUsuario(permiso.id)
				.pipe(
					switchMap(() =>
						forkJoin({
							vistas: this.permisosService.getVistas(),
							permisosRol: this.permisosService.getPermisosRol(),
							permisosUsuario: this.permisosService.getPermisosUsuario(),
						}),
					),
					takeUntilDestroyed(this.destroyRef),
				)
				.subscribe({
					next: ({ vistas, permisosRol, permisosUsuario }) => {
						this.vistas.set(vistas.filter((v) => v.estado === 1));
						this.permisosRol.set(permisosRol);
						this.permisosUsuario.set(permisosUsuario);
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

	loadVistasFromRol(): void {
		const rol = this.selectedRol();
		if (!rol) return;

		// Limpiar usuario seleccionado cuando cambia el rol
		this.selectedUsuario.set(null);
		this.selectedUsuarioId.set(null);

		// Cargar usuarios del rol seleccionado para el autocomplete
		this.permisosService
			.listarUsuariosPorRol(rol)
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe((resultado) => {
				this.usuariosSugeridos.set(resultado.usuarios);
			});

		const permisoRol = this.permisosRol().find((p) => p.rol === rol);
		if (permisoRol) {
			this.selectedVistas.set([...permisoRol.vistas]);
			this.buildModulosVistas(permisoRol.vistas);
		} else {
			this.selectedVistas.set([]);
			this.buildModulosVistas([]);
		}
	}

	// === Autocomplete Usuarios ===
	buscarUsuarios(event: AutoCompleteCompleteEvent): void {
		const rol = this.selectedRol();
		if (!rol) {
			this.usuariosSugeridos.set([]);
			return;
		}

		// Si no hay query, listar todos los usuarios del rol
		const termino = event.query?.trim() || '';

		this.permisosService
			.buscarUsuarios(termino || undefined, rol)
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe((resultado) => {
				this.usuariosSugeridos.set(resultado.usuarios);
			});
	}

	onUsuarioSeleccionado(event: AutoCompleteSelectEvent): void {
		const usuario = event.value as UsuarioBusqueda;
		this.selectedUsuario.set(usuario);
		this.selectedUsuarioId.set(usuario.id);
	}

	onUsuarioClear(): void {
		this.selectedUsuario.set(null);
		this.selectedUsuarioId.set(null);
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
}
