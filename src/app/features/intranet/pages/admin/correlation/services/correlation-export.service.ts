import { Injectable } from '@angular/core';

import { CorrelationSnapshot } from '../models';

export interface CorrelationExportPayload {
	correlationId: string;
	generatedAt: string;
	hubUrl: string;
	snapshot: CorrelationSnapshot;
}

/**
 * Plan 41 F5 Chat 10 — exporta el snapshot del hub correlation como JSON
 * descargable. El payload empaqueta correlationId + generatedAt (ISO del
 * momento del export, no el del snapshot) + URL del hub + snapshot completo.
 *
 * Filename: `correlation-{id}-{YYYYMMDD}.json`. Pensado para compartir
 * estado fotografiado del hub sin depender de auth/permisos del receptor.
 */
@Injectable({ providedIn: 'root' })
export class CorrelationExportService {
	exportSnapshot(snapshot: CorrelationSnapshot, correlationId: string, now: Date = new Date()): void {
		const payload = this.buildPayload(snapshot, correlationId, now);
		const filename = this.buildFilename(correlationId, now);
		this.triggerDownload(payload, filename);
	}

	buildPayload(
		snapshot: CorrelationSnapshot,
		correlationId: string,
		now: Date = new Date(),
	): CorrelationExportPayload {
		return {
			correlationId,
			generatedAt: now.toISOString(),
			hubUrl: this.resolveHubUrl(correlationId),
			snapshot,
		};
	}

	buildFilename(correlationId: string, now: Date = new Date()): string {
		const yyyy = now.getFullYear();
		const mm = String(now.getMonth() + 1).padStart(2, '0');
		const dd = String(now.getDate()).padStart(2, '0');
		return `correlation-${correlationId}-${yyyy}${mm}${dd}.json`;
	}

	private resolveHubUrl(correlationId: string): string {
		if (typeof window === 'undefined' || !window.location) return '';
		const { origin } = window.location;
		return `${origin}/intranet/admin/correlation/${correlationId}`;
	}

	private triggerDownload(payload: CorrelationExportPayload, filename: string): void {
		if (typeof document === 'undefined' || typeof URL === 'undefined') return;
		const json = JSON.stringify(payload, null, 2);
		const blob = new Blob([json], { type: 'application/json' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = filename;
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		URL.revokeObjectURL(url);
	}
}
