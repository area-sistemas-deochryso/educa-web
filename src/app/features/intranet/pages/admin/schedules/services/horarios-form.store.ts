import { computed, Injectable, signal } from '@angular/core';

import {
	type HorarioFormData,
} from '../models/horario.interface';
import { validateHorarioForm, validateHoraInicio, validateHoraFin } from '../helpers/horario-form.utils';

const initialFormData: HorarioFormData = {
	diaSemana: null,
	horaInicio: '07:00',
	horaFin: '08:00',
	salonId: null,
	cursoId: null,
	profesorId: null,
	estudianteIds: null,
};

/**
 * Sub-store para el estado del formulario wizard de horarios.
 * Gestiona: formData, editingId, wizard steps, dialog visibility, validaciones.
 */
@Injectable({ providedIn: 'root' })
export class SchedulesFormStore {
	// #region Estado privado
	private readonly _formData = signal<HorarioFormData>({ ...initialFormData });
	private readonly _editingId = signal<number | null>(null);
	private readonly _wizardStep = signal(0);
	private readonly _dialogVisible = signal(false);
	private readonly _detailDrawerVisible = signal(false);
	private readonly _cursoDialogVisible = signal(false);
	// #endregion

	// #region Lecturas públicas (readonly)
	readonly formData = this._formData.asReadonly();
	readonly editingId = this._editingId.asReadonly();
	readonly wizardStep = this._wizardStep.asReadonly();
	readonly dialogVisible = this._dialogVisible.asReadonly();
	readonly detailDrawerVisible = this._detailDrawerVisible.asReadonly();
	readonly cursoDialogVisible = this._cursoDialogVisible.asReadonly();
	// #endregion

	// #region Computed - Validaciones
	readonly formValid = computed(() =>
		validateHorarioForm(this._formData(), this._wizardStep()),
	);

	readonly horaInicioError = computed(() => {
		const data = this._formData();
		return validateHoraInicio(data.horaInicio, data.horaFin);
	});

	readonly horaFinError = computed(() => {
		const data = this._formData();
		return validateHoraFin(data.horaFin, data.horaInicio);
	});
	// #endregion

	// #region Computed - Estados de UI
	readonly isCreating = computed(() => this._editingId() === null);
	readonly isEditing = computed(() => this._editingId() !== null);
	readonly canGoNextStep = computed(() => this.formValid() && this._wizardStep() < 2);
	readonly canGoPrevStep = computed(() => this._wizardStep() > 0);
	readonly isLastStep = computed(() => this._wizardStep() === 2);
	// #endregion

	// #region Comandos - Dialog
	openDialog(): void {
		this._dialogVisible.set(true);
	}

	closeDialog(): void {
		this._dialogVisible.set(false);
		this._wizardStep.set(0);
		this._formData.set({ ...initialFormData });
		this._editingId.set(null);
	}

	openDetailDrawer(): void {
		this._detailDrawerVisible.set(true);
	}

	closeDetailDrawer(): void {
		this._detailDrawerVisible.set(false);
	}

	openCursoDialog(): void {
		this._cursoDialogVisible.set(true);
	}

	closeCursoDialog(): void {
		this._cursoDialogVisible.set(false);
	}
	// #endregion

	// #region Comandos - Wizard
	nextStep(): void {
		this._wizardStep.update((s) => Math.min(s + 1, 2));
	}

	prevStep(): void {
		this._wizardStep.update((s) => Math.max(s - 1, 0));
	}

	resetWizard(): void {
		this._wizardStep.set(0);
	}
	// #endregion

	// #region Comandos - Formulario
	setFormData(data: Partial<HorarioFormData>): void {
		this._formData.update((current) => ({ ...current, ...data }));
	}

	clearFormData(): void {
		this._formData.set({ ...initialFormData });
		this._editingId.set(null);
	}

	setEditingId(id: number | null): void {
		this._editingId.set(id);
	}
	// #endregion
}
