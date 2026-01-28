import {
	ActualizarUsuarioRequest,
	CrearUsuarioRequest,
	RolUsuarioAdmin,
	UsuarioDetalle,
	UsuarioLista,
	UsuariosEstadisticas,
} from '@core/services';
import { Injectable, computed, signal } from '@angular/core';

/**
 * Store para gestión de usuarios
 * Maneja el estado de la lista de usuarios, estadísticas, filtros y formularios
 */
@Injectable({ providedIn: 'root' })
export class UsuariosStore {
	// ============ Estado privado ============
	private readonly _usuarios = signal<UsuarioLista[]>([]);
	private readonly _estadisticas = signal<UsuariosEstadisticas | null>(null);
	private readonly _loading = signal(false);
	private readonly _error = signal<string | null>(null);

	// Performance optimization - Skeleton screens
	private readonly _showSkeletons = signal(true);
	private readonly _statsReady = signal(false);
	private readonly _tableReady = signal(false);

	// UI State
	private readonly _dialogVisible = signal(false);
	private readonly _detailDrawerVisible = signal(false);
	private readonly _confirmDialogVisible = signal(false);
	private readonly _isEditing = signal(false);

	// Form State
	private readonly _selectedUsuario = signal<UsuarioDetalle | null>(null);
	private readonly _formData = signal<Partial<CrearUsuarioRequest & ActualizarUsuarioRequest>>(
		{},
	);

	// Filters
	private readonly _searchTerm = signal('');
	private readonly _filterRol = signal<RolUsuarioAdmin | null>(null);
	private readonly _filterEstado = signal<boolean | null>(null);

	// ============ Lecturas públicas (readonly) ============
	readonly usuarios = this._usuarios.asReadonly();
	readonly estadisticas = this._estadisticas.asReadonly();
	readonly loading = this._loading.asReadonly();
	readonly error = this._error.asReadonly();

	readonly showSkeletons = this._showSkeletons.asReadonly();
	readonly statsReady = this._statsReady.asReadonly();
	readonly tableReady = this._tableReady.asReadonly();

	readonly dialogVisible = this._dialogVisible.asReadonly();
	readonly detailDrawerVisible = this._detailDrawerVisible.asReadonly();
	readonly isEditing = this._isEditing.asReadonly();

	readonly selectedUsuario = this._selectedUsuario.asReadonly();
	readonly formData = this._formData.asReadonly();

	readonly searchTerm = this._searchTerm.asReadonly();
	readonly filterRol = this._filterRol.asReadonly();
	readonly filterEstado = this._filterEstado.asReadonly();

	// ============ Computed - Validaciones ============
	readonly dniError = computed(() => {
		const dni = this._formData().dni || '';
		if (!dni) return null;
		if (!/^\d+$/.test(dni)) return 'El DNI solo debe contener numeros';
		if (dni.length !== 8) return 'El DNI debe tener exactamente 8 digitos';
		return null;
	});

	readonly correoError = computed(() => {
		const correo = this._formData().correo || '';
		if (!correo) return null;
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		if (!emailRegex.test(correo)) return 'Ingrese un correo valido';
		return null;
	});

	readonly correoApoderadoError = computed(() => {
		const correo = this._formData().correoApoderado || '';
		if (!correo) return null;
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		if (!emailRegex.test(correo)) return 'Ingrese un correo valido';
		return null;
	});

	readonly isEstudiante = computed(() => {
		const rol = this._formData().rol;
		return rol === 'Estudiante';
	});

	readonly isFormValid = computed(() => {
		const data = this._formData();
		if (!data.dni || !data.nombres || !data.apellidos) return false;
		if (!this._isEditing() && (!data.rol || !data.contrasena)) return false;
		if (this.dniError()) return false;
		if (this.correoError()) return false;
		if (this.correoApoderadoError()) return false;
		return true;
	});

	// ============ Computed - Filtered data ============
	readonly filteredUsuarios = computed(() => {
		let data = this._usuarios();
		const search = this._searchTerm().toLowerCase();
		const filtroRol = this._filterRol();
		const filtroEstado = this._filterEstado();

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

	// ============ ViewModel consolidado ============
	readonly vm = computed(() => ({
		usuarios: this._usuarios(),
		filteredUsuarios: this.filteredUsuarios(),
		estadisticas: this._estadisticas(),
		loading: this._loading(),
		error: this._error(),
		isEmpty: this._usuarios().length === 0,
		hasEstadisticas: this._estadisticas() !== null,
		dialogVisible: this._dialogVisible(),
		detailDrawerVisible: this._detailDrawerVisible(),
		isEditing: this._isEditing(),
		selectedUsuario: this._selectedUsuario(),
		formData: this._formData(),
		isFormValid: this.isFormValid(),
		isEstudiante: this.isEstudiante(),
		dniError: this.dniError(),
		correoError: this.correoError(),
		correoApoderadoError: this.correoApoderadoError(),
		searchTerm: this._searchTerm(),
		filterRol: this._filterRol(),
		filterEstado: this._filterEstado(),
		confirmDialogVisible: this._confirmDialogVisible(),
		showSkeletons: this._showSkeletons(),
		statsReady: this._statsReady(),
		tableReady: this._tableReady(),
	}));

	// ============ Comandos de mutación ============

	// Data mutations
	setUsuarios(usuarios: UsuarioLista[]): void {
		this._usuarios.set(usuarios);
	}

	setEstadisticas(estadisticas: UsuariosEstadisticas): void {
		this._estadisticas.set(estadisticas);
	}

	setLoading(loading: boolean): void {
		this._loading.set(loading);
	}

	setError(error: string | null): void {
		this._error.set(error);
	}

	setShowSkeletons(show: boolean): void {
		this._showSkeletons.set(show);
	}

	setStatsReady(ready: boolean): void {
		this._statsReady.set(ready);
	}

	setTableReady(ready: boolean): void {
		this._tableReady.set(ready);
	}

	// UI mutations
	setDialogVisible(visible: boolean): void {
		this._dialogVisible.set(visible);
	}

	setConfirmDialogVisible(visible: boolean): void {
		this._confirmDialogVisible.set(visible);
	}

	setDetailDrawerVisible(visible: boolean): void {
		this._detailDrawerVisible.set(visible);
	}

	setIsEditing(editing: boolean): void {
		this._isEditing.set(editing);
	}

	// Form mutations
	setSelectedUsuario(usuario: UsuarioDetalle | null): void {
		this._selectedUsuario.set(usuario);
	}

	setFormData(data: Partial<CrearUsuarioRequest & ActualizarUsuarioRequest>): void {
		this._formData.set(data);
	}

	updateFormData(updates: Partial<CrearUsuarioRequest & ActualizarUsuarioRequest>): void {
		this._formData.update((current) => ({ ...current, ...updates }));
	}

	// Filter mutations
	setSearchTerm(term: string): void {
		this._searchTerm.set(term);
	}

	setFilterRol(rol: RolUsuarioAdmin | null): void {
		this._filterRol.set(rol);
	}

	setFilterEstado(estado: boolean | null): void {
		this._filterEstado.set(estado);
	}

	clearFilters(): void {
		this._searchTerm.set('');
		this._filterRol.set(null);
		this._filterEstado.set(null);
	}

	// ============ Comandos de alto nivel ============

	openNewDialog(): void {
		this._selectedUsuario.set(null);
		this._formData.set({
			dni: '',
			nombres: '',
			apellidos: '',
			contrasena: '',
			rol: undefined,
			estado: true,
		});
		this._isEditing.set(false);
		this._dialogVisible.set(true);
	}

	openEditDialog(usuario: UsuarioDetalle): void {
		this._selectedUsuario.set(usuario);
		this._formData.set({
			dni: usuario.dni,
			nombres: usuario.nombres,
			apellidos: usuario.apellidos,
			contrasena: '',
			rol: usuario.rol as RolUsuarioAdmin,
			estado: usuario.estado,
			telefono: usuario.telefono,
			correo: usuario.correo,
			sedeId: usuario.sedeId,
			fechaNacimiento: usuario.fechaNacimiento,
			grado: usuario.grado,
			seccion: usuario.seccion,
			correoApoderado: usuario.correoApoderado,
		});
		this._isEditing.set(true);
		this._dialogVisible.set(true);
	}

	closeDialog(): void {
		this._dialogVisible.set(false);
	}

	openDetailDrawer(usuario: UsuarioDetalle): void {
		this._selectedUsuario.set(usuario);
		this._detailDrawerVisible.set(true);
	}

	closeDetailDrawer(): void {
		this._detailDrawerVisible.set(false);
	}

	openConfirmDialogVisible(): void {
		this._confirmDialogVisible.set(true);
	}

	closeConfirmDialogVisible(): void {
		this._confirmDialogVisible.set(false);
	}
}
