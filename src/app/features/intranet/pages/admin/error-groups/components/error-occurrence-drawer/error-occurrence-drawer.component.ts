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
import { TabsModule } from 'primeng/tabs';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';

import { logger } from '@core/helpers';
import { CorrelationIdPillComponent } from '@intranet-shared/components';

import { ErrorGroupsService } from '../../services';
import type { ClientEnvironmentSnapshot, ClientMetricsSnapshot } from '@core/services/error';

import {
	ErrorGroupContext,
	ErrorGroupEstado,
	ErrorGroupLista,
	ErrorLogCompleto,
	ErrorLogCounterpart,
	ErrorOrigen,
	ErrorSeveridad,
	ESTADO_LABEL_MAP,
	ESTADO_SEVERITY_MAP,
	OcurrenciaLista,
	ORIGEN_ICON_MAP,
	ORIGEN_LABEL_MAP,
	SEVERIDAD_SEVERITY_MAP,
	TIPO_ACCION_ICON_MAP,
	TRACE_CAPA_ICON_MAP,
	TRACE_CAPA_LABEL_MAP,
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
		TabsModule,
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
	/**
	 * Grupo padre del que viene esta ocurrencia. Pasado por el componente
	 * page para llenar el tab "Group" sin pegarle a un endpoint nuevo.
	 * `null` cuando el sub-drawer se abre desde un contexto sin grupo
	 * conocido (no existe hoy, pero es defensivo).
	 */
	readonly parentGroup = input<ErrorGroupLista | null>(null);
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
	private readonly _groupContext = signal<ErrorGroupContext | null>(null);
	private readonly _counterpart = signal<ErrorLogCounterpart | null>(null);
	private readonly _loading = signal(false);
	private readonly _notFound = signal(false);
	private readonly _groupOcurrencias = signal<OcurrenciaLista[]>([]);
	private readonly _groupOcurrenciasLoading = signal(false);

	readonly errorCompleto = this._errorCompleto.asReadonly();
	readonly groupContext = this._groupContext.asReadonly();
	readonly counterpart = this._counterpart.asReadonly();
	readonly loading = this._loading.asReadonly();
	readonly notFound = this._notFound.asReadonly();
	readonly groupOcurrencias = this._groupOcurrencias.asReadonly();

	readonly clientEnvironment = computed<ClientEnvironmentSnapshot | null>(() => {
		const json = this._errorCompleto()?.clientEnvironment;
		if (!json) return null;
		try { return JSON.parse(json) as ClientEnvironmentSnapshot; }
		catch { return null; }
	});

	readonly metricsBuffer = computed<ClientMetricsSnapshot[]>(() => {
		return this.clientEnvironment()?.metricsBuffer ?? [];
	});
	readonly groupOcurrenciasLoading = this._groupOcurrenciasLoading.asReadonly();

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
	readonly estadoLabel = ESTADO_LABEL_MAP;
	readonly estadoSeverity = ESTADO_SEVERITY_MAP;
	readonly traceCapaIcon = TRACE_CAPA_ICON_MAP;
	readonly traceCapaLabel = TRACE_CAPA_LABEL_MAP;
	// #endregion

	constructor() {
		effect(() => {
			const isVisible = this.visible();
			const errId = this.errorId();
			const cid = this.correlationId();

			if (!isVisible) {
				this._errorCompleto.set(null);
				this._groupContext.set(null);
				this._counterpart.set(null);
				this._groupOcurrencias.set([]);
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
			.getOcurrenciaFull(id)
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: (full) => {
					this._errorCompleto.set(full.error);
					this._groupContext.set(full.group);
					this._counterpart.set(full.counterpart);
					this._loading.set(false);
					if (full.group?.id) {
						this.loadGroupOcurrencias(full.group.id);
					}
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

	private loadGroupOcurrencias(groupId: number): void {
		this._groupOcurrenciasLoading.set(true);
		this.service
			.getOcurrencias(groupId, 1, 10)
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: (items) => {
					this._groupOcurrencias.set(items);
					this._groupOcurrenciasLoading.set(false);
				},
				error: () => {
					this._groupOcurrencias.set([]);
					this._groupOcurrenciasLoading.set(false);
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

	// #region Computed (derived from error for template)
	readonly errorDerived = computed(() => {
		const err = this._errorCompleto();
		if (!err) return null;
		const origenSev = err.origen === 'BACKEND' ? 'warn' as const : err.origen === 'NETWORK' ? 'danger' as const : 'info' as const;
		return {
			origenIcon: this.origenIcon[err.origen as ErrorOrigen] ?? 'pi pi-question',
			origenLabel: this.origenLabel[err.origen as ErrorOrigen] ?? err.origen,
			origenSeverity: origenSev,
			sourceLocation: parseSourceLocation(err.sourceLocation)?.funcion ?? '',
			hasReproduction: !!(err.requestBody || err.responseBody || err.requestHeaders),
			formattedHeaders: this.formatJsonValue(err.requestHeaders),
			formattedRequestBody: this.formatJsonValue(err.requestBody),
			formattedResponseBody: this.formatJsonValue(err.responseBody),
		};
	});

	readonly groupDerived = computed(() => {
		const grp = this._groupContext();
		if (!grp) return null;
		return {
			estadoLabel: this.estadoLabel[grp.estado as ErrorGroupEstado] ?? grp.estado,
			estadoSeverity: this.estadoSeverity[grp.estado as ErrorGroupEstado] ?? ('secondary' as const),
			severidadSeverity: this.severidadSeverity[grp.severidad as ErrorSeveridad] ?? ('info' as const),
		};
	});

	readonly counterpartDerived = computed(() => {
		const cp = this._counterpart();
		if (!cp) return null;
		return {
			origenSeverity: cp.origen === 'BACKEND' ? 'warn' as const : cp.origen === 'NETWORK' ? 'danger' as const : 'info' as const,
			severidadSeverity: this.severidadSeverity[cp.severidad as ErrorSeveridad] ?? ('info' as const),
		};
	});

	formatJsonValue(json: string | null): string {
		if (!json) return '';
		try {
			return JSON.stringify(JSON.parse(json), null, 2);
		} catch {
			return json;
		}
	}
	// #endregion

	// #region Helpers visuales
	copyForReproduction(err: ErrorLogCompleto): void {
		const parts: string[] = [];
		if (err.httpMethod && err.url) {
			parts.push(`${err.httpMethod} ${err.url}`);
		}
		if (err.requestHeaders) {
			parts.push(`\nHeaders:\n${this.formatJsonValue(err.requestHeaders)}`);
		}
		if (err.requestBody) {
			parts.push(`\nRequest Body:\n${this.formatJsonValue(err.requestBody)}`);
		}
		if (err.responseBody) {
			parts.push(`\nResponse Body:\n${this.formatJsonValue(err.responseBody)}`);
		}

		const text = parts.join('\n');
		navigator.clipboard.writeText(text);
	}
	// #endregion
}
