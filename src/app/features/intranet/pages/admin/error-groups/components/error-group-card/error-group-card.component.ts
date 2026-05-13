import {
	ChangeDetectionStrategy,
	Component,
	HostListener,
	computed,
	input,
	output,
} from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';

import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';

import { MiniSparklineComponent } from '@shared/components/mini-sparkline';

import {
	ErrorGroupLista,
	ErrorOrigen,
	ErrorSeveridad,
	ORIGEN_ICON_MAP,
	SEVERIDAD_SEVERITY_MAP,
} from '../../models';
import type { TrendCacheEntry } from '../../services/error-groups.store';

/**
 * Card presentacional para la vista Kanban del feature `error-groups`.
 * Compacta (~80px), OnPush, sin estado interno. Renderiza severidad,
 * mensaje truncado, contador y fecha relativa.
 */
@Component({
	selector: 'app-error-group-card',
	standalone: true,
	changeDetection: ChangeDetectionStrategy.OnPush,
	imports: [CommonModule, DatePipe, TagModule, TooltipModule, MiniSparklineComponent],
	templateUrl: './error-group-card.component.html',
	styleUrl: './error-group-card.component.scss',
	host: {
		role: 'button',
		'[attr.tabindex]': '0',
		'[attr.aria-label]': 'ariaLabel()',
	},
})
export class ErrorGroupCardComponent {
	readonly group = input.required<ErrorGroupLista>();
	/**
	 * Entry de cache del trend 30d (Plan 43 Chat 1.2). `undefined` significa
	 * "todavía no se solicitó"; el contenedor padre dispara `requestTrend` al
	 * renderizar la card. Si el endpoint BE no existe aún, el status caerá a
	 * `error` y la sparkline mostrará "sin actividad".
	 */
	readonly trend = input<TrendCacheEntry | undefined>(undefined);

	readonly cardClick = output<ErrorGroupLista>();
	readonly sparklineClick = output<ErrorGroupLista>();

	readonly severidadSeverity = computed<'danger' | 'warn' | 'info'>(
		() => SEVERIDAD_SEVERITY_MAP[this.group().severidad as ErrorSeveridad] ?? 'info',
	);

	readonly origenIcon = computed(
		() => ORIGEN_ICON_MAP[this.group().origen as ErrorOrigen] ?? 'pi pi-question',
	);

	readonly hasPostResolucion = computed(() => this.group().contadorPostResolucion > 0);

	readonly trendData = computed<readonly number[]>(() => this.trend()?.data ?? []);
	readonly trendLoading = computed(() => this.trend()?.status === 'loading');

	readonly ariaLabel = computed(() => {
		const g = this.group();
		return `${g.severidad} — ${g.mensajeRepresentativo}`;
	});

	@HostListener('click')
	onClick(): void {
		this.cardClick.emit(this.group());
	}

	@HostListener('keydown.enter', ['$event'])
	@HostListener('keydown.space', ['$event'])
	onKeyboardActivate(event: Event): void {
		event.preventDefault();
		this.cardClick.emit(this.group());
	}

	onSparklineClick(event: MouseEvent): void {
		event.stopPropagation();
		this.sparklineClick.emit(this.group());
	}
}
