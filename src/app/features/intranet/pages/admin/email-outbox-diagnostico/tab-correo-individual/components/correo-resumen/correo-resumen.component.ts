import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { EmailDiagnosticoResumen } from '../../models/correo-individual.models';

interface StatCardDef {
	key: keyof EmailDiagnosticoResumen;
	label: string;
	sublabel: string;
	icon: string;
	variant: 'neutral' | 'success' | 'danger' | 'warning' | 'info';
}

const CARDS: StatCardDef[] = [
	{
		key: 'totalIntentos',
		label: 'Intentos totales',
		sublabel: 'filas históricas en outbox',
		icon: 'pi pi-list',
		variant: 'info',
	},
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
		sublabel: 'rechazados por SMTP',
		icon: 'pi pi-times-circle',
		variant: 'danger',
	},
	{
		key: 'pendientes',
		label: 'Pendientes',
		sublabel: 'aún por procesar',
		icon: 'pi pi-clock',
		variant: 'warning',
	},
];

@Component({
	selector: 'app-correo-resumen',
	standalone: true,
	imports: [DatePipe],
	templateUrl: './correo-resumen.component.html',
	styleUrl: './correo-resumen.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CorreoResumenComponent {
	readonly resumen = input.required<EmailDiagnosticoResumen>();

	readonly cards = computed(() => {
		const r = this.resumen();
		return CARDS.map((def) => ({ ...def, value: r[def.key] ?? 0 }));
	});

	readonly primerIntento = computed(() => this.resumen().primerIntento);
	readonly ultimoIntento = computed(() => this.resumen().ultimoIntento);
	readonly mostrandoUltimos = computed(() => this.resumen().mostrandoUltimos);
	readonly totalIntentos = computed(() => this.resumen().totalIntentos);
}
