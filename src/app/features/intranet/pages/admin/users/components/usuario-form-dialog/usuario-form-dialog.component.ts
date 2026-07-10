import { UserProfileService } from '@core/services';
import { SalonListDto } from '@features/intranet/pages/admin/schedules/models/salon.interface';
import { CursoListaDto } from '@features/intranet/pages/admin/schedules/models/curso.interface';
import { type ProfesorCursoListaDto } from '@data/models';
import { resolveModoAsignacion } from '@data/models';
import {
	ActualizarUsuarioRequest,
	CrearUsuarioRequest,
	SalonAsignacion,
	SedeSimpleDto,
} from '../../services';
import {
	computeGradosOptions,
	computeModoPreview,
	computeSalonesAsignados,
	computeSeccionesOptions,
	findSalonSeleccionado,
	isSalonYaAsignado,
} from './usuario-form-dialog.helpers';
import {
	ChangeDetectionStrategy,
	Component,
	computed,
	effect,
	inject,
	input,
	output,
	signal,
} from '@angular/core';
import { generatePassword } from '@core/helpers';
import { rolRequiereSalon, rolPermiteEsTutor, canEditPassword } from '@shared/models';
import { RolService } from '@core/services/roles';

import { ButtonModule } from 'primeng/button';
import { Checkbox } from 'primeng/checkbox';
import { CommonModule } from '@angular/common';
import { DatePickerModule } from 'primeng/datepicker';
import { DialogModule } from 'primeng/dialog';
import { FormFieldErrorComponent } from '@intranet-shared/components';
import { FormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { MultiSelectModule } from 'primeng/multiselect';
import { PasswordModule } from 'primeng/password';
import { SelectModule } from 'primeng/select';
import { Tab, TabList, TabPanel, Tabs } from 'primeng/tabs';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { ToggleSwitch } from 'primeng/toggleswitch';
import { UppercaseInputDirective } from '@intranet-shared/directives';
import { EstadoLabelPipe } from '@intranet-shared/pipes';

export type UsuarioFormData = Partial<CrearUsuarioRequest & ActualizarUsuarioRequest>;

export interface FormValidationErrors {
	dniError: string | null;
	correoError: string | null;
	correoApoderadoError: string | null;
	nombreApoderadoError: string | null;
	telefonoApoderadoError: string | null;
}

/**
 * Componente presentacional para el dialog de formulario de usuario
 * Edición y creación de usuarios
 */
@Component({
	selector: 'app-user-form-dialog',
	standalone: true,
	imports: [
		CommonModule,
		FormsModule,
		DialogModule,
		ButtonModule,
		InputTextModule,
		MultiSelectModule,
		SelectModule,
		Tabs, TabList, Tab, TabPanel,
		TagModule,
		TooltipModule,
		ToggleSwitch,
		PasswordModule,
		DatePickerModule,
		FormFieldErrorComponent,
		TableModule,
		UppercaseInputDirective,
		Checkbox,
		EstadoLabelPipe,
	],
	templateUrl: './usuario-form-dialog.component.html',
	styleUrl: './usuario-form-dialog.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserFormDialogComponent {
	// #region Dependencias
	private userProfile = inject(UserProfileService);
	private rolService = inject(RolService);
	// #endregion

	// #region Inputs / Outputs
	readonly visible = input.required<boolean>();
	readonly isEditing = input.required<boolean>();
	readonly formData = input.required<UsuarioFormData>();
	readonly errors = input.required<FormValidationErrors>();
	readonly isFormValid = input.required<boolean>();
	readonly loading = input<boolean>(false);
	readonly salones = input<SalonListDto[]>([]);
	readonly sedes = input<SedeSimpleDto[]>([]);
	readonly profesorCursos = input<ProfesorCursoListaDto[]>([]);
	readonly cursosDisponibles = input<CursoListaDto[]>([]);
	readonly profesorCursosLoading = input<boolean>(false);

	readonly visibleChange = output<boolean>();
	readonly fieldChange = output<{ field: string; value: unknown }>();
	readonly save = output<void>();
	readonly cancelDialog = output<void>();
	readonly asignarCursos = output<number[]>();
	readonly desasignarCurso = output<number>();
	// #endregion

	// #region Estado local
	readonly rolesSelectOptions = computed(() =>
		this.rolService.all().map((r) => ({ label: r.nombre, value: r.nombre })),
	);
	readonly activeFormTab = signal<string>('datos');

	readonly _gradoSeleccionado = signal<string | null>(null);
	readonly _seccionSeleccionada = signal<string | null>(null);

	readonly canEditPassword = computed(() => canEditPassword(this.userProfile.userRole()));
	readonly showAsignacionesTab = computed(() => this.needsSalon() || this.isProfesor());

	private readonly _resetTabOnRoleChange = effect(() => {
		const show = this.showAsignacionesTab();
		if (!show && this.activeFormTab() === 'asignaciones') {
			this.activeFormTab.set('datos');
		}
	});
	// #endregion

	// #region Computed — validaciones de contraseña

	private readonly _contrasena = computed(() => {
		const pwd = this.formData().contrasena;
		return typeof pwd === 'string' ? pwd : '';
	});

	readonly contrasenaMinLengthValid = computed(() => this._contrasena().length >= 8);
	readonly contrasenaHasUppercase = computed(() => /[A-Z]/.test(this._contrasena()));
	readonly contrasenaHasLowercase = computed(() => /[a-z]/.test(this._contrasena()));
	readonly contrasenaHasNumber = computed(() => /[0-9]/.test(this._contrasena()));
	readonly contrasenaHasSpecialChar = computed(() => /[!@#$%^&*(),.?":{}|<>]/.test(this._contrasena()));

	readonly contrasenaValidationsValid = computed(() => {
		const pwd = this._contrasena();
		if (!pwd) return true;
		return (
			this.contrasenaMinLengthValid() &&
			this.contrasenaHasUppercase() &&
			this.contrasenaHasLowercase() &&
			this.contrasenaHasNumber() &&
			this.contrasenaHasSpecialChar()
		);
	});

	autoGeneratedValue = computed(() => {
		if (this.isEditing()) {
			return this.formData().contrasena ?? '';
		}
		return generatePassword(this.formData().apellidos ?? '', this.formData().dni ?? '');
	});
	// #endregion

	// #region Computed — opciones de salón
	readonly isEstudiante = computed(() => this.formData().rol === 'Estudiante');
	readonly isProfesor = computed(() => rolPermiteEsTutor(this.formData().rol));
	readonly needsSalon = computed(() => rolRequiereSalon(this.formData().rol));

	get rolValue(): string | undefined {
		return this.formData().rol;
	}

	readonly gradosOptions = computed(() => computeGradosOptions(this.salones()));

	readonly seccionesOptions = computed(() =>
		computeSeccionesOptions(this.salones(), this._gradoSeleccionado()),
	);

	readonly salonSeleccionado = computed(() =>
		findSalonSeleccionado(this.salones(), this._gradoSeleccionado(), this._seccionSeleccionada()),
	);

	// Salones ya asignados al profesor — enriquecidos con nombre
	readonly salonesAsignados = computed(() =>
		computeSalonesAsignados(this.formData().salones ?? [], this.salones()),
	);

	// Verificar si el salón seleccionado ya está asignado
	readonly salonYaAsignado = computed(() =>
		isSalonYaAsignado(this.salonSeleccionado(), this.formData().salones ?? []),
	);

	// Modo de asignación del salón seleccionado en el selector grado/sección (antes de agregarlo)
	readonly salonSeleccionadoModoPreview = computed(() => computeModoPreview(this.salonSeleccionado()));
	// #endregion

	// #region Computed — opciones de sede
	readonly sedeOptions = computed(() =>
		this.sedes().map((s) => ({ label: s.nombre, value: s.id })),
	);

	// Auto-selecciona la única sede disponible cuando el form no tiene sede asignada aún
	private readonly _autoSelectSedeUnica = effect(() => {
		const sedes = this.sedes();
		if (sedes.length !== 1) return;
		if (this.formData().sedeId != null) return;
		this.fieldChange.emit({ field: 'sedeId', value: sedes[0].id });
	});
	// #endregion

	// #region Computed — ProfesorCurso (sección "Cursos que dicta")

	/** Visible si el profesor tiene salones que NO son TutorPleno (PorCurso o Flexible/Verano). */
	readonly showCursosSection = computed(() => {
		if (!this.isProfesor() || !this.isEditing()) return false;
		const asignaciones = this.formData().salones ?? [];
		const allSalones = this.salones();
		return asignaciones.some((a) => {
			const salon = allSalones.find((s) => s.salonId === a.salonId);
			return salon && resolveModoAsignacion(salon.gradoOrden, salon.seccion) !== 'TutorPleno';
		});
	});

	/** IDs de grados no-TutorPleno del profesor (para filtrar cursos disponibles). */
	private readonly gradosPorCurso = computed(() => {
		const asignaciones = this.formData().salones ?? [];
		const allSalones = this.salones();
		const gradoIds = new Set<number>();
		for (const a of asignaciones) {
			const salon = allSalones.find((s) => s.salonId === a.salonId);
			if (salon && resolveModoAsignacion(salon.gradoOrden, salon.seccion) !== 'TutorPleno') {
				gradoIds.add(salon.gradoId);
			}
		}
		return gradoIds;
	});

	/** Cursos disponibles filtrados por los grados PorCurso del profesor, excluyendo ya asignados. */
	readonly cursosOptions = computed(() => {
		const gradoIds = this.gradosPorCurso();
		const asignados = new Set(this.profesorCursos().map((c) => c.cursoId));
		return this.cursosDisponibles()
			.filter((c) => c.estado && c.grados.some((g) => gradoIds.has(g.id)))
			.filter((c) => !asignados.has(c.id))
			.map((c) => ({ label: c.nombre, value: c.id }));
	});

	// Cursos seleccionados en el multi-select para agregar
	readonly _cursosSeleccionados = signal<number[]>([]);
	// #endregion

	// #region Event handlers
	onTabChange(value: unknown): void {
		this.activeFormTab.set(value as string);
	}

	onVisibleChange(visible: boolean): void {
		if (!visible) this.activeFormTab.set('datos');
		this.visibleChange.emit(visible);
	}

	onFieldChange(field: string, value: unknown): void {
		this.fieldChange.emit({ field, value });
	}

	onGradoChange(grado: string | null): void {
		this._gradoSeleccionado.set(grado);
		this._seccionSeleccionada.set(null);
		// Para Estudiante, limpiar salonId
		if (this.isEstudiante()) {
			this.fieldChange.emit({ field: 'salonId', value: undefined });
			this.fieldChange.emit({ field: 'grado', value: undefined });
			this.fieldChange.emit({ field: 'seccion', value: undefined });
		}
	}

	onSeccionChange(seccion: string | null): void {
		this._seccionSeleccionada.set(seccion);
		const salon = this.salonSeleccionado();

		// Para Estudiante, asignar directamente salonId
		if (this.isEstudiante()) {
			if (salon) {
				this.fieldChange.emit({ field: 'salonId', value: salon.salonId });
				this.fieldChange.emit({ field: 'grado', value: salon.grado });
				this.fieldChange.emit({ field: 'seccion', value: salon.seccion });
			} else {
				this.fieldChange.emit({ field: 'salonId', value: undefined });
				this.fieldChange.emit({ field: 'grado', value: undefined });
				this.fieldChange.emit({ field: 'seccion', value: undefined });
			}
		}
		// Para Profesor, no hacer nada aquí — se agrega via "Agregar"
	}

	// Agregar salón seleccionado a la lista del profesor
	onAgregarSalon(): void {
		const salon = this.salonSeleccionado();
		if (!salon || this.salonYaAsignado()) return;

		// En modo tutor pleno, la asignación siempre queda marcada como Tutor (INV-AS06)
		const esTutor = this.salonSeleccionadoModoPreview()?.modo === 'TutorPleno';

		const current = this.formData().salones ?? [];
		const newSalones: SalonAsignacion[] = [...current, { salonId: salon.salonId, esTutor }];
		this.fieldChange.emit({ field: 'salones', value: newSalones });

		// Limpiar selector para permitir agregar otro
		this._gradoSeleccionado.set(null);
		this._seccionSeleccionada.set(null);
	}

	// Remover salón de la lista del profesor
	onRemoverSalon(salonId: number): void {
		const current = this.formData().salones ?? [];
		const newSalones = current.filter((s) => s.salonId !== salonId);
		this.fieldChange.emit({ field: 'salones', value: newSalones.length > 0 ? newSalones : undefined });
	}

	// Toggle tutor de un salón en la lista del profesor (solo aplica en modo Flexible — TutorPleno y PorCurso no muestran el control)
	onToggleTutor(salonId: number, esTutor: boolean): void {
		const current = this.formData().salones ?? [];
		const newSalones = current.map((s) =>
			s.salonId === salonId ? { ...s, esTutor } : s,
		);
		this.fieldChange.emit({ field: 'salones', value: newSalones });
	}

	// Sync grado/sección local cuando cambia formData.salonId (al abrir edición de estudiante)
	private readonly _syncGradoSeccion = effect(() => {
		const formData = this.formData();
		const salonId = formData.salonId;
		const salones = this.salones();

		if (salonId && salones.length > 0) {
			const salon = salones.find((s) => s.salonId === salonId);
			if (salon) {
				this._gradoSeleccionado.set(salon.grado);
				this._seccionSeleccionada.set(salon.seccion);

				if (formData.grado !== salon.grado) {
					this.fieldChange.emit({ field: 'grado', value: salon.grado });
				}
				if (formData.seccion !== salon.seccion) {
					this.fieldChange.emit({ field: 'seccion', value: salon.seccion });
				}
			}
		} else if (formData.grado && !this.isProfesor()) {
			this._gradoSeleccionado.set(formData.grado ?? null);
			this._seccionSeleccionada.set(formData.seccion ?? null);
		}
	});

	// ProfesorCurso handlers
	onAgregarCursos(): void {
		const ids = this._cursosSeleccionados();
		if (ids.length === 0) return;
		this.asignarCursos.emit(ids);
		this._cursosSeleccionados.set([]);
	}

	onDesasignarCurso(profesorCursoId: number): void {
		this.desasignarCurso.emit(profesorCursoId);
	}

	onSave(): void {
		this.save.emit();
	}

	onCancel(): void {
		this.cancelDialog.emit();
	}
	// #endregion
}
