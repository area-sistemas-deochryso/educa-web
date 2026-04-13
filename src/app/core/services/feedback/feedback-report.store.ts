// #region Imports
import { Injectable, computed, signal } from '@angular/core';

import { ReporteFormData } from './feedback-report.models';

// #endregion
// #region Implementation
/**
 * Store del dialog global de reporte de usuario.
 * Mantiene visibilidad, formulario y estado de envío — suficiente para el launcher + dialog.
 */
@Injectable({ providedIn: 'root' })
export class FeedbackReportStore {
	// #region Estado privado
	private readonly _dialogVisible = signal(false);
	private readonly _submitting = signal(false);
	private readonly _lastSubmittedOk = signal(false);
	private readonly _error = signal<string | null>(null);
	private readonly _formData = signal<ReporteFormData>({
		tipo: null,
		descripcion: '',
		propuesta: '',
	});

	/**
	 * Correlation ID del error visible más reciente detectado al abrir el dialog.
	 * Si es distinto de null, el dialog muestra un banner "Enlazar con error reciente"
	 * y el facade lo usa como correlationId del reporte (con prioridad sobre lastRequestId).
	 */
	private readonly _recentErrorId = signal<string | null>(null);
	private readonly _linkToRecentError = signal(true);
	// #endregion

	// #region Lecturas públicas
	readonly dialogVisible = this._dialogVisible.asReadonly();
	readonly submitting = this._submitting.asReadonly();
	readonly lastSubmittedOk = this._lastSubmittedOk.asReadonly();
	readonly error = this._error.asReadonly();
	readonly formData = this._formData.asReadonly();
	readonly recentErrorId = this._recentErrorId.asReadonly();
	readonly linkToRecentError = this._linkToRecentError.asReadonly();
	// #endregion

	// #region Validaciones derivadas
	readonly descripcionError = computed(() => {
		const desc = this._formData().descripcion?.trim() ?? '';
		if (!desc) return 'La descripción es obligatoria';
		if (desc.length < 20) return `Falta detalle — mínimo 20 caracteres (${desc.length}/20)`;
		if (desc.length > 2000) return 'Máximo 2000 caracteres';
		return null;
	});

	readonly tipoError = computed(() => {
		return this._formData().tipo ? null : 'Selecciona el tipo de problema';
	});

	readonly isValid = computed(() => !this.descripcionError() && !this.tipoError());
	// #endregion

	// #region ViewModel
	readonly vm = computed(() => ({
		dialogVisible: this._dialogVisible(),
		submitting: this._submitting(),
		lastSubmittedOk: this._lastSubmittedOk(),
		error: this._error(),
		formData: this._formData(),
		descripcionError: this.descripcionError(),
		tipoError: this.tipoError(),
		isValid: this.isValid(),
		recentErrorId: this._recentErrorId(),
		linkToRecentError: this._linkToRecentError(),
	}));
	// #endregion

	// #region Comandos UI
	openDialog(): void {
		this._dialogVisible.set(true);
		this._lastSubmittedOk.set(false);
		this._error.set(null);
	}

	closeDialog(): void {
		this._dialogVisible.set(false);
		this._lastSubmittedOk.set(false);
		this._error.set(null);
		this._recentErrorId.set(null);
		this._linkToRecentError.set(true);
	}

	resetForm(): void {
		this._formData.set({ tipo: null, descripcion: '', propuesta: '' });
		this._error.set(null);
		this._lastSubmittedOk.set(false);
	}

	setRecentErrorId(id: string | null): void {
		this._recentErrorId.set(id);
		this._linkToRecentError.set(id !== null);
	}

	setLinkToRecentError(value: boolean): void {
		this._linkToRecentError.set(value);
	}

	updateForm(patch: Partial<ReporteFormData>): void {
		this._formData.update((f) => ({ ...f, ...patch }));
	}
	// #endregion

	// #region Comandos ciclo de envío
	setSubmitting(value: boolean): void {
		this._submitting.set(value);
	}

	setError(message: string | null): void {
		this._error.set(message);
	}

	markSubmittedOk(): void {
		this._lastSubmittedOk.set(true);
		this._submitting.set(false);
		this._error.set(null);
	}
	// #endregion
}
// #endregion
