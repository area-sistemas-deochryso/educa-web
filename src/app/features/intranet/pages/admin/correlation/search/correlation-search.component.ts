// #region Imports
import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { logger } from '@core/helpers';

import { PageHeaderComponent } from '@intranet-shared/components';
import { CorrelationIdPillComponent } from '@intranet-shared/components';

import { CorrelationService } from '../services';
import { EduButton, EduDatePicker, EduIconField, EduInputIcon, EduInputText } from '@edu-ui';
// #endregion

/**
 * Plan 41 F5 (brief 720) — página de búsqueda full-text del hub de correlación
 * (`/intranet/admin/correlation/buscar`). Matchea texto libre contra
 * mensajes de error, descripciones de feedback y contenido del outbox
 * (asunto/último error). Resultados: pills clickeables que navegan al hub
 * `/intranet/admin/correlation/:id`.
 *
 * Sin store/facade — es un formulario de un solo request, no justifica esas
 * capas (a diferencia del hub de detalle, que tiene polling + export + 2 vistas).
 */
@Component({
	selector: 'app-correlation-search',
	standalone: true,
	imports: [
		FormsModule,
		PageHeaderComponent,
		EduButton,
		EduInputText,
		EduDatePicker,
		EduIconField,
		EduInputIcon,
		CorrelationIdPillComponent,
	],
	templateUrl: './correlation-search.component.html',
	styleUrl: './correlation-search.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CorrelationSearchComponent {
	// #region Dependencias
	private readonly api = inject(CorrelationService);
	private readonly destroyRef = inject(DestroyRef);
	// #endregion

	// #region Constantes (espejo de CorrelationController — Plan 41 F5)
	readonly QUERY_MIN_LENGTH = 3;
	readonly QUERY_MAX_LENGTH = 100;
	// #endregion

	// #region Estado del form
	readonly query = signal('');
	readonly dni = signal('');
	readonly desde = signal<Date | null>(null);
	readonly hasta = signal<Date | null>(null);
	// #endregion

	// #region Estado del resultado
	readonly loading = signal(false);
	readonly error = signal<string | null>(null);
	readonly results = signal<string[] | null>(null);
	// #endregion

	// #region Validación client-side (misma regla que el BE, para feedback inmediato)
	validationError(): string | null {
		const trimmed = this.query().trim();
		if (trimmed.length === 0) return null; // aún no intentó buscar
		if (trimmed.length < this.QUERY_MIN_LENGTH) {
			return `Ingresá al menos ${this.QUERY_MIN_LENGTH} caracteres`;
		}
		if (trimmed.length > this.QUERY_MAX_LENGTH) {
			return `Máximo ${this.QUERY_MAX_LENGTH} caracteres`;
		}
		const dniTrimmed = this.dni().trim();
		if (dniTrimmed && !/^\d{4}$/.test(dniTrimmed)) {
			return 'El DNI debe ser exactamente 4 dígitos (últimos 4)';
		}
		const desde = this.desde();
		const hasta = this.hasta();
		if (desde && hasta && desde > hasta) {
			return 'Desde no puede ser posterior a Hasta';
		}
		return null;
	}
	// #endregion

	// #region Event handlers
	onSearch(): void {
		const trimmed = this.query().trim();
		if (trimmed.length < this.QUERY_MIN_LENGTH || trimmed.length > this.QUERY_MAX_LENGTH) return;
		const dniTrimmed = this.dni().trim();
		if (dniTrimmed && !/^\d{4}$/.test(dniTrimmed)) return;

		this.loading.set(true);
		this.error.set(null);
		this.results.set(null);

		this.api
			.search({
				query: trimmed,
				dni: dniTrimmed || null,
				desde: this.toIsoDate(this.desde()),
				hasta: this.toIsoDate(this.hasta()),
			})
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: (ids) => {
					this.results.set(ids);
					this.loading.set(false);
				},
				error: (err: HttpErrorResponse) => {
					logger.error('[CorrelationSearchComponent] Error en búsqueda', err);
					this.loading.set(false);
					this.results.set(null);
					this.error.set(
						err.status === 400
							? 'Filtros inválidos. Revisá la query, el rango de fechas o el DNI.'
							: 'No se pudo completar la búsqueda. Reintentá en unos segundos.',
					);
				},
			});
	}

	onClear(): void {
		this.query.set('');
		this.dni.set('');
		this.desde.set(null);
		this.hasta.set(null);
		this.results.set(null);
		this.error.set(null);
	}
	// #endregion

	// #region Helpers
	private toIsoDate(date: Date | null): string | null {
		if (!date) return null;
		const yyyy = date.getFullYear();
		const mm = String(date.getMonth() + 1).padStart(2, '0');
		const dd = String(date.getDate()).padStart(2, '0');
		return `${yyyy}-${mm}-${dd}`;
	}
	// #endregion
}
