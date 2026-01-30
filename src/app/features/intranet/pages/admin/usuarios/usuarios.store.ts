import {
	ActualizarUsuarioRequest,
	CrearUsuarioRequest,
	RolUsuarioAdmin,
	UsuarioDetalle,
	UsuarioLista,
	UsuariosEstadisticas,
	SalonProfesor,
} from '@core/services';
import { Injectable, computed, signal, inject } from '@angular/core';
import { DebugService } from '@core/helpers';

/**
 * Store para gestión de usuarios
 * Maneja el estado de la lista de usuarios, estadísticas, filtros y formularios
 */
@Injectable({ providedIn: 'root' })
export class UsuariosStore {
	private debug = inject(DebugService);
	private log = this.debug.dbg('STORE:Usuarios');
	// ============ Estado privado ============
	private readonly _usuarios = signal<UsuarioLista[]>([]);
	private readonly _estadisticas = signal<UsuariosEstadisticas | null>(null);
	private readonly _salones = signal<SalonProfesor[]>([]);
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
	readonly salones = this._salones.asReadonly();
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
		const rol = this._formData().rol;

		// Requerido para Estudiante
		if (rol === 'Estudiante' && !correo) {
			return 'El correo del apoderado es obligatorio para estudiantes';
		}

		if (!correo) return null;
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		if (!emailRegex.test(correo)) return 'Ingrese un correo valido';
		return null;
	});

	readonly nombreApoderadoError = computed(() => {
		const nombre = this._formData().nombreApoderado || '';
		const rol = this._formData().rol;

		// Requerido para Estudiante
		if (rol === 'Estudiante' && !nombre.trim()) {
			return 'El nombre del apoderado es obligatorio para estudiantes';
		}

		return null;
	});

	readonly telefonoApoderadoError = computed(() => {
		const telefono = this._formData().telefonoApoderado || '';
		const rol = this._formData().rol;

		// Requerido para Estudiante
		if (rol === 'Estudiante' && !telefono.trim()) {
			return 'El telefono del apoderado es obligatorio para estudiantes';
		}

		return null;
	});

	readonly isEstudiante = computed(() => {
		const rol = this._formData().rol;
		return rol === 'Estudiante';
	});

	readonly isProfesor = computed(() => {
		const rol = this._formData().rol;
		return rol === 'Profesor';
	});

	readonly isFormValid = computed(() => {
		const data = this._formData();
		if (!data.dni || !data.nombres || !data.apellidos) return false;
		if (!this._isEditing() && (!data.rol || !data.contrasena)) return false;
		if (this.dniError()) return false;
		if (this.correoError()) return false;
		if (this.correoApoderadoError()) return false;
		if (this.nombreApoderadoError()) return false;
		if (this.telefonoApoderadoError()) return false;
		// Si es profesor y tiene salón seleccionado, esTutor debe estar definido
		if (this.isProfesor() && data.salonId !== undefined && data.esTutor === undefined) return false;
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
		salones: this._salones(),
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
		isProfesor: this.isProfesor(),
		dniError: this.dniError(),
		correoError: this.correoError(),
		correoApoderadoError: this.correoApoderadoError(),
		nombreApoderadoError: this.nombreApoderadoError(),
		telefonoApoderadoError: this.telefonoApoderadoError(),
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

	/**
	 * Mutación quirúrgica: Agregar un usuario al inicio del array
	 */
	addUsuario(usuario: UsuarioLista): void {
		this._usuarios.update((usuarios) => [usuario, ...usuarios]);
		this.log.info('Usuario agregado', { usuario });
	}

	/**
	 * Mutación quirúrgica: Actualizar un usuario existente
	 */
	updateUsuario(id: number, updates: Partial<UsuarioLista>): void {
		this._usuarios.update((usuarios) =>
			usuarios.map((u) => (u.id === id ? { ...u, ...updates } : u)),
		);
		this.log.info('Usuario actualizado', { id, updates });
	}

	/**
	 * Mutación quirúrgica: Toggle del estado de un usuario
	 */
	toggleEstadoUsuario(id: number): void {
		this._usuarios.update((usuarios) =>
			usuarios.map((u) => (u.id === id ? { ...u, estado: !u.estado } : u)),
		);
		this.log.info('Estado de usuario toggleado', { id });
	}

	/**
	 * Mutación quirúrgica: Eliminar un usuario del array
	 */
	removeUsuario(id: number): void {
		this._usuarios.update((usuarios) => usuarios.filter((u) => u.id !== id));
		this.log.info('Usuario eliminado', { id });
	}

	/**
	 * Actualización incremental de estadísticas (sin refetch)
	 */
	incrementarEstadistica(campo: keyof UsuariosEstadisticas, delta: number): void {
		this._estadisticas.update((stats) => {
			if (!stats) return stats;
			return { ...stats, [campo]: stats[campo] + delta };
		});
	}

	setEstadisticas(estadisticas: UsuariosEstadisticas): void {
		this._estadisticas.set(estadisticas);
	}

	setSalones(salones: SalonProfesor[]): void {
		this._salones.set(salones);
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
		this._formData.update((current) => {
			const newData = { ...current, ...updates };

			// Auto-generar contraseña cuando cambian apellidos o DNI (creación y edición)
			if (updates.apellidos !== undefined || updates.dni !== undefined) {
				const apellido = (newData.apellidos ?? '').trim();
				const dniRaw = (newData.dni ?? '').trim();

				// 2 primeras letras del primer apellido en mayúsculas
				const pref = apellido.slice(0, 2).toUpperCase();

				// Solo dígitos del DNI y últimos 4
				const digits = dniRaw.replace(/\D/g, '');
				const suf = digits.slice(-4);

				// Si hay suficientes caracteres, generar contraseña
				if (pref.length >= 2 && suf.length >= 4) {
					newData.contrasena = `${pref}${suf}`;
					this.log.info('Contraseña autogenerada', {
						modo: this._isEditing() ? 'edición' : 'creación',
						apellido,
						dni: dniRaw,
						contrasena: newData.contrasena,
					});
				} else {
					// Si no hay suficientes datos, limpiar contraseña
					newData.contrasena = undefined;
					this.log.trace('Contraseña no generada (datos insuficientes)', {
						pref,
						suf,
						prefLen: pref.length,
						sufLen: suf.length,
					});
				}
			}

			// Limpiar campos de salón si el rol cambia y no es Profesor
			if (updates.rol !== undefined && newData.rol !== 'Profesor') {
				newData.salonId = undefined;
				newData.esTutor = undefined;
			}

			// Si se deselecciona el salón, limpiar esTutor
			if (updates.salonId !== undefined && !newData.salonId) {
				newData.esTutor = undefined;
			}

			// Si se selecciona un salón y esTutor no está definido, inicializar en false
			if (updates.salonId !== undefined && newData.salonId && newData.esTutor === undefined) {
				newData.esTutor = false;
			}

			this.log.trace('updateFormData', { updates, newData });
			return newData;
		});
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
			salonId: undefined,
			esTutor: undefined,
		});
		this._isEditing.set(false);
		this._dialogVisible.set(true);
	}

	openEditDialog(usuario: UsuarioDetalle): void {
		// Calcular contraseña autogenerada basada en datos actuales del usuario
		const apellido = usuario.apellidos.trim();
		const dniRaw = usuario.dni.trim();
		const pref = apellido.slice(0, 2).toUpperCase();
		const digits = dniRaw.replace(/\D/g, '');
		const suf = digits.slice(-4);
		const contrasenaAutogenerada = pref.length >= 2 && suf.length >= 4 ? `${pref}${suf}` : '';

		this.log.info('openEditDialog - contraseña inicial calculada', {
			apellido,
			dni: dniRaw,
			contrasena: contrasenaAutogenerada,
		});

		this._selectedUsuario.set(usuario);
		this._formData.set({
			dni: usuario.dni,
			nombres: usuario.nombres,
			apellidos: usuario.apellidos,
			contrasena: contrasenaAutogenerada,
			rol: usuario.rol as RolUsuarioAdmin,
			estado: usuario.estado,
			telefono: usuario.telefono,
			correo: usuario.correo,
			sedeId: usuario.sedeId,
			fechaNacimiento: usuario.fechaNacimiento,
			grado: usuario.grado,
			seccion: usuario.seccion,
			correoApoderado: usuario.correoApoderado,
			salonId: usuario.salonId,
			esTutor: usuario.esTutor,
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
