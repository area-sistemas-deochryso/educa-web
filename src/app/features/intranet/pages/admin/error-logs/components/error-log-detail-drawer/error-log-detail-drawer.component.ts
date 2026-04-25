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

import { ErrorLogsService } from '../../services';
import {
	ErrorOrigen,
	ErrorSeveridad,
	BreadcrumbTipoAccion,
	ErrorLogCompleto,
	SEVERIDAD_SEVERITY_MAP,
	ORIGEN_ICON_MAP,
	ORIGEN_LABEL_MAP,
	TIPO_ACCION_ICON_MAP,
	parseSourceLocation,
} from '../../models';

// #endregion
// #region Implementation
/**
 * Drawer reutilizable con el detalle completo de un error de trazabilidad.
 * Puede abrirse de dos formas:
 * 1. `[errorId]` — cuando ya se conoce el ID del error (desde la tabla de trazabilidad)
 * 2. `[correlationId]` — cuando se tiene el correlation ID (desde un reporte de usuario)
 *    En ese caso busca el error más reciente con ese correlationId.
 *
 * Se mantiene siempre en el DOM (regla dialogs-sync.md). Sincronización explícita
 * con `[visible]` + `(visibleChange)`.
 */
@Component({
	selector: 'app-error-log-detail-drawer',
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
	templateUrl: './error-log-detail-drawer.component.html',
	styleUrl: './error-log-detail-drawer.component.scss',
})
export class ErrorLogDetailDrawerComponent {
	// #region Dependencias
	private readonly service = inject(ErrorLogsService);
	private readonly destroyRef = inject(DestroyRef);
	// #endregion

	// #region Inputs / Outputs
	readonly visible = input<boolean>(false);
	readonly errorId = input<number | null>(null);
	readonly correlationId = input<string | null>(null);
	/** Cuando true, el drawer muestra el botón de eliminar. Activado solo en la vista admin. */
	readonly canDelete = input<boolean>(false);
	readonly visibleChange = output<boolean>();
	readonly deleteRequested = output<ErrorLogCompleto>();
	/**
	 * Se emite cuando el drawer recibe 404 al cargar un errorId que venía de la lista.
	 * Señal inequívoca de que el cache de la lista está desactualizado (ej: item ya purgado).
	 * El padre debe invalidar cache y refrescar. No se emite en búsqueda por correlationId.
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
		canDelete: this.canDelete(),
	}));
	// #endregion

	// #region Maps para template
	readonly severidadSeverity = SEVERIDAD_SEVERITY_MAP;
	readonly origenIcon = ORIGEN_ICON_MAP;
	readonly origenLabel = ORIGEN_LABEL_MAP;
	readonly tipoAccionIcon = TIPO_ACCION_ICON_MAP;
	// #endregion

	constructor() {
		// Cuando se abre el drawer O cambia el identificador, disparar la carga.
		effect(() => {
			const isVisible = this.visible();
			const errId = this.errorId();
			const cid = this.correlationId();

			if (!isVisible) {
				// Al cerrar limpiamos el estado para que al reabrir con otro id no se vea el anterior.
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
			.getCompleto(id)
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: (err) => {
					this._errorCompleto.set(err);
					this._loading.set(false);
				},
				error: (e) => {
					logger.error('[ErrorLogDetailDrawer] Error cargando por id', e);
					this._loading.set(false);
					this._notFound.set(true);
					// 404 al cargar por errorId significa que el item estaba en la lista
					// pero ya no existe en BD → cache stale (típicamente post-purga).
					if (e instanceof HttpErrorResponse && e.status === 404) {
						this.staleDataDetected.emit(id);
					}
				},
			});
	}

	private loadByCorrelationId(cid: string): void {
		this._loading.set(true);
		this._notFound.set(false);
		// Backend ya soporta filtro por correlationId — pedimos el más reciente (page 1, size 1).
		this.service
			.getErrores(null, null, cid, 1, 1)
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: (items) => {
					if (items.length === 0) {
						this._errorCompleto.set(null);
						this._notFound.set(true);
						this._loading.set(false);
						return;
					}
					// Tenemos el id, ahora cargamos el completo con breadcrumbs.
					this.loadByErrorId(items[0].id);
				},
				error: (e) => {
					logger.error('[ErrorLogDetailDrawer] Error buscando por correlationId', e);
					this._loading.set(false);
					this._notFound.set(true);
				},
			});
	}
	// #endregion

	// #region Event handlers
	onVisibleChange(visible: boolean): void {
		this.visibleChange.emit(visible);
	}

	onDeleteClick(err: ErrorLogCompleto): void {
		// La confirmación la maneja el componente padre para mantener el drawer
		// desacoplado de ConfirmationService.
		this.deleteRequested.emit(err);
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
// #endregion
