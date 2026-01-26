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
import { forkJoin } from 'rxjs';
import { filter } from 'rxjs/operators';

import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { TooltipModule } from 'primeng/tooltip';
import { TagModule } from 'primeng/tag';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { DrawerModule } from 'primeng/drawer';
import { ToggleSwitch } from 'primeng/toggleswitch';
import { PasswordModule } from 'primeng/password';
import { DatePickerModule } from 'primeng/datepicker';

import { logger } from '@core/helpers';
import {
	UsuariosService,
	UsuarioLista,
	UsuarioDetalle,
	CrearUsuarioRequest,
	ActualizarUsuarioRequest,
	UsuariosEstadisticas,
	ROLES_USUARIOS_ADMIN,
	RolUsuarioAdmin,
	ErrorHandlerService,
	SwService,
} from '@core/services';
import { AdminUtilsService } from '@shared/services';

@Component({
	selector: 'app-usuarios',
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
		DrawerModule,
		ToggleSwitch,
		PasswordModule,
		DatePickerModule,
	],
	templateUrl: './usuarios.component.html',
	styleUrl: './usuarios.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UsuariosComponent implements OnInit {
	private usuariosService = inject(UsuariosService);
	private destroyRef = inject(DestroyRef);
	private errorHandler = inject(ErrorHandlerService);
	private swService = inject(SwService);
	readonly adminUtils = inject(AdminUtilsService);

	// State
	usuarios = signal<UsuarioLista[]>([]);
	estadisticas = signal<UsuariosEstadisticas | null>(null);
	loading = signal(false);

	// Dialogs
	dialogVisible = signal(false);
	detailDrawerVisible = signal(false);
	isEditing = signal(false);

	// Form
	selectedUsuario = signal<UsuarioDetalle | null>(null);
	formData = signal<Partial<CrearUsuarioRequest & ActualizarUsuarioRequest>>({});

	// Filters
	searchTerm = signal('');
	filterRol = signal<RolUsuarioAdmin | null>(null);
	filterEstado = signal<boolean | null>(null);

	// Options (sin Apoderado para admin)
	rolesDisponibles = ROLES_USUARIOS_ADMIN;
	rolesOptions = [{ label: 'Todos los roles', value: null as RolUsuarioAdmin | null }].concat(
		ROLES_USUARIOS_ADMIN.map((r) => ({ label: r, value: r as RolUsuarioAdmin | null })),
	);
	rolesSelectOptions = ROLES_USUARIOS_ADMIN.map((r) => ({ label: r, value: r }));
	estadoOptions = [
		{ label: 'Todos', value: null },
		{ label: 'Activos', value: true },
		{ label: 'Inactivos', value: false },
	];

	// Computed - Validations
	dniError = computed(() => {
		const dni = this.formData().dni || '';
		if (!dni) return null;
		if (!/^\d+$/.test(dni)) return 'El DNI solo debe contener numeros';
		if (dni.length !== 8) return 'El DNI debe tener exactamente 8 digitos';
		return null;
	});

	correoError = computed(() => {
		const correo = this.formData().correo || '';
		if (!correo) return null;
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		if (!emailRegex.test(correo)) return 'Ingrese un correo valido';
		return null;
	});

	correoApoderadoError = computed(() => {
		const correo = this.formData().correoApoderado || '';
		if (!correo) return null;
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		if (!emailRegex.test(correo)) return 'Ingrese un correo valido';
		return null;
	});

	// Computed - Helper para mostrar campos de estudiante
	isEstudiante = computed(() => {
		const rol = this.formData().rol;
		return rol === 'Estudiante';
	});

	// Computed - Filtered data
	filteredUsuarios = computed(() => {
		let data = this.usuarios();
		const search = this.searchTerm().toLowerCase();
		const filtroRol = this.filterRol();
		const filtroEstado = this.filterEstado();

		if (search) {
			data = data.filter(
				(u) =>
					u.nombreCompleto.toLowerCase().includes(search) ||
					u.dni.includes(search) ||
					u.correo?.toLowerCase().includes(search),
			);
		}

		if (filtroRol) {
			data = data.filter((u) => u.rol === filtroRol);
		}

		if (filtroEstado !== null) {
			data = data.filter((u) => u.estado === filtroEstado);
		}

		return data;
	});

	ngOnInit(): void {
		this.loadData();
		this.setupCacheRefresh();
	}

	/** Auto-refresh cuando el SW detecta datos nuevos del servidor */
	private setupCacheRefresh(): void {
		// Actualizar lista de usuarios directamente desde el evento (sin nuevo fetch)
		this.swService.cacheUpdated$
			.pipe(
				filter((event) => event.url.includes('/usuarios') && !event.url.includes('estadisticas')),
				takeUntilDestroyed(this.destroyRef),
			)
			.subscribe((event) => {
				logger.log('[UsuariosComponent] Lista usuarios actualizada desde SW');
				const usuarios = (event.data as UsuarioLista[]).filter((u) => u.rol !== 'Apoderado');
				this.usuarios.set(usuarios);
			});

		// Actualizar estadísticas directamente desde el evento
		this.swService.cacheUpdated$
			.pipe(
				filter((event) => event.url.includes('/usuarios/estadisticas')),
				takeUntilDestroyed(this.destroyRef),
			)
			.subscribe((event) => {
				logger.log('[UsuariosComponent] Estadísticas actualizadas desde SW');
				this.estadisticas.set(event.data as UsuariosEstadisticas);
			});
	}

	loadData(): void {
		this.loading.set(true);

		forkJoin({
			usuarios: this.usuariosService.listarUsuarios(),
			estadisticas: this.usuariosService.obtenerEstadisticas(),
		})
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: ({ usuarios, estadisticas }) => {
					// Filtrar apoderados para no mostrarlos en admin
					this.usuarios.set(usuarios.filter((u) => u.rol !== 'Apoderado'));
					this.estadisticas.set(estadisticas);
					this.loading.set(false);
				},
				error: (err) => {
					logger.error('Error al cargar datos:', err);
					this.errorHandler.showError('Error', 'No se pudieron cargar los usuarios');
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
		this.filterEstado.set(null);
	}

	// === Detail Drawer ===
	openDetail(usuario: UsuarioLista): void {
		this.usuariosService
			.obtenerUsuario(usuario.rol, usuario.id)
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe((detalle) => {
				if (detalle) {
					this.selectedUsuario.set(detalle);
					this.detailDrawerVisible.set(true);
				}
			});
	}

	closeDetail(): void {
		this.detailDrawerVisible.set(false);
	}

	// === Edit Dialog ===
	openNew(): void {
		this.selectedUsuario.set(null);
		this.formData.set({
			dni: '',
			nombres: '',
			apellidos: '',
			contrasena: '',
			rol: undefined,
			estado: true,
		});
		this.isEditing.set(false);
		this.dialogVisible.set(true);
	}

	editUsuario(usuario: UsuarioLista): void {
		this.usuariosService
			.obtenerUsuario(usuario.rol, usuario.id)
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe((detalle) => {
				if (detalle) {
					this.selectedUsuario.set(detalle);
					this.formData.set({
						dni: detalle.dni,
						nombres: detalle.nombres,
						apellidos: detalle.apellidos,
						contrasena: '',
						rol: detalle.rol as RolUsuarioAdmin,
						estado: detalle.estado,
						telefono: detalle.telefono,
						correo: detalle.correo,
						sedeId: detalle.sedeId,
						fechaNacimiento: detalle.fechaNacimiento,
						grado: detalle.grado,
						seccion: detalle.seccion,
						correoApoderado: detalle.correoApoderado,
					});
					this.isEditing.set(true);
					this.dialogVisible.set(true);
				}
			});
	}

	editFromDetail(): void {
		const usuario = this.selectedUsuario();
		if (usuario) {
			this.closeDetail();
			this.editUsuario(usuario);
		}
	}

	hideDialog(): void {
		this.dialogVisible.set(false);
	}

	saveUsuario(): void {
		const data = this.formData();
		this.loading.set(true);

		const operation$ = this.isEditing()
			? (() => {
					const usuario = this.selectedUsuario();
					if (!usuario) return null;
					const request: ActualizarUsuarioRequest = {
						dni: data.dni!,
						nombres: data.nombres!,
						apellidos: data.apellidos!,
						contrasena: data.contrasena || undefined,
						estado: data.estado ?? true,
						telefono: data.telefono,
						correo: data.correo,
						sedeId: data.sedeId,
						fechaNacimiento: data.fechaNacimiento,
						grado: data.grado,
						seccion: data.seccion,
						correoApoderado: data.correoApoderado,
					};
					return this.usuariosService.actualizarUsuario(usuario.rol, usuario.id, request);
				})()
			: (() => {
					if (!data.rol || !data.contrasena) return null;
					const request: CrearUsuarioRequest = {
						dni: data.dni!,
						nombres: data.nombres!,
						apellidos: data.apellidos!,
						contrasena: data.contrasena,
						rol: data.rol,
						telefono: data.telefono,
						correo: data.correo,
						sedeId: data.sedeId,
						fechaNacimiento: data.fechaNacimiento,
						grado: data.grado,
						seccion: data.seccion,
						correoApoderado: data.correoApoderado,
					};
					return this.usuariosService.crearUsuario(request);
				})();

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
				this.errorHandler.showError('Error', 'No se pudo guardar el usuario');
				this.loading.set(false);
			},
		});
	}

	deleteUsuario(usuario: UsuarioLista): void {
		if (confirm(`¿Está seguro de eliminar al usuario "${usuario.nombreCompleto}"?`)) {
			this.loading.set(true);
			this.usuariosService
				.eliminarUsuario(usuario.rol, usuario.id)
				.pipe(takeUntilDestroyed(this.destroyRef))
				.subscribe({
					next: () => this.loadData(),
					error: (err) => {
						logger.error('Error al eliminar:', err);
						this.errorHandler.showError('Error', 'No se pudo eliminar el usuario');
						this.loading.set(false);
					},
				});
		}
	}

	toggleEstado(usuario: UsuarioLista): void {
		this.loading.set(true);
		this.usuariosService
			.cambiarEstado(usuario.rol, usuario.id, !usuario.estado)
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

	// === UI Helpers ===
	isFormValid(): boolean {
		const data = this.formData();
		if (!data.dni || !data.nombres || !data.apellidos) return false;
		if (!this.isEditing() && (!data.rol || !data.contrasena)) return false;
		if (this.dniError()) return false;
		if (this.correoError()) return false;
		if (this.correoApoderadoError()) return false;
		return true;
	}

	updateFormField(field: string, value: unknown): void {
		this.formData.update((current) => ({ ...current, [field]: value }));
	}
}
