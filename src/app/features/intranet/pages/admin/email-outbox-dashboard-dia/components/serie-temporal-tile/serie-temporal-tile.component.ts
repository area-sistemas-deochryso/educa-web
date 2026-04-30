import {
	ChangeDetectionStrategy,
	Component,
	computed,
	input,
	output,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SelectButtonModule } from 'primeng/selectbutton';

import { SkeletonLoaderComponent } from '@shared/components';

import {
	DashboardSerieTemporalPunto,
	SerieTemporalGranularidad,
} from '../../models/email-monitoreo.models';

interface Bucket {
	bucket: string;
	enviados: number;
	fallidos: number;
	bloqueadosPorCuota: number;
	enviadosPct: number;
	fallidosPct: number;
	bloqueadosPct: number;
}

/**
 * Tile E — Serie temporal. Toggle hora (24h) / día (30d). Renderiza barras
 * apiladas con CSS (sin librerías de chart) — proporción enviados vs
 * fallidos vs bloqueadosPorCuota relativa al máximo de la serie.
 */
@Component({
	selector: 'app-serie-temporal-tile',
	standalone: true,
	imports: [DatePipe, FormsModule, SelectButtonModule, SkeletonLoaderComponent],
	templateUrl: './serie-temporal-tile.component.html',
	styleUrl: './serie-temporal-tile.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SerieTemporalTileComponent {
	readonly items = input<DashboardSerieTemporalPunto[]>([]);
	readonly loading = input<boolean>(false);
	readonly granularidad = input<SerieTemporalGranularidad>('hour');

	readonly granularidadChange = output<SerieTemporalGranularidad>();

	readonly granularidadOptions = [
		{ label: '24h', value: 'hour' },
		{ label: '30d', value: 'day' },
	];

	readonly hasData = computed(() => this.items().length > 0);

	readonly maxTotal = computed(() => {
		const totals = this.items().map(
			(p) => p.enviados + p.fallidos + p.bloqueadosPorCuota,
		);
		return totals.length === 0 ? 0 : Math.max(...totals);
	});

	readonly buckets = computed<Bucket[]>(() => {
		const max = this.maxTotal();
		const safeMax = max === 0 ? 1 : max;
		return this.items().map((p) => ({
			bucket: p.bucket,
			enviados: p.enviados,
			fallidos: p.fallidos,
			bloqueadosPorCuota: p.bloqueadosPorCuota,
			enviadosPct: (p.enviados / safeMax) * 100,
			fallidosPct: (p.fallidos / safeMax) * 100,
			bloqueadosPct: (p.bloqueadosPorCuota / safeMax) * 100,
		}));
	});

	readonly bucketDateFormat = computed(() =>
		this.granularidad() === 'hour' ? 'HH:mm' : 'dd/MM',
	);

	onGranularidadChange(value: SerieTemporalGranularidad): void {
		this.granularidadChange.emit(value);
	}
}
