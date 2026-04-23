import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { EmailDashboardResumen } from '../../models/email-dashboard-dia.models';

// * Threshold del techo cPanel defer/fail (5 fails+defers por hora por dominio, política hosting).
// * El contador del DTO es del día completo — aquí el semáforo se aplica al acumulado diario como
// * referencia gruesa; el widget per-hora vive en la bandeja principal.
const CPANEL_WARNING_THRESHOLD = 20;
const CPANEL_CRITICAL_THRESHOLD = 50;

interface StatCardDef {
	key: keyof EmailDashboardResumen;
	label: string;
	sublabel: string;
	icon: string;
	variant: 'neutral' | 'success' | 'danger' | 'warning' | 'info';
}

// * Cards generales (zona 1) — siempre visibles, grandes, comunican el estado del día.
const GENERAL_CARDS: StatCardDef[] = [
	{
		key: 'enviados',
		label: 'Enviados',
		sublabel: 'entregas exitosas',
		icon: 'pi pi-check-circle',
		variant: 'success',
	},
	{
		key: 'fallidos',
		label: 'Fallidos',
		sublabel: 'no entregaron',
		icon: 'pi pi-times-circle',
		variant: 'danger',
	},
	{
		key: 'pendientes',
		label: 'Pendientes',
		sublabel: 'aún por procesar',
		icon: 'pi pi-clock',
		variant: 'neutral',
	},
];

// * Cards de desglose (zona 3) — secundarias, solo útiles si hay fallos.
const BREAKDOWN_CARDS: StatCardDef[] = [
	{
		key: 'reintentando',
		label: 'Reintentando',
		sublabel: 'en backoff interno',
		icon: 'pi pi-refresh',
		variant: 'warning',
	},
	{
		key: 'formatoInvalido',
		label: 'Formato inválido',
		sublabel: 'dirección mal escrita',
		icon: 'pi pi-exclamation-triangle',
		variant: 'warning',
	},
	{
		key: 'sinCorreo',
		label: 'Sin correo',
		sublabel: 'apoderado sin email',
		icon: 'pi pi-user-minus',
		variant: 'neutral',
	},
	{
		key: 'blacklisteados',
		label: 'Blacklisteados',
		sublabel: 'bloqueados por 3+ bounces',
		icon: 'pi pi-ban',
		variant: 'danger',
	},
	{
		key: 'throttleHost',
		label: 'Throttle host',
		sublabel: 'rechazos por cuota cPanel',
		icon: 'pi pi-shield',
		variant: 'warning',
	},
	{
		key: 'otrosFallos',
		label: 'Otros fallos',
		sublabel: 'SMTP / red / auth',
		icon: 'pi pi-question-circle',
		variant: 'neutral',
	},
];

@Component({
	selector: 'app-dashboard-resumen',
	standalone: true,
	templateUrl: './dashboard-resumen.component.html',
	styleUrl: './dashboard-resumen.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardResumenComponent {
	readonly resumen = input.required<EmailDashboardResumen>();

	readonly generalCards = computed(() => {
		const r = this.resumen();
		return GENERAL_CARDS.map((def) => ({ ...def, value: r[def.key] ?? 0 }));
	});

	readonly breakdownCards = computed(() => {
		const r = this.resumen();
		return BREAKDOWN_CARDS.map((def) => ({ ...def, value: r[def.key] ?? 0 }));
	});

	readonly totalFallos = computed(() => this.resumen().fallidos);

	// #region Defer/Fail cPanel semáforo
	readonly deferFailCount = computed(() => this.resumen().deferFailContadorCpanel);

	readonly deferFailLevel = computed<'ok' | 'warning' | 'critical'>(() => {
		const count = this.deferFailCount();
		if (count >= CPANEL_CRITICAL_THRESHOLD) return 'critical';
		if (count >= CPANEL_WARNING_THRESHOLD) return 'warning';
		return 'ok';
	});

	readonly deferFailMessage = computed(() => {
		const level = this.deferFailLevel();
		const count = this.deferFailCount();
		if (level === 'critical') {
			return `${count} defers+fails acumulados hoy. El techo cPanel es 5/h — revisar bandeja y blacklist.`;
		}
		if (level === 'warning') {
			return `${count} defers+fails acumulados hoy. Vigilar si sigue subiendo.`;
		}
		return `${count} defers+fails acumulados hoy. Canal saludable.`;
	});
	// #endregion
}
