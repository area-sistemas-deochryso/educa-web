import { Injectable, computed, inject, signal } from '@angular/core';

import { SalonListDto } from '@features/intranet/pages/admin/schedules/models/salon.interface';
import { CursoListaDto } from '@features/intranet/pages/admin/schedules/models/curso.interface';
import { APP_USER_ROLES } from '@shared/constants';
import { DebugService } from '@core/helpers';
import { BaseCrudStore } from '@core/store/base/base-crud.store';
import { type ProfesorCursoListaDto } from '@data/models';
import {
	ActualizarUsuarioRequest,
	CrearUsuarioRequest,
	ImportarEstudiantesResponse,
	RolUsuarioAdmin,
	UsuarioDetalle,
	UsuarioLista,
	UsuariosEstadisticas,
} from '../models';
import { applyFormPolicies } from '../helpers/usuario-form-policies.utils';
import {
	isUsuarioFormValid,
	validateCorreo,
	validateCorreoApoderado,
	validateDni,
	validateNombreApoderado,
	validateTelefonoApoderado,
} from '../helpers/usuario-validation.utils';

type UsuarioFormData = Partial<CrearUsuarioRequest & ActualizarUsuarioRequest>;

/**
 * Store para gestión de usuarios.
 * Extiende BaseCrudStore para items, loading, error, dialog, pagination, filtros base.
 * Solo agrega: salones, skeletons, import, filtros extra y validaciones de formulario.
 */
@Injectable({ providedIn: 'root' })
export class UsersStore extends BaseCrudStore<UsuarioLista, UsuarioFormData, UsuariosEstadisticas> {
	private debug = inject(DebugService);
	private log = this.debug.dbg('STORE:Usuarios');

	constructor() {
		super({
			dni: '',
			nombres: '',
			apellidos: '',
			contrasena: '',
			rol: undefined,
			estado: true,
			salonId: undefined,
			salones: undefined,
		});
	}

	protected override getDefaultFormData(): UsuarioFormData {
		return {
			dni: '',
			nombres: '',
			apellidos: '',
			contrasena: '',
			rol: undefined,
			estado: true,
			salonId: undefined,
			salones: undefined,
		};
	}

	// #region Estado privado — Feature-specific
	private readonly _salones = signal<SalonListDto[]>([]);
	private readonly _salonesFilter = signal<SalonListDto[]>([]);

	private readonly _showSkeletons = signal(true);
	private readonly _statsReady = signal(false);
	private readonly _tableReady = signal(false);

	private readonly _detailDrawerVisible = signal(false);
	private readonly _importDialogVisible = signal(false);
	private readonly _importLoading = signal(false);
	private readonly _importResult = signal<ImportarEstudiantesResponse | null>(null);

	private readonly _selectedUsuario = signal<UsuarioDetalle | null>(null);
	private readonly _filterRol = signal<RolUsuarioAdmin | null>(null);
	private readonly _filterSalonId = signal<number | null>(null);
	private readonly _refreshCounter = signal(0);

	// ProfesorCurso — cursos asignados al profesor en edición
	private readonly _profesorCursos = signal<ProfesorCursoListaDto[]>([]);
	private readonly _cursosDisponibles = signal<CursoListaDto[]>([]);
	private readonly _profesorCursosLoading = signal(false);
	// #endregion

	// #region Lecturas públicas — Feature-specific
	readonly salones = this._salones.asReadonly();
	readonly salonesFilter = this._salonesFilter.asReadonly();
	readonly showSkeletons = this._showSkeletons.asReadonly();
	readonly statsReady = this._statsReady.asReadonly();
	readonly tableReady = this._tableReady.asReadonly();
	readonly detailDrawerVisible = this._detailDrawerVisible.asReadonly();
	readonly importDialogVisible = this._importDialogVisible.asReadonly();
	readonly importLoading = this._importLoading.asReadonly();
	readonly importResult = this._importResult.asReadonly();
	readonly selectedUsuario = this._selectedUsuario.asReadonly();
	readonly filterRol = this._filterRol.asReadonly();
	readonly filterSalonId = this._filterSalonId.asReadonly();
	readonly refreshCounter = this._refreshCounter.asReadonly();
	readonly profesorCursos = this._profesorCursos.asReadonly();
	readonly cursosDisponibles = this._cursosDisponibles.asReadonly();
	readonly profesorCursosLoading = this._profesorCursosLoading.asReadonly();
	// #endregion

	// #region Computed — Validaciones
	readonly dniError = computed(() => validateDni(this.formData().dni));
	readonly correoError = computed(() => validateCorreo(this.formData().correo));
	readonly correoApoderadoError = computed(() =>
		validateCorreoApoderado(this.formData().correoApoderado, this.formData().rol),
	);
	readonly nombreApoderadoError = computed(() =>
		validateNombreApoderado(this.formData().nombreApoderado, this.formData().rol),
	);
	readonly telefonoApoderadoError = computed(() =>
		validateTelefonoApoderado(this.formData().telefonoApoderado, this.formData().rol),
	);

	readonly isEstudiante = computed(() => this.formData().rol === APP_USER_ROLES.Estudiante);
	readonly isProfesor = computed(() => this.formData().rol === APP_USER_ROLES.Profesor);

	readonly isFormValid = computed(() =>
		isUsuarioFormValid(this.formData(), this.isEditing(), {
			dniError: this.dniError(),
			correoError: this.correoError(),
			correoApoderadoError: this.correoApoderadoError(),
			nombreApoderadoError: this.nombreApoderadoError(),
			telefonoApoderadoError: this.telefonoApoderadoError(),
		}),
	);
	// #endregion

	// #region ViewModel
	readonly vm = computed(() => ({
		// Data (from base)
		usuarios: this.items(),
		estadisticas: this.estadisticas(),
		salones: this._salones(),
		salonesFilter: this._salonesFilter(),
		isEmpty: this.isEmpty(),
		hasEstadisticas: this.estadisticas() !== null,
		page: this.page(),
		pageSize: this.pageSize(),
		totalRecords: this.totalRecords(),
		// UI state
		loading: this.loading(),
		error: this.error(),
		showSkeletons: this._showSkeletons(),
		statsReady: this._statsReady(),
		tableReady: this._tableReady(),
		dialogVisible: this.dialogVisible(),
		detailDrawerVisible: this._detailDrawerVisible(),
		confirmDialogVisible: this.confirmDialogVisible(),
		importDialogVisible: this._importDialogVisible(),
		importLoading: this._importLoading(),
		importResult: this._importResult(),
		searchTerm: this.searchTerm(),
		filterRol: this._filterRol(),
		filterEstado: this.filterEstado() as boolean | null,
		filterSalonId: this._filterSalonId(),
		// Form
		formData: this.formData(),
		isEditing: this.isEditing(),
		selectedUsuario: this._selectedUsuario(),
		isFormValid: this.isFormValid(),
		isEstudiante: this.isEstudiante(),
		isProfesor: this.isProfesor(),
		profesorCursos: this._profesorCursos(),
		cursosDisponibles: this._cursosDisponibles(),
		profesorCursosLoading: this._profesorCursosLoading(),
		dniError: this.dniError(),
		correoError: this.correoError(),
		correoApoderadoError: this.correoApoderadoError(),
		nombreApoderadoError: this.nombreApoderadoError(),
		telefonoApoderadoError: this.telefonoApoderadoError(),
	}));
	// #endregion

	// #region Comandos — Feature-specific setters
	setSalones(salones: SalonListDto[]): void {
		this._salones.set(salones);
	}

	setSalonesFilter(salones: SalonListDto[]): void {
		this._salonesFilter.set(salones);
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

	setFilterRol(rol: RolUsuarioAdmin | null): void {
		this._filterRol.set(rol);
	}

	setFilterSalonId(salonId: number | null): void {
		this._filterSalonId.set(salonId);
	}

	setImportLoading(loading: boolean): void {
		this._importLoading.set(loading);
	}

	setImportResult(result: ImportarEstudiantesResponse | null): void {
		this._importResult.set(result);
	}

	triggerRefresh(): void {
		this._refreshCounter.update((c) => c + 1);
	}

	setProfesorCursos(cursos: ProfesorCursoListaDto[]): void {
		this._profesorCursos.set(cursos);
	}

	setCursosDisponibles(cursos: CursoListaDto[]): void {
		this._cursosDisponibles.set(cursos);
	}

	setProfesorCursosLoading(loading: boolean): void {
		this._profesorCursosLoading.set(loading);
	}

	clearProfesorCursos(): void {
		this._profesorCursos.set([]);
		this._cursosDisponibles.set([]);
		this._profesorCursosLoading.set(false);
	}
	// #endregion

	// #region Comandos — Mutations con logging
	override addItem(item: UsuarioLista): void {
		super.addItem(item);
		this.log.info('Usuario agregado', { usuario: item });
	}

	override updateItem(id: number, updates: Partial<UsuarioLista>): void {
		super.updateItem(id, updates);
		this.log.info('Usuario actualizado', { id, updates });
	}

	override removeItem(id: number): void {
		super.removeItem(id);
		this.log.info('Usuario eliminado', { id });
	}

	toggleEstadoUsuario(id: number): void {
		const user = this.items().find((u) => u.id === id);
		if (user) this.updateItem(id, { estado: !user.estado } as Partial<UsuarioLista>);
		this.log.info('Estado de usuario toggleado', { id });
	}
	// #endregion

	// #region Comandos — Form
	setSelectedUsuario(usuario: UsuarioDetalle | null): void {
		this._selectedUsuario.set(usuario);
	}

	updateFormDataWithPolicies(updates: UsuarioFormData): void {
		const current = this.formData();
		const newData = applyFormPolicies(current, updates, this.isEditing());
		this.log.trace('updateFormData', { updates, newData });
		this.setFormData(newData);
	}
	// #endregion

	// #region Comandos — Clear filtros extra
	protected override onClearFiltros(): void {
		this._filterRol.set(null);
		this._filterSalonId.set(null);
	}
	// #endregion

	// #region Comandos — Dialogs feature-specific
	openNewDialog(): void {
		this._selectedUsuario.set(null);
		this.resetFormData();
		this.clearProfesorCursos();
		this.setIsEditing(false);
		this.openDialog();
	}

	openEditDialog(usuario: UsuarioDetalle): void {
		this._selectedUsuario.set(usuario);
		this.setFormData({
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
			salones: usuario.salones?.map((s) => ({ salonId: s.salonId, esTutor: s.esTutor })),
		});
		this.setIsEditing(true);
		this.openDialog();
	}

	openDetailDrawer(usuario: UsuarioDetalle): void {
		this._selectedUsuario.set(usuario);
		this._detailDrawerVisible.set(true);
	}

	closeDetailDrawer(): void {
		this._detailDrawerVisible.set(false);
	}

	openConfirmDialogVisible(): void {
		this.openConfirmDialog();
	}

	closeConfirmDialogVisible(): void {
		this.closeConfirmDialog();
	}

	openImportDialog(): void {
		this._importResult.set(null);
		this._importDialogVisible.set(true);
	}

	closeImportDialog(): void {
		this._importDialogVisible.set(false);
	}
	// #endregion
}
