import { Component, ChangeDetectionStrategy, input, computed } from '@angular/core';
import { UpperCasePipe } from '@angular/common';

import { TooltipModule } from 'primeng/tooltip';
import { Tabs } from 'primeng/tabs';
import { TabList } from 'primeng/tabs';
import { Tab } from 'primeng/tabs';
import { TabPanels } from 'primeng/tabs';
import { TabPanel } from 'primeng/tabs';

import { K6Endpoint, K6Stage } from '../../models';

// #region Interfaces
interface TestPhase {
	durationSec: number;
	durationLabel: string;
	targetVus: number;
}

export interface TestProfile {
	mode: 'stages' | 'fixed';
	phases: TestPhase[];
	totalDuration: string;
	totalDurationSec: number;
	peakVus: number;
	endpointsCount: number;
	estimatedRequests: number;
}
// #endregion

@Component({
	selector: 'app-load-profile',
	standalone: true,
	imports: [UpperCasePipe, TooltipModule, Tabs, TabList, Tab, TabPanels, TabPanel],
	templateUrl: './load-profile.component.html',
	styleUrl: './load-profile.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoadProfileComponent {
	// #region Inputs
	readonly profile = input.required<TestProfile>();
	readonly testType = input<string>('load');
	readonly thresholdP95 = input(2000);
	readonly thresholdErrorRate = input(1);
	readonly endpoints = input<K6Endpoint[]>([]);
	readonly hasCredentials = input(false);
	readonly stages = input<K6Stage[]>([]);
	// #endregion

	// #region Computed — Valores derivados
	readonly halfPeakVus = computed(() => Math.floor(this.profile().peakVus / 2));

	readonly methodClass = computed(() => {
		const map: Record<string, string> = {
			GET: 'method-get',
			POST: 'method-post',
			PUT: 'method-put',
			DELETE: 'method-delete',
		};
		return map;
	});

	/** Total de pasos en el flujo (auth? + endpoints + sleep) para calcular el ciclo de animación */
	readonly totalFlowSteps = computed(() => {
		const authStep = this.hasCredentials() ? 1 : 0;
		return authStep + this.endpoints().length + 1; // +1 por sleep
	});

	/** Dots representativos del pool de VUs (máx 15, escala visual) */
	readonly vuDots = computed(() => {
		const peak = this.profile().peakVus;
		const count = Math.min(Math.max(Math.ceil(peak / 10), 3), 15);
		return Array.from({ length: count }, (_, i) => i);
	});

	/**
	 * Duración del ciclo de animación basada en peak VUs.
	 * Más VUs = ciclo más rápido (más actividad visual).
	 * 1 VU → 4s, 100 VUs → 2.5s, 500+ VUs → 1.5s
	 */
	readonly cycleDuration = computed(() => {
		const peak = this.profile().peakVus || 1;
		return Math.max(1.5, 4 - peak / 167);
	});

	/** Segmentos de la barra de fases con ratio de intensidad */
	readonly phaseSegments = computed(() => {
		const p = this.profile();
		const totalSec = p.totalDurationSec || 1;
		const peakVus = p.peakVus || 1;
		let prevVus = 0;

		return p.phases.map((phase) => {
			const segment = {
				widthPercent: Math.max((phase.durationSec / totalSec) * 100, 5),
				intensity: phase.targetVus / peakVus,
				label: `${prevVus}→${phase.targetVus}`,
				duration: phase.durationLabel,
				targetVus: phase.targetVus,
			};
			prevVus = phase.targetVus;
			return segment;
		});
	});

	/** Si debe mostrar tabs por fase (múltiples fases con stages activos) */
	readonly usePhaseTabs = computed(() =>
		this.profile().mode === 'stages' && this.stages().length > 1 && this.endpoints().length > 0,
	);

	/** Endpoints resueltos por fase (respetando endpointIndices) */
	readonly phaseEndpoints = computed(() =>
		this.stages().map((stage) => {
			const allEps = this.endpoints();
			if (stage.endpointIndices.length === 0) return allEps;
			return stage.endpointIndices
				.filter((i) => i < allEps.length)
				.map((i) => allEps[i]);
		}),
	);

	/** Cycle duration por fase (basado en target VUs de cada fase) */
	readonly phaseCycleDurations = computed(() =>
		this.stages().map((stage) => {
			const peak = stage.target || 1;
			return Math.max(1.5, 4 - peak / 167);
		}),
	);

	/** VU dots por fase */
	readonly phaseVuDots = computed(() =>
		this.stages().map((stage) => {
			const count = Math.min(Math.max(Math.ceil(stage.target / 10), 2), 12);
			return Array.from({ length: count }, (_, i) => i);
		}),
	);

	/** Muestra body hint para POST/PUT (primeros 30 chars) */
	bodyHint(ep: K6Endpoint): string {
		if (ep.method !== 'POST' && ep.method !== 'PUT') return '';
		if (!ep.body?.trim()) return '{ ... }';
		const trimmed = ep.body.trim();
		return trimmed.length > 35 ? trimmed.substring(0, 35) + '...' : trimmed;
	}

	/** Si un endpoint envía body (POST/PUT) */
	hasBody(ep: K6Endpoint): boolean {
		return ep.method === 'POST' || ep.method === 'PUT';
	}
	// #endregion

	// #region Computed — Barras del gráfico
	readonly chartBars = computed(() => {
		const p = this.profile();
		const peakVus = p.peakVus || 1;
		const totalSec = p.totalDurationSec || 1;

		if (p.mode === 'fixed') {
			return [
				{
					heightPercent: 100,
					widthPercent: 100,
					vus: p.peakVus,
					label: p.totalDuration,
				},
			];
		}

		return p.phases.map((phase) => ({
			heightPercent: Math.max((phase.targetVus / peakVus) * 100, 4),
			widthPercent: Math.max((phase.durationSec / totalSec) * 100, 5),
			vus: phase.targetVus,
			label: phase.durationLabel,
		}));
	});

	readonly formattedRequests = computed(() => {
		const n = this.profile().estimatedRequests;
		if (n >= 1_000_000) return `~${(n / 1_000_000).toFixed(1)}M`;
		if (n >= 1_000) return `~${(n / 1_000).toFixed(1)}K`;
		return `~${n}`;
	});
	// #endregion
}
