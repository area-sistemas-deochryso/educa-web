// #region Imports
import {
	BadgeLevel,
	DomainId,
	HubExtras,
} from './models/monitoreo-hub-badges.models';
// #endregion

// #region Tipos del summary visual de cada dominio
export interface DomainHeadline {
	icon: string;
	value: string | number;
	label: string;
	level: BadgeLevel;
	sublabel?: string;
}

export interface DomainStat {
	icon: string;
	label: string;
	value: string | number;
	level: BadgeLevel;
	/** Plan 43 Chat 1.1 — chip "tag-neutral" con origen del contador. */
	sourceChip?: string;
	/** Plan 43 Chat 1.1 — tooltip con ventana temporal legible. */
	windowTooltip?: string;
}
// #endregion

// #region Builders puros — sin estado, fáciles de testear
export function buildHeadline(id: DomainId, x: HubExtras): DomainHeadline | null {
	switch (id) {
		case 'correos': {
			if (!x.deferFail) return null;
			const pct = Math.round(x.deferFail.percentUsed);
			return {
				icon: 'pi pi-gauge',
				value: `${pct}%`,
				label: 'del techo cPanel usado',
				level: pct >= 100 ? 'critical' : pct >= 60 ? 'warn' : 'ok',
				sublabel: `${x.deferFail.current}/${x.deferFail.threshold} defers+fails esta hora`,
			};
		}
		case 'incidencias': {
			if (x.errorsNuevos === null && x.reportesNuevos === null) return null;
			const total = (x.errorsNuevos ?? 0) + (x.reportesNuevos ?? 0);
			return {
				icon: 'pi pi-exclamation-triangle',
				value: total,
				label:
					total === 1
						? 'incidencia requiere atención'
						: 'incidencias requieren atención',
				level: total >= 5 ? 'critical' : total >= 1 ? 'warn' : 'ok',
			};
		}
		case 'seguridad': {
			if (x.rateLimitRechazados === null) return null;
			const total = x.rateLimitRechazados;
			return {
				icon: 'pi pi-bolt',
				value: total,
				label: total === 1 ? 'rechazo en última hora' : 'rechazos en última hora',
				level: total > 10 ? 'critical' : total >= 1 ? 'warn' : 'ok',
			};
		}
	}
}

export function buildStats(id: DomainId, x: HubExtras): DomainStat[] {
	switch (id) {
		case 'correos': {
			if (!x.outbox) return [];
			const fallidos = x.outbox.fallidos;
			const pendientes = x.outbox.pendientes;
			// Plan 43 Chat 1.1 — etiqueta de origen visible en cada contador para
			// que el usuario distinga "Outbox total" (estadisticas) de "Últimas 24 h"
			// (defer-fail) y "Hoy (Lima)" (dashboard).
			const outboxChip = x.outbox.source ?? 'Outbox';
			const outboxTip = x.outbox.timeWindowLabel ?? 'Histórico completo';
			return [
				{
					icon: 'pi pi-check-circle',
					label: 'Enviados',
					value: x.outbox.enviados,
					level: 'ok',
					sourceChip: outboxChip,
					windowTooltip: outboxTip,
				},
				{
					icon: 'pi pi-hourglass',
					label: 'Pendientes',
					value: pendientes,
					level: pendientes > 0 ? 'warn' : 'ok',
					sourceChip: outboxChip,
					windowTooltip: outboxTip,
				},
				{
					icon: 'pi pi-times-circle',
					label: 'Fallidos',
					value: fallidos,
					level: fallidos > 0 ? 'critical' : 'ok',
					sourceChip: outboxChip,
					windowTooltip: outboxTip,
				},
				{
					icon: 'pi pi-ban',
					label: 'En blacklist',
					value: x.deferFail?.blacklistActivos ?? '—',
					level: (x.deferFail?.blacklistActivos ?? 0) >= 10 ? 'warn' : 'ok',
					sourceChip: 'Blacklist',
					windowTooltip: 'Activos actualmente',
				},
			];
		}
		case 'incidencias': {
			return [
				{
					icon: 'pi pi-exclamation-circle',
					label: 'Errores nuevos',
					value: x.errorsNuevos ?? '—',
					level:
						(x.errorsNuevos ?? 0) >= 3
							? 'critical'
							: (x.errorsNuevos ?? 0) >= 1
								? 'warn'
								: 'ok',
				},
				{
					icon: 'pi pi-comment',
					label: 'Reportes nuevos',
					value: x.reportesNuevos ?? '—',
					level:
						(x.reportesNuevos ?? 0) >= 4
							? 'critical'
							: (x.reportesNuevos ?? 0) >= 1
								? 'warn'
								: 'ok',
				},
				{
					icon: 'pi pi-spinner',
					label: 'En progreso',
					value: x.reportesEnProgreso ?? '—',
					level: 'ok',
				},
			];
		}
		case 'seguridad': {
			if (x.rateLimitRechazados === null) return [];
			return [
				{
					icon: 'pi pi-times-circle',
					label: 'Rechazos 1h',
					value: x.rateLimitRechazados,
					level:
						x.rateLimitRechazados > 10
							? 'critical'
							: x.rateLimitRechazados >= 1
								? 'warn'
								: 'ok',
				},
			];
		}
	}
}
// #endregion
