// #region Imports
import {
	ChangeDetectionStrategy,
	Component,
	OnInit,
	computed,
	inject,
} from '@angular/core';

import { environment } from '@config/environment';
import { EmailMonitoreoFacade } from '../../services/email-monitoreo.facade';
// #endregion

// #region Constants
const RECENT_BLACKLIST_TTL_MS = 5 * 60 * 1000;
// #endregion

// #region Types
type Severity = 'info' | 'warn' | 'danger';
// #endregion

// #region Implementation
/**
 * Plan 39 Chat D · Banner B9 reusable cross-páginas para `/intranet/admin/monitoreo/correos/*`.
 *
 * Smart standalone — consume `EmailMonitoreoFacade.vm()` (defer-fail status +
 * timestamp del último `BlacklistEntryCreated`). Asegura que el hub esté
 * conectado vía `startHub()` (idempotente) sin requerir wiring manual en cada
 * página. Patrón B9 de `design-system.md`.
 *
 * Triggers:
 *  - `vm().deferFailStatus.status` ∈ {WARNING, CRITICAL} → banner visible.
 *  - `vm().lastBlacklistEventAt` < 5 min → banner visible (warn como mínimo).
 *
 * INV-S07: si el hub no conecta, `startHub()` cae a polling 30s. El banner
 * sigue funcionando con datos del polling sin interacción del usuario.
 *
 * Feature flag `emailDeferAlerts` controla el render. Off prod / on dev.
 */
@Component({
	selector: 'app-email-defer-fail-banner',
	standalone: true,
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: './email-defer-fail-banner.component.html',
	styleUrl: './email-defer-fail-banner.component.scss',
})
export class EmailDeferFailBannerComponent implements OnInit {
	// #region Dependencias
	private facade = inject(EmailMonitoreoFacade);
	// #endregion

	// #region Estado
	private readonly enabled = environment.features.emailDeferAlerts;

	private readonly status = computed(() => this.facade.vm().deferFailStatus?.status ?? 'OK');
	private readonly currentHour = computed(() => this.facade.vm().deferFailStatus?.currentHour);
	private readonly recentTs = computed(() => this.facade.vm().lastBlacklistEventAt);

	readonly severity = computed<Severity>(() => {
		if (!this.enabled) return 'info';
		const status = this.status();
		if (status === 'CRITICAL') return 'danger';
		if (status === 'WARNING') return 'warn';
		const ts = this.recentTs();
		if (ts !== null && Date.now() - ts < RECENT_BLACKLIST_TTL_MS) return 'warn';
		return 'info';
	});

	readonly visible = computed(() => this.severity() !== 'info');

	readonly title = computed(() => {
		const sev = this.severity();
		if (sev === 'danger') return 'Bloqueo en curso del dominio';
		return 'Riesgo de bloqueo del dominio';
	});

	readonly icon = computed(() =>
		this.severity() === 'danger' ? 'pi pi-exclamation-circle' : 'pi pi-exclamation-triangle',
	);

	readonly contadorLabel = computed(() => {
		const cur = this.currentHour();
		if (!cur) return null;
		return `${cur.deferFailCount} / ${cur.threshold} fallos en la hora actual`;
	});

	readonly recentLabel = computed(() => {
		const ts = this.recentTs();
		if (ts === null) return null;
		const minutos = Math.max(0, Math.round((Date.now() - ts) / 60000));
		if (minutos === 0) return 'Bloqueo automático recibido hace instantes.';
		return `Bloqueo automático recibido hace ${minutos} min.`;
	});
	// #endregion

	// #region Lifecycle
	ngOnInit(): void {
		if (!this.enabled) return;
		// `startHub` es idempotente; otras instancias en otras páginas pueden
		// llamarlo también. No detenemos el hub al desmontar — el facade es
		// providedIn: 'root' y otras vistas pueden seguirlo consumiendo.
		void this.facade.startHub();
	}
	// #endregion
}
// #endregion
