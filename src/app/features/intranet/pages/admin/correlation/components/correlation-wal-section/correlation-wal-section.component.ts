import { ChangeDetectionStrategy, Component, effect, inject, input, signal } from '@angular/core';
import { DatePipe } from '@angular/common';

import { logger } from '@core/helpers';
import { WalCorrelationReader, type WalEntry, type WalEntryStatus } from '@core/services/wal';
import { EduTag } from '@edu-ui';

type WalSectionState = 'no-session' | 'loading' | 'ready' | 'error';

/** Aviso fijo decidido en ADR-0009 §4. No re-litigar el texto. */
export const WAL_SECTION_NOTICE =
	'Solo muestra el navegador donde estás conectado; no incluye la sesión del usuario afectado.';

const STATUS_SEVERITY: Record<WalEntryStatus, 'info' | 'warn' | 'success' | 'danger' | 'secondary'> = {
	PENDING: 'info',
	IN_FLIGHT: 'info',
	COMMITTED: 'success',
	FAILED: 'danger',
	CONFLICT: 'warn',
	REQUIRES_MIGRATION: 'warn',
};

/**
 * Plan 41 F6 — sección «WAL»: escrituras en cola del navegador del admin cuyo
 * `correlationId` coincide con el `sessionId` del snapshot (ADR-0009 §4). Solo
 * lectura: no reintenta, no limpia ni muta entradas, y nunca muestra `payload`
 * ni `error`. Sin `sessionId` no consulta el WAL y lo dice.
 */
@Component({
	selector: 'app-correlation-wal-section',
	standalone: true,
	imports: [DatePipe, EduTag],
	templateUrl: './correlation-wal-section.component.html',
	styleUrl: './correlation-wal-section.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CorrelationWalSectionComponent {
	private readonly walReader = inject(WalCorrelationReader);

	/** `sessionId` del snapshot (no el de la pestaña del hub: el IndexedDB es compartido). */
	readonly sessionId = input<string | null | undefined>(null);

	readonly notice = WAL_SECTION_NOTICE;
	readonly state = signal<WalSectionState>('no-session');
	readonly entries = signal<readonly WalEntry[]>([]);

	private loadSeq = 0;

	constructor() {
		effect(() => {
			const id = this.sessionId();
			if (!id) {
				this.loadSeq++;
				this.entries.set([]);
				this.state.set('no-session');
				return;
			}
			void this.load(id);
		});
	}

	getStatusSeverity(status: WalEntryStatus): 'info' | 'warn' | 'success' | 'danger' | 'secondary' {
		return STATUS_SEVERITY[status] ?? 'secondary';
	}

	private async load(id: string): Promise<void> {
		const seq = ++this.loadSeq;
		this.state.set('loading');
		try {
			const found = await this.walReader.getByCorrelationId(id);
			if (seq !== this.loadSeq) return;
			this.entries.set([...found].sort((a, b) => a.timestamp - b.timestamp));
			this.state.set('ready');
		} catch (e) {
			if (seq !== this.loadSeq) return;
			logger.error('[CorrelationWalSection] No se pudo leer el WAL', e);
			this.entries.set([]);
			this.state.set('error');
		}
	}
}
