import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, signal } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';

import { EmailDiagnosticoHistoriaItem } from '../../models/correo-individual.models';

type Severity = 'secondary' | 'success' | 'danger' | 'warn' | 'info';

const ESTADO_SEVERITY: Record<string, Severity> = {
	SENT: 'success',
	FAILED: 'danger',
	PENDING: 'warn',
	RETRYING: 'warn',
	FAILED_BLACKLISTED: 'danger',
};

@Component({
	selector: 'app-correo-historia-table',
	standalone: true,
	imports: [TableModule, TagModule, ButtonModule, TooltipModule, DatePipe],
	templateUrl: './correo-historia-table.component.html',
	styleUrl: './correo-historia-table.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CorreoHistoriaTableComponent {
	readonly data = input.required<EmailDiagnosticoHistoriaItem[]>();

	// * Set de IDs expandidos para mostrar detalles de la fila (error/remitente/bounce).
	private readonly _expanded = signal<Set<number>>(new Set());
	readonly expanded = this._expanded.asReadonly();

	isExpanded(id: number): boolean {
		return this._expanded().has(id);
	}

	toggleExpand(id: number): void {
		this._expanded.update((set) => {
			const next = new Set(set);
			if (next.has(id)) next.delete(id);
			else next.add(id);
			return next;
		});
	}

	estadoSeverity(estado: string): Severity {
		return ESTADO_SEVERITY[estado] ?? 'secondary';
	}

	hasDetalle(item: EmailDiagnosticoHistoriaItem): boolean {
		return !!(
			item.ultimoError ||
			item.remitente ||
			item.bounceSource ||
			item.bounceDetectedAt
		);
	}
}
