import { SalonProfesor } from '@shared/services';
import { SalonListDto } from '@features/intranet/pages/admin/horarios/models/salon.interface';
import {
	ActualizarUsuarioRequest,
	CrearUsuarioRequest,
	ImportarEstudiantesResponse,
	RolUsuarioAdmin,
	UsuarioDetalle,
	UsuarioLista,
	UsuariosEstadisticas,
} from '../models';
import { Injectable, computed, inject, signal } from '@angular/core';

import { APP_USER_ROLES } from '@shared/constants';
import { DebugService } from '@core/helpers';
import { applyFormPolicies } from '../helpers/usuario-form-policies.utils';
import {
	isUsuarioFormValid,
	validateCorreo,
	validateCorreoApoderado,
	validateDni,
	validateNombreApoderado,
	validateTelefonoApoderado,
} from '../helpers/usuario-validation.utils';

/**
 * Store para gestión de usuarios
 * Maneja el estado de la lista de usuarios, estadísticas, filtros y formularios
 */
@Injectable({ providedIn: 'root' })
export class UsuariosStore {
	private debug = inject(DebugService);
	private log = this.debug.dbg('STORE:Usuarios');
	// #region Estado privado
	private readonly _usuarios = signal<UsuarioLista[]>([]);
	private readonly _estadisticas = signal<UsuariosEstadisticas | null>(null);
	private readonly _salones = signal<SalonProfesor[]>([]);
	private readonly _salonesFilter = signal<SalonListDto[]>([]);
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
	private readonly _importDialogVisible = signal(false);
	private readonly _importLoading = signal(false);
	private readonly _importResult = signal<ImportarEstudiantesResponse | null>(null);

	// Form State
	private readonly _selectedUsuario = signal<UsuarioDetalle | null>(null);
	private readonly _formData = signal<Partial<CrearUsuarioRequest & ActualizarUsuarioRequest>>(
		{},
	);

	// Pagination
	private readonly _page = signal(1);
	private readonly _pageSize = signal(10);
	private readonly _totalRecords = signal(0);

	// Filters
	private readonly _searchTerm = signal('');
	private readonly _filterRol = signal<RolUsuarioAdmin | null>(null);
	private readonly _filterEstado = signal<boolean | null>(null);
	private readonly _filterSalonId = signal<number | null>(null);

	private readonly _refreshCounter = signal(0);
	// #endregion

	// #region Lecturas públicas (readonly)
	readonly refreshCounter = this._refreshCounter.asReadonly();
	readonly usuarios = this._usuarios.asReadonly();
	readonly estadisticas = this._estadisticas.asReadonly();
	readonly salones = this._salones.asReadonly();
	readonly salonesFilter = this._salonesFilter.asReadonly();
	readonly loading = this._loading.asReadonly();
	readonly error = this._error.asReadonly();

	readonly showSkeletons = this._showSkeletons.asReadonly();
	readonly statsReady = this._statsReady.asReadonly();
	readonly tableReady = this._tableReady.asReadonly();

	readonly dialogVisible = this._dialogVisible.asReadonly();
	readonly detailDrawerVisible = this._detailDrawerVisible.asReadonly();
	readonly isEditing = this._isEditing.asReadonly();
	readonly importDialogVisible = this._importDialogVisible.asReadonly();
	readonly importLoading = this._importLoading.asReadonly();
	readonly importResult = this._importResult.asReadonly();

	readonly selectedUsuario = this._selectedUsuario.asReadonly();
	readonly formData = this._formData.asReadonly();

	readonly page = this._page.asReadonly();
	readonly pageSize = this._pageSize.asReadonly();
	readonly totalRecords = this._totalRecords.asReadonly();

	readonly searchTerm = this._searchTerm.asReadonly();
	readonly filterRol = this._filterRol.asReadonly();
	readonly filterEstado = this._filterEstado.asReadonly();
	readonly filterSalonId = this._filterSalonId.asReadonly();

	// #endregion
	// #region Computed - Validaciones
	readonly dniError = computed(() => validateDni(this._formData().dni));
	readonly correoError = computed(() => validateCorreo(this._formData().correo));
	readonly correoApoderadoError = computed(() =>
		validateCorreoApoderado(this._formData().correoApoderado, this._formData().rol),
	);
	readonly nombreApoderadoError = computed(() =>
		validateNombreApoderado(this._formData().nombreApoderado, this._formData().rol),
	);
	readonly telefonoApoderadoError = computed(() =>
		validateTelefonoApoderado(this._formData().telefonoApoderado, this._formData().rol),
	);

	readonly isEstudiante = computed(() => this._formData().rol === APP_USER_ROLES.Estudiante);
	readonly isProfesor = computed(() => this._formData().rol === APP_USER_ROLES.Profesor);

	readonly isFormValid = computed(() =>
		isUsuarioFormValid(this._formData(), this._isEditing(), {
			dniError: this.dniError(),
			correoError: this.correoError(),
			correoApoderadoError: this.correoApoderadoError(),
			nombreApoderadoError: this.nombreApoderadoError(),
			telefonoApoderadoError: this.telefonoApoderadoError(),
		}),
	);

	// #endregion
	// #region Sub-ViewModels (agrupados por responsabilidad)

	/** Datos de la tabla */
	readonly dataVm = computed(() => ({
		usuarios: this._usuarios(),
		estadisticas: this._estadisticas(),
		salones: this._salones(),
		salonesFilter: this._salonesFilter(),
		isEmpty: this._usuarios().length === 0,
		hasEstadisticas: this._estadisticas() !== null,
		page: this._page(),
		pageSize: this._pageSize(),
		totalRecords: this._totalRecords(),
	}));

	/** Estado de UI: loading, dialogs, filtros */
	readonly uiVm = computed(() => ({
		loading: this._loading(),
		error: this._error(),
		showSkeletons: this._showSkeletons(),
		statsReady: this._statsReady(),
		tableReady: this._tableReady(),
		dialogVisible: this._dialogVisible(),
		detailDrawerVisible: this._detailDrawerVisible(),
		confirmDialogVisible: this._confirmDialogVisible(),
		importDialogVisible: this._importDialogVisible(),
		importLoading: this._importLoading(),
		importResult: this._importResult(),
		searchTerm: this._searchTerm(),
		filterRol: this._filterRol(),
		filterEstado: this._filterEstado(),
		filterSalonId: this._filterSalonId(),
	}));

	/** Formulario de usuario */
	readonly formVm = computed(() => ({
		formData: this._formData(),
		isEditing: this._isEditing(),
		selectedUsuario: this._selectedUsuario(),
		isFormValid: this.isFormValid(),
		isEstudiante: this.isEstudiante(),
		isProfesor: this.isProfesor(),
		dniError: this.dniError(),
		correoError: this.correoError(),
		correoApoderadoError: this.correoApoderadoError(),
		nombreApoderadoError: this.nombreApoderadoError(),
		telefonoApoderadoError: this.telefonoApoderadoError(),
	}));

	// #endregion
	// #region ViewModel consolidado (compone sub-VMs)
	readonly vm = computed(() => ({
		...this.dataVm(),
		...this.uiVm(),
		...this.formVm(),
	}));

	// #endregion
	// #region Comandos de mutación

	triggerRefresh(): void {
		this._refreshCounter.update((c) => c + 1);
	}

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

	setSalonesFilter(salones: SalonListDto[]): void {
		this._salonesFilter.set(salones);
	}

	setLoading(loading: boolean): void {
		this._loading.set(loading);
	}

	setError(error: string | null): void {
		this._error.set(error);
	}

	clearError(): void {
		this._error.set(null);
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
			const newData = applyFormPolicies(current, updates, this._isEditing());
			this.log.trace('updateFormData', { updates, newData });
			return newData;
		});
	}

	// Pagination mutations
	setPage(page: number): void {
		this._page.set(page);
	}

	setPageSize(pageSize: number): void {
		this._pageSize.set(pageSize);
	}

	setTotalRecords(total: number): void {
		this._totalRecords.set(total);
	}

	setPaginationData(page: number, pageSize: number, total: number): void {
		this._page.set(page);
		this._pageSize.set(pageSize);
		this._totalRecords.set(total);
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

	setFilterSalonId(salonId: number | null): void {
		this._filterSalonId.set(salonId);
	}

	clearFilters(): void {
		this._searchTerm.set('');
		this._filterRol.set(null);
		this._filterEstado.set(null);
		this._filterSalonId.set(null);
		this._page.set(1);
	}

	// #endregion
	// #region Comandos de alto nivel

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
		this._selectedUsuario.set(usuario);
		this._formData.set({
			dni: usuario.dni,
			nombres: usuario.nombres,
			apellidos: usuario.apellidos,
			contrasena: usuario.contrasena ?? '',
			rol: usuario.rol as RolUsuarioAdmin,
			estado: usuario.estado,
			telefono: usuario.telefono,
			correo: usuario.correo,
			sedeId: usuario.sedeId,
			fechaNacimiento: usuario.fechaNacimiento,
			grado: usuario.grado,
			seccion: usuario.seccion,
			nombreApoderado: usuario.nombreApoderado,
			telefonoApoderado: usuario.telefonoApoderado,
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

	openImportDialog(): void {
		this._importResult.set(null);
		this._importDialogVisible.set(true);
	}

	closeImportDialog(): void {
		this._importDialogVisible.set(false);
	}

	setImportLoading(loading: boolean): void {
		this._importLoading.set(loading);
	}

	setImportResult(result: ImportarEstudiantesResponse | null): void {
		this._importResult.set(result);
	}
	// #endregion
}
