// #region Imports
import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { logger } from '@core/helpers';
import { FeedbackReportService } from '@core/services/feedback';
import { ErrorGroupsService } from '@features/intranet/pages/admin/error-groups/services';
import { EmailMonitoreoApiService } from '@features/intranet/pages/admin/email-outbox-dashboard-dia/services/email-monitoreo.api.service';
import { DeferFailStatus } from '@features/intranet/pages/admin/email-outbox/models/defer-fail-status.models';
import { EmailOutboxApiService } from '@features/intranet/pages/admin/email-outbox/services/email-outbox.service';
import { RateLimitEventsService } from '@features/intranet/pages/admin/rate-limit-events/services';

import {
	HubBadges,
	HubDeltas,
	HubExtras,
	LinkBadge,
	UNKNOWN_BADGE,
	initialHubBadges,
	initialHubExtras,
} from '../models/monitoreo-hub-badges.models';
// #endregion

const LOG_TAG = 'MonitoreoHubBadgesFacade';

/** TTL del cache en memoria — el hub se visita esporádico, 60s alcanza. */
const CACHE_TTL_MS = 60_000;

/**
 * Carga en paralelo las 6 métricas resumen de cada sub-link del hub Monitoreo.
 * Cada fetch es fail-safe (INV-S07): si uno falla, el resto sigue.
 *
 * Reusa los services API existentes — no agrega endpoints nuevos.
 */
@Injectable({ providedIn: 'root' })
export class MonitoreoHubBadgesFacade {
	// #region Dependencias
	private readonly outboxApi = inject(EmailOutboxApiService);
	private readonly monitoreoApi = inject(EmailMonitoreoApiService);
	private readonly errorGroups = inject(ErrorGroupsService);
	private readonly feedback = inject(FeedbackReportService);
	private readonly rateLimit = inject(RateLimitEventsService);
	// #endregion

	// #region Estado
	private readonly _badges = signal<HubBadges>(initialHubBadges());
	private readonly _extras = signal<HubExtras>(initialHubExtras());
	readonly badges = this._badges.asReadonly();
	readonly extras = this._extras.asReadonly();
	readonly loading = computed(() => this._badges().loading);

	private lastLoadAt = 0;
	private inflight: Promise<void> | null = null;
	// #endregion

	// #region Comandos
	/** Carga las 6 métricas en paralelo. Cache 60s para evitar refetch en navegación. */
	async loadAll(force = false): Promise<void> {
		if (!force && Date.now() - this.lastLoadAt < CACHE_TTL_MS) return;
		if (this.inflight) return this.inflight;

		this._badges.update((b) => ({ ...b, loading: true }));
		this.inflight = this.runLoad().finally(() => {
			this.lastLoadAt = Date.now();
			this.inflight = null;
		});
		return this.inflight;
	}

	refresh(): Promise<void> {
		return this.loadAll(true);
	}
	// #endregion

	// #region Carga concreta
	private async runLoad(): Promise<void> {
		const today = this.todayStr();
		const yesterday = this.yesterdayStr();

		const [
			bandejaRes, dashboardRes, diagnosticoRes, erroresRes, reportesRes, rateLimitRes,
			bandejaTodayRes, bandejaYesterdayRes, erroresTodayRes, erroresYesterdayRes,
		] = await Promise.allSettled([
			firstValueFrom(this.outboxApi.estadisticas()),
			firstValueFrom(this.outboxApi.deferFailStatus()),
			firstValueFrom(this.monitoreoApi.getCandidatosBlacklist()),
			firstValueFrom(this.errorGroups.getCount('NUEVO', null, null, null)),
			firstValueFrom(this.feedback.obtenerEstadisticas()),
			firstValueFrom(this.rateLimit.getStats(1)),
			firstValueFrom(this.outboxApi.estadisticas(today, today)),
			firstValueFrom(this.outboxApi.estadisticas(yesterday, yesterday)),
			firstValueFrom(this.errorGroups.getCount('NUEVO', null, null, null, today, today)),
			firstValueFrom(this.errorGroups.getCount('NUEVO', null, null, null, yesterday, yesterday)),
		]);

		const next: HubBadges = {
			bandeja: this.toBandejaBadge(bandejaRes),
			dashboard: this.toDashboardBadge(dashboardRes),
			diagnostico: this.toDiagnosticoBadge(diagnosticoRes),
			blacklist: this.toBlacklistBadge(dashboardRes),
			errores: this.toErroresBadge(erroresRes),
			reportes: this.toReportesBadge(reportesRes),
			rateLimit: this.toRateLimitBadge(rateLimitRes),
			loading: false,
		};
		this._badges.set(next);
		this._extras.set(this.collectExtras(
			bandejaRes, dashboardRes, diagnosticoRes, erroresRes, reportesRes, rateLimitRes,
			bandejaTodayRes, bandejaYesterdayRes, erroresTodayRes, erroresYesterdayRes,
		));
	}

	private collectExtras(
		bandeja: PromiseSettledResult<{
			total: number;
			enviados: number;
			pendientes: number;
			fallidos: number;
			source?: string;
			timeWindowLabel?: string;
		}>,
		dashboard: PromiseSettledResult<DeferFailStatus | null>,
		diagnostico: PromiseSettledResult<unknown[]>,
		errores: PromiseSettledResult<number>,
		reportes: PromiseSettledResult<{ nuevos: number; enProgreso: number }>,
		rateLimit: PromiseSettledResult<{ totalRechazados: number }>,
		bandejaTodayRes: PromiseSettledResult<{ pendientes: number; fallidos: number }>,
		bandejaYesterdayRes: PromiseSettledResult<{ pendientes: number; fallidos: number }>,
		erroresTodayRes: PromiseSettledResult<number>,
		erroresYesterdayRes: PromiseSettledResult<number>,
	): HubExtras {
		return {
			outbox: bandeja.status === 'fulfilled'
				? {
					total: bandeja.value.total,
					enviados: bandeja.value.enviados,
					pendientes: bandeja.value.pendientes,
					fallidos: bandeja.value.fallidos,
					source: bandeja.value.source,
					timeWindowLabel: bandeja.value.timeWindowLabel,
				}
				: null,
			deferFail: dashboard.status === 'fulfilled' && dashboard.value
				? {
					current: dashboard.value.currentHour.deferFailCount,
					threshold: dashboard.value.currentHour.threshold,
					percentUsed: dashboard.value.currentHour.percentUsed,
					blacklistActivos: dashboard.value.blacklist.totalActivos,
					last24hTotal: dashboard.value.last24h.total,
					last24hSent: dashboard.value.last24h.sent,
					last24hFailedOther: dashboard.value.last24h.failedOther,
					source: dashboard.value.last24h.source,
					timeWindowLabel: dashboard.value.last24h.timeWindowLabel,
				}
				: null,
			candidatosBlacklist: diagnostico.status === 'fulfilled' ? diagnostico.value.length : null,
			errorsNuevos: errores.status === 'fulfilled' ? errores.value : null,
			reportesNuevos: reportes.status === 'fulfilled' ? (reportes.value.nuevos ?? 0) : null,
			reportesEnProgreso: reportes.status === 'fulfilled' ? (reportes.value.enProgreso ?? 0) : null,
			rateLimitRechazados: rateLimit.status === 'fulfilled' ? (rateLimit.value.totalRechazados ?? 0) : null,
			deltas: this.computeDeltas(bandejaTodayRes, bandejaYesterdayRes, erroresTodayRes, erroresYesterdayRes),
		};
	}

	private computeDeltas(
		bandejaToday: PromiseSettledResult<{ pendientes: number; fallidos: number }>,
		bandejaYesterday: PromiseSettledResult<{ pendientes: number; fallidos: number }>,
		erroresToday: PromiseSettledResult<number>,
		erroresYesterday: PromiseSettledResult<number>,
	): HubDeltas {
		const tBandeja = bandejaToday.status === 'fulfilled'
			? (bandejaToday.value.pendientes ?? 0) + (bandejaToday.value.fallidos ?? 0) : null;
		const yBandeja = bandejaYesterday.status === 'fulfilled'
			? (bandejaYesterday.value.pendientes ?? 0) + (bandejaYesterday.value.fallidos ?? 0) : null;

		const tErrores = erroresToday.status === 'fulfilled' ? erroresToday.value : null;
		const yErrores = erroresYesterday.status === 'fulfilled' ? erroresYesterday.value : null;

		return {
			bandeja: tBandeja !== null && yBandeja !== null ? tBandeja - yBandeja : null,
			errores: tErrores !== null && yErrores !== null ? tErrores - yErrores : null,
		};
	}

	private todayStr(): string {
		return new Date().toISOString().slice(0, 10);
	}

	private yesterdayStr(): string {
		const d = new Date();
		d.setDate(d.getDate() - 1);
		return d.toISOString().slice(0, 10);
	}
	// #endregion

	// #region Mappers + criterio de niveles
	private toBandejaBadge(
		res: PromiseSettledResult<{ pendientes: number; fallidos: number }>,
	): LinkBadge {
		if (res.status !== 'fulfilled') return this.fail('bandeja', res.reason);
		const total = (res.value.pendientes ?? 0) + (res.value.fallidos ?? 0);
		// Pendientes y fallidos del día. >20 = revisar; 5-20 = mirar; <5 = OK.
		const level = total > 20 ? 'critical' : total >= 5 ? 'warn' : 'ok';
		return { count: total, level, label: `${total} pendientes/fallidos hoy` };
	}

	private toDashboardBadge(
		res: PromiseSettledResult<DeferFailStatus | null>,
	): LinkBadge {
		if (res.status !== 'fulfilled' || !res.value) return this.fail('dashboard', res);
		const status = res.value.status;
		const level = status === 'CRITICAL' ? 'critical' : status === 'WARNING' ? 'warn' : 'ok';
		return { count: null, level, label: `Defer/Fail: ${status}` };
	}

	private toBlacklistBadge(
		res: PromiseSettledResult<DeferFailStatus | null>,
	): LinkBadge {
		if (res.status !== 'fulfilled' || !res.value) return UNKNOWN_BADGE;
		const total = res.value.blacklist.totalActivos;
		const level = total >= 50 ? 'critical' : total >= 10 ? 'warn' : 'ok';
		return { count: total, level, label: `${total} en blacklist activa` };
	}

	private toDiagnosticoBadge(res: PromiseSettledResult<unknown[]>): LinkBadge {
		if (res.status !== 'fulfilled') return this.fail('diagnostico', res.reason);
		const total = res.value.length;
		const level = total >= 3 ? 'critical' : total >= 1 ? 'warn' : 'ok';
		return { count: total, level, label: `${total} candidatos a blacklist` };
	}

	private toErroresBadge(res: PromiseSettledResult<number>): LinkBadge {
		if (res.status !== 'fulfilled') return this.fail('errores', res.reason);
		const total = res.value;
		const level = total >= 3 ? 'critical' : total >= 1 ? 'warn' : 'ok';
		return { count: total, level, label: `${total} grupos en estado NUEVO` };
	}

	private toReportesBadge(res: PromiseSettledResult<{ nuevos: number }>): LinkBadge {
		if (res.status !== 'fulfilled') return this.fail('reportes', res.reason);
		const total = res.value.nuevos ?? 0;
		const level = total >= 4 ? 'critical' : total >= 1 ? 'warn' : 'ok';
		return { count: total, level, label: `${total} reportes nuevos` };
	}

	private toRateLimitBadge(res: PromiseSettledResult<{ totalRechazados: number }>): LinkBadge {
		if (res.status !== 'fulfilled') return this.fail('rateLimit', res.reason);
		const total = res.value.totalRechazados ?? 0;
		const level = total > 10 ? 'critical' : total >= 1 ? 'warn' : 'ok';
		return { count: total, level, label: `${total} rechazos última hora` };
	}

	private fail(key: string, reason: unknown): LinkBadge {
		logger.tagged(LOG_TAG, 'warn', `metric_failed:${key}`, reason);
		return UNKNOWN_BADGE;
	}
	// #endregion
}
