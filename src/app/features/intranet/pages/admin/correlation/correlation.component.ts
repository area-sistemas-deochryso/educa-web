// #region Imports
import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';

import { logger } from '@core/helpers';
import { StorageService, type CorrelationViewMode } from '@core/services';

import { PageHeaderComponent } from '@intranet-shared/components';
import { CorrelationIdPillComponent } from '@shared/components';

import { CorrelationExportService, CorrelationFacade } from './services';
import { CorrelationErrorsSectionComponent } from './components/correlation-errors-section';
import { CorrelationRateLimitSectionComponent } from './components/correlation-rate-limit-section';
import { CorrelationReportsSectionComponent } from './components/correlation-reports-section';
import { CorrelationEmailsSectionComponent } from './components/correlation-emails-section';
import { CorrelationTimelineSectionComponent } from './components/correlation-timeline-section';
// #endregion

/**
 * Plan 32 Chat 4 — Hub central `/intranet/admin/correlation/:id`.
 *
 * Lee el `:id` del paramMap y dispara `loadSnapshot`. Renderiza siempre las
 * 4 secciones (errors / rate-limit / reportes / outbox) con su empty state
 * si vienen vacías. No hay paginación (el BE caprea a 100 filas por sección).
 *
 * Plan 41 F1 — agrega toggle entre vista timeline cronológica unificada
 * (default) y vista por sección, persistido en `PreferencesStorageService`.
 *
 * No tiene entrada de menú — es deep-link admin. La pill `<app-correlation-id-pill>`
 * desde los 4 dashboards es la única forma de llegar acá.
 */
@Component({
	selector: 'app-correlation',
	standalone: true,
	imports: [
		CommonModule,
		DatePipe,
		ButtonModule,
		TooltipModule,
		PageHeaderComponent,
		CorrelationTimelineSectionComponent,
		CorrelationErrorsSectionComponent,
		CorrelationRateLimitSectionComponent,
		CorrelationReportsSectionComponent,
		CorrelationEmailsSectionComponent,
		CorrelationIdPillComponent,
	],
	templateUrl: './correlation.component.html',
	styleUrl: './correlation.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CorrelationComponent implements OnInit {
	// #region Dependencias
	private readonly facade = inject(CorrelationFacade);
	private readonly route = inject(ActivatedRoute);
	private readonly router = inject(Router);
	private readonly destroyRef = inject(DestroyRef);
	private readonly storage = inject(StorageService);
	private readonly exporter = inject(CorrelationExportService);
	// #endregion

	// #region Estado
	readonly vm = this.facade.vm;
	readonly viewMode = signal<CorrelationViewMode>(this.storage.getCorrelationViewMode());

	// Plan 41 Chat 11 — auto-refresh opt-in cada 30s con pausa por visibilitychange.
	readonly autoRefresh = signal<boolean>(this.storage.getCorrelationAutoRefresh());
	private pollHandle: ReturnType<typeof setInterval> | null = null;
	private visibilityListener: (() => void) | null = null;
	private readonly POLL_INTERVAL_MS = 30_000;

	// Plan 41 Chat 3b — sección "Otros correlation IDs de este usuario (últimas 2h)".
	readonly relatedIds = computed<readonly string[]>(
		() => this.vm().snapshot?.relatedCorrelationIds ?? [],
	);
	readonly hasRelatedIds = computed(() => this.relatedIds().length > 0);

	// F-018 — gate del botón Exportar JSON: además de loading/sin snapshot,
	// deshabilitar cuando el snapshot existe pero todas las secciones están vacías
	// (típico de correlation IDs inexistentes).
	readonly isSnapshotEmpty = computed(() => {
		const s = this.vm().snapshot;
		if (!s) return true;
		return (
			(s.errorLogs?.length ?? 0) +
				(s.rateLimitEvents?.length ?? 0) +
				(s.reportesUsuario?.length ?? 0) +
				(s.emailOutbox?.length ?? 0) ===
			0
		);
	});
	// #endregion

	// #region Lifecycle
	ngOnInit(): void {
		this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
			const id = params.get('id');
			if (id) {
				this.facade.loadSnapshot(id);
			} else {
				logger.warn('[CorrelationComponent] Sin :id en la ruta');
			}
		});

		if (this.autoRefresh()) {
			this.startPolling();
		}
		this.attachVisibilityListener();
		this.destroyRef.onDestroy(() => {
			this.stopPolling();
			this.detachVisibilityListener();
		});
	}
	// #endregion

	// #region Event handlers
	onCopyId(id: string | null): void {
		if (!id || typeof navigator === 'undefined' || !navigator.clipboard) return;
		void navigator.clipboard.writeText(id);
	}

	onRetry(): void {
		const id = this.vm().correlationId;
		if (id) {
			this.facade.loadSnapshot(id);
		}
	}

	onBack(): void {
		// Default: volver al referrer si existe, sino al home admin
		if (history.length > 1) {
			history.back();
		} else {
			void this.router.navigate(['/intranet']);
		}
	}

	onToggleView(mode: CorrelationViewMode): void {
		if (this.viewMode() === mode) return;
		this.viewMode.set(mode);
		this.storage.setCorrelationViewMode(mode);
	}

	onExport(): void {
		const snapshot = this.vm().snapshot;
		const id = this.vm().correlationId;
		if (!snapshot || !id) return;
		this.exporter.exportSnapshot(snapshot, id);
	}

	onToggleAutoRefresh(): void {
		const next = !this.autoRefresh();
		this.autoRefresh.set(next);
		this.storage.setCorrelationAutoRefresh(next);
		if (next) {
			this.startPolling();
		} else {
			this.stopPolling();
		}
	}
	// #endregion

	// #region Polling — Plan 41 Chat 11
	private startPolling(): void {
		if (this.pollHandle !== null) return;
		this.pollHandle = setInterval(() => this.refreshIfVisible(), this.POLL_INTERVAL_MS);
	}

	private stopPolling(): void {
		if (this.pollHandle !== null) {
			clearInterval(this.pollHandle);
			this.pollHandle = null;
		}
	}

	private refreshIfVisible(): void {
		if (typeof document !== 'undefined' && document.hidden) return;
		const id = this.vm().correlationId;
		if (id) {
			this.facade.loadSnapshot(id);
		}
	}

	private attachVisibilityListener(): void {
		if (typeof document === 'undefined') return;
		this.visibilityListener = () => {
			// Al volver a visible con auto-refresh ON, disparar un refresh inmediato
			// para que el admin no espere hasta los próximos 30s.
			if (!document.hidden && this.autoRefresh()) {
				const id = this.vm().correlationId;
				if (id) {
					this.facade.loadSnapshot(id);
				}
			}
		};
		document.addEventListener('visibilitychange', this.visibilityListener);
	}

	private detachVisibilityListener(): void {
		if (this.visibilityListener && typeof document !== 'undefined') {
			document.removeEventListener('visibilitychange', this.visibilityListener);
			this.visibilityListener = null;
		}
	}
	// #endregion
}
