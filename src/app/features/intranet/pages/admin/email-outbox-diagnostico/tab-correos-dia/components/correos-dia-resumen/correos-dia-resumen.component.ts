import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { DiagnosticoCorreosDiaResumen } from '../../models/correos-dia.models';

interface StatCardDef {
	key: keyof DiagnosticoCorreosDiaResumen;
	label: string;
	sublabel: string;
	icon: string;
	variant: 'neutral' | 'success' | 'danger' | 'warning' | 'info';
}

// * Cards generales — contexto de alcance y envíos exitosos del día.
const GENERAL_CARDS: StatCardDef[] = [
	{
		key: 'entradasMarcadas',
		label: 'Entradas marcadas',
		sublabel: 'estudiantes en alcance INV-C11',
		icon: 'pi pi-sign-in',
		variant: 'info',
	},
	{
		key: 'estudiantesConEntrada',
		label: 'Estudiantes únicos',
		sublabel: 'con marcación hoy',
		icon: 'pi pi-users',
		variant: 'neutral',
	},
	{
		key: 'correosEnviados',
		label: 'Correos enviados',
		sublabel: 'entregas exitosas',
		icon: 'pi pi-check-circle',
		variant: 'success',
	},
];

// * Cards de gap — razones del descalce entre entradas y correos.
const GAP_CARDS: StatCardDef[] = [
	{
		key: 'estudiantesSinCorreoApoderado',
		label: 'Sin correo apoderado',
		sublabel: 'EST_CorreoApoderado vacío',
		icon: 'pi pi-user-minus',
		variant: 'warning',
	},
	{
		key: 'correosApoderadosBlacklisteados',
		label: 'Apoderados blacklisteados',
		sublabel: 'bloqueados por bounces',
		icon: 'pi pi-ban',
		variant: 'danger',
	},
	{
		key: 'correosFallidos',
		label: 'Correos fallidos',
		sublabel: 'rechazados por SMTP',
		icon: 'pi pi-times-circle',
		variant: 'danger',
	},
	{
		key: 'correosPendientes',
		label: 'Correos pendientes',
		sublabel: 'aún por procesar',
		icon: 'pi pi-clock',
		variant: 'warning',
	},
	{
		key: 'correosFaltantes',
		label: 'Sin rastro',
		sublabel: 'entrada sin fila en outbox',
		icon: 'pi pi-question-circle',
		variant: 'danger',
	},
	{
		key: 'estudiantesFueraDeAlcance',
		label: 'Fuera de alcance',
		sublabel: 'GRA_Orden < 8 (informativo)',
		icon: 'pi pi-filter',
		variant: 'neutral',
	},
];

@Component({
	selector: 'app-correos-dia-resumen',
	standalone: true,
	templateUrl: './correos-dia-resumen.component.html',
	styleUrl: './correos-dia-resumen.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CorreosDiaResumenComponent {
	readonly resumen = input.required<DiagnosticoCorreosDiaResumen>();

	readonly generalCards = computed(() => {
		const r = this.resumen();
		return GENERAL_CARDS.map((def) => ({ ...def, value: r[def.key] ?? 0 }));
	});

	readonly gapCards = computed(() => {
		const r = this.resumen();
		return GAP_CARDS.map((def) => ({ ...def, value: r[def.key] ?? 0 }));
	});

	readonly totalGap = computed(() => {
		const r = this.resumen();
		return (
			r.estudiantesSinCorreoApoderado +
			r.correosApoderadosBlacklisteados +
			r.correosFallidos +
			r.correosPendientes +
			r.correosFaltantes
		);
	});
}
