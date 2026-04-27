// #region Imports
import {
	ChangeDetectionStrategy,
	Component,
	DestroyRef,
	computed,
	effect,
	inject,
	input,
	output,
	signal,
} from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { ButtonModule } from 'primeng/button';
import { DrawerModule } from 'primeng/drawer';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';

import { logger } from '@core/helpers';
import { CorrelationIdPillComponent } from '@shared/components/correlation-id-pill';

import { ErrorGroupsService } from '../../services';
import {
	BreadcrumbTipoAccion,
	ErrorLogCompleto,
	ErrorOrigen,
	ErrorSeveridad,
	ORIGEN_ICON_MAP,
	ORIGEN_LABEL_MAP,
	SEVERIDAD_SEVERITY_MAP,
	TIPO_ACCION_ICON_MAP,
	parseSourceLocation,
} from '../../models';

// #endregion
/**
 * Sub-drawer con el detalle completo de una ocurrencia (`ErrorLog`) dentro de
 * un `ErrorGroup`. Reusa el endpoint legacy `/api/sistema/errors/{id}` que
 * devuelve stack/breadcrumbs/payloads enmascarados por el BE.
 *
 * Antes vivía como `error-log-detail-drawer` en el feature `error-logs`.
 * Migrado al feature `error-groups` en Plan 34 Chat 4 — la lógica es la misma
 * salvo que ya no expone el botón de eliminar (la eliminación ocurre a nivel
 * de grupo).
 *
 * Sigue siempre en el DOM (regla dialogs-sync.md). Sincronización explícita
 * con `[visible]` + `(visibleChange)`.
 */
@Component({
	selector: 'app-error-occurrence-drawer',
	standalone: true,
	changeDetection: ChangeDetectionStrategy.OnPush,
	imports: [
		CommonModule,
		DatePipe,
		RouterLink,
		ButtonModule,
		DrawerModule,
		TagModule,
		TooltipModule,
		CorrelationIdPillComponent,
	],
	templateUrl: './error-occurrence-drawer.component.html',
	styleUrl: './error-occurrence-drawer.component.scss',
})
export class ErrorOccurrenceDrawerComponent {
	// #region Dependencias
	private readonly service = inject(ErrorGroupsService);
	private readonly destroyRef = inject(DestroyRef);
	// #endregion

	// #region Inputs / Outputs
	readonly visible = input<boolean>(false);
	readonly errorId = input<number | null>(null);
	readonly correlationId = input<string | null>(null);
	readonly visibleChange = output<boolean>();
	/**
	 * Se emite cuando el drawer recibe 404 al cargar un errorId que venía de la
	 * lista. Señal de cache stale (típicamente post-purga). El padre debe
	 * invalidar cache y refrescar.
	 */
	readonly staleDataDetected = output<number>();
	// #endregion

	// #region Estado interno
	private readonly _errorCompleto = signal<ErrorLogCompleto | null>(null);
	private readonly _loading = signal(false);
	private readonly _notFound = signal(false);

	readonly errorCompleto = this._errorCompleto.asReadonly();
	readonly loading = this._loading.asReadonly();
	readonly notFound = this._notFound.asReadonly();

	readonly vm = computed(() => ({
		visible: this.visible(),
		loading: this._loading(),
		errorCompleto: this._errorCompleto(),
		notFound: this._notFound(),
	}));
	// #endregion

	// #region Maps para template
	readonly severidadSeverity = SEVERIDAD_SEVERITY_MAP;
	readonly origenIcon = ORIGEN_ICON_MAP;
	readonly origenLabel = ORIGEN_LABEL_MAP;
	readonly tipoAccionIcon = TIPO_ACCION_ICON_MAP;
	// #endregion

	constructor() {
		effect(() => {
			const isVisible = this.visible();
			const errId = this.errorId();
			const cid = this.correlationId();

			if (!isVisible) {
				this._errorCompleto.set(null);
				this._notFound.set(false);
				return;
			}

			if (errId) {
				this.loadByErrorId(errId);
			} else if (cid) {
				this.loadByCorrelationId(cid);
			} else {
				this._notFound.set(true);
			}
		});
	}

	// #region Carga
	private loadByErrorId(id: number): void {
		this._loading.set(true);
		this._notFound.set(false);
		this.service
			.getOcurrenciaCompleta(id)
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: (err) => {
					this._errorCompleto.set(err);
					this._loading.set(false);
				},
				error: (e) => {
					logger.error('[ErrorOccurrenceDrawer] Error cargando por id', e);
					this._loading.set(false);
					this._notFound.set(true);
					if (e instanceof HttpErrorResponse && e.status === 404) {
						this.staleDataDetected.emit(id);
					}
				},
			});
	}

	private loadByCorrelationId(_cid: string): void {
		// El feature error-groups no tiene endpoint de búsqueda por correlationId
		// directo (eso está en el hub de correlation, Plan 32). El sub-drawer se
		// abre siempre desde una ocurrencia conocida (errorId), así que esta
		// rama queda como fallback para el caso en que un consumidor externo
		// pase correlationId — marcamos not-found.
		this._loading.set(false);
		this._notFound.set(true);
	}
	// #endregion

	// #region Event handlers
	onVisibleChange(visible: boolean): void {
		this.visibleChange.emit(visible);
	}
	// #endregion

	// #region Helpers visuales
	getSeveridadSeverity(severidad: string): 'danger' | 'warn' | 'info' {
		return this.severidadSeverity[severidad as ErrorSeveridad] ?? 'info';
	}

	getOrigenIcon(origen: string): string {
		return this.origenIcon[origen as ErrorOrigen] ?? 'pi pi-question';
	}

	getOrigenLabel(origen: string): string {
		return this.origenLabel[origen as ErrorOrigen] ?? origen;
	}

	getOrigenSeverity(origen: string): 'info' | 'warn' | 'danger' | 'secondary' {
		if (origen === 'BACKEND') return 'warn';
		if (origen === 'NETWORK') return 'danger';
		return 'info';
	}

	getTipoAccionIcon(tipo: string): string {
		return this.tipoAccionIcon[tipo as BreadcrumbTipoAccion] ?? 'pi pi-circle';
	}

	formatSourceLocation(json: string | null): string {
		const loc = parseSourceLocation(json);
		return loc?.funcion ?? '';
	}

	formatJson(json: string | null): string {
		if (!json) return '';
		try {
			return JSON.stringify(JSON.parse(json), null, 2);
		} catch {
			return json;
		}
	}

	hasReproductionData(err: ErrorLogCompleto): boolean {
		return !!(err.requestBody || err.responseBody || err.requestHeaders);
	}

	copyForReproduction(err: ErrorLogCompleto): void {
		const parts: string[] = [];
		if (err.httpMethod && err.url) {
			parts.push(`${err.httpMethod} ${err.url}`);
		}
		if (err.requestHeaders) {
			parts.push(`\nHeaders:\n${this.formatJson(err.requestHeaders)}`);
		}
		if (err.requestBody) {
			parts.push(`\nRequest Body:\n${this.formatJson(err.requestBody)}`);
		}
		if (err.responseBody) {
			parts.push(`\nResponse Body:\n${this.formatJson(err.responseBody)}`);
		}

		const text = parts.join('\n');
		navigator.clipboard.writeText(text);
	}
	// #endregion
}
