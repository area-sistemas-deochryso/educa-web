// #region Imports
import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';

import { logger } from '@core/helpers';
import { StorageService, type CorrelationViewMode } from '@core/services';

import { PageHeaderComponent } from '@intranet-shared/components';

import { CorrelationFacade } from './services';
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
	// #endregion

	// #region Estado
	readonly vm = this.facade.vm;
	readonly viewMode = signal<CorrelationViewMode>(this.storage.getCorrelationViewMode());
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
	// #endregion
}
