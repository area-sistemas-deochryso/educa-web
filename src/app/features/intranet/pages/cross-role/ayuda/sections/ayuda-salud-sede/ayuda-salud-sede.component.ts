// #region Imports
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import {
	SALUD_SEDE_DIMENSIONES,
	SALUD_SEDE_DIMENSION_LABELS,
	SALUD_SEDE_RATING_LABELS,
	SaludSedeDimension,
	SaludSedeRating,
} from './models/salud-sede.models';
import { AyudaSaludSedeFacade } from './services/ayuda-salud-sede.facade';
import { EduButton, EduMessage, EduSelect, EduSpinner, EduTag } from '@edu-ui';
// #endregion

interface SelectOption<T> {
	label: string;
	value: T;
}

const DIMENSION_OPTIONS: SelectOption<SaludSedeDimension>[] = SALUD_SEDE_DIMENSIONES.map((d) => ({
	label: SALUD_SEDE_DIMENSION_LABELS[d],
	value: d,
}));

const RATING_OPTIONS: SelectOption<SaludSedeRating>[] = (
	['Bien', 'Advertencia', 'Critico'] as SaludSedeRating[]
).map((r) => ({ label: SALUD_SEDE_RATING_LABELS[r], value: r }));

/** Mapea al `severity` de `p-tag` (design-system.md §6 — estado operativo, sin `tag-neutral`). */
const RATING_SEVERITY: Record<SaludSedeRating, 'success' | 'warn' | 'danger'> = {
	Bien: 'success',
	Advertencia: 'warn',
	Critico: 'danger',
};

/**
 * Sección Salud de sede: formulario de reporte por dimensión (abierto a
 * cualquier rol, sin gate de capability) + vista del estado vigente por
 * dimensión (mismo valor para cualquier rol que consulte). Sin historial —
 * solo el estado vigente, resuelto por el BE.
 */
@Component({
	selector: 'app-ayuda-salud-sede',
	standalone: true,
	imports: [FormsModule, EduSelect, EduButton, EduSpinner, EduMessage, EduTag],
	providers: [AyudaSaludSedeFacade],
	templateUrl: './ayuda-salud-sede.component.html',
	styleUrl: './ayuda-salud-sede.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AyudaSaludSedeComponent implements OnInit {
	// #region Dependencies
	private readonly facade = inject(AyudaSaludSedeFacade);
	// #endregion

	// #region State del facade
	readonly estado = this.facade.estado;
	readonly loadingEstado = this.facade.loadingEstado;
	readonly errorEstado = this.facade.errorEstado;
	readonly submitting = this.facade.submitting;
	readonly submitError = this.facade.submitError;
	readonly submitSuccess = this.facade.submitSuccess;
	// #endregion

	// #region Opciones del formulario
	readonly dimensionOptions = DIMENSION_OPTIONS;
	readonly ratingOptions = RATING_OPTIONS;
	readonly dimensionLabels = SALUD_SEDE_DIMENSION_LABELS;
	readonly ratingLabels = SALUD_SEDE_RATING_LABELS;
	// #endregion

	// #region Estado local — formulario
	readonly selectedDimension = signal<SaludSedeDimension | null>(null);
	readonly selectedRating = signal<SaludSedeRating | null>(null);
	readonly canSubmit = computed(() => !!this.selectedDimension() && !!this.selectedRating() && !this.submitting());
	// #endregion

	/**
	 * Estado vigente por dimensión, siempre con las 3 dimensiones del catálogo
	 * fijo (default `Bien` si el BE nunca recibió un reporte para esa
	 * dimensión — sin reportes conocidos equivale a "sin problema conocido").
	 */
	readonly estadoPorDimension = computed(() => {
		const porDimension = new Map(this.estado().map((e) => [e.dimension, e.rating]));
		return SALUD_SEDE_DIMENSIONES.map((dimension) => ({
			dimension,
			rating: porDimension.get(dimension) ?? ('Bien' as SaludSedeRating),
		}));
	});

	/** Sin ninguna dimensión en Advertencia/Crítico → colapsar al mensaje genérico. */
	readonly todoBien = computed(() => this.estadoPorDimension().every((e) => e.rating === 'Bien'));

	ratingSeverity(rating: SaludSedeRating): 'success' | 'warn' | 'danger' {
		return RATING_SEVERITY[rating];
	}

	ngOnInit(): void {
		this.facade.init();
	}

	// #region Handlers
	onDimensionChange(value: SaludSedeDimension | null): void {
		this.selectedDimension.set(value);
	}

	onRatingChange(value: SaludSedeRating | null): void {
		this.selectedRating.set(value);
	}

	onSubmit(): void {
		const dimension = this.selectedDimension();
		const rating = this.selectedRating();
		if (!dimension || !rating) return;

		this.facade.reportar(dimension, rating);
	}
	// #endregion
}
