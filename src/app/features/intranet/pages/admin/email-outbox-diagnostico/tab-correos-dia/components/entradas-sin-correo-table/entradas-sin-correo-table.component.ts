import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

import {
	DiagnosticoRazon,
	EntradaSinCorreoEnviado,
} from '../../models/correos-dia.models';
import { RazonLabelPipe } from '../../pipes/razon-label.pipe';
import { EduButton, EduTable, EduTag, EduTooltip } from '@edu-ui';

type Severity = 'secondary' | 'warn' | 'danger';

const RAZON_SEVERITY: Record<DiagnosticoRazon, Severity> = {
	SIN_CORREO: 'warn',
	BLACKLISTED: 'danger',
	FALLIDO: 'danger',
	PENDIENTE: 'warn',
	SIN_RASTRO: 'danger',
};

/** Razones para las que reencolar tiene sentido: no hay fila en outbox (SIN_RASTRO)
 *  o la fila existente ya agotó reintentos (FALLIDO). SIN_CORREO/BLACKLISTED son
 *  rechazos de negocio esperados — reencolarlos saltaría esas guardas a propósito. */
const RAZONES_REENCOLABLES: ReadonlySet<DiagnosticoRazon> = new Set(['SIN_RASTRO', 'FALLIDO']);

@Component({
	selector: 'app-entradas-sin-correo-table',
	standalone: true,
	imports: [EduTable, EduTag, EduButton, EduTooltip, DatePipe, RazonLabelPipe],
	templateUrl: './entradas-sin-correo-table.component.html',
	styleUrl: './entradas-sin-correo-table.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EntradasSinCorreoTableComponent {
	readonly data = input.required<EntradaSinCorreoEnviado[]>();

	/** Fila puntual a reencolar (botón por fila). */
	readonly reencolarUno = output<EntradaSinCorreoEnviado>();
	/** Todas las filas elegibles del día (botón "Reencolar todos"). */
	readonly reencolarTodos = output<EntradaSinCorreoEnviado[]>();

	readonly filasReencolables = computed(() =>
		this.data().filter((row) => this.isReencolable(row.razon)),
	);

	razonSeverity(razon: DiagnosticoRazon): Severity {
		return RAZON_SEVERITY[razon] ?? 'secondary';
	}

	isCritical(razon: DiagnosticoRazon): boolean {
		return razon === 'BLACKLISTED' || razon === 'FALLIDO' || razon === 'SIN_RASTRO';
	}

	isReencolable(razon: DiagnosticoRazon): boolean {
		return RAZONES_REENCOLABLES.has(razon);
	}

	onReencolarUno(row: EntradaSinCorreoEnviado): void {
		this.reencolarUno.emit(row);
	}

	onReencolarTodos(): void {
		this.reencolarTodos.emit(this.filasReencolables());
	}
}
