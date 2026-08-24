// #region Imports
import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { ButtonModule } from 'primeng/button';

import {
	TICKET_DESCRIPCION_MAX,
	TICKET_DESCRIPCION_MIN,
	TICKET_PROPUESTA_MAX,
	TicketEstado,
} from '../../models/ticket.models';
import { ErrorStateComponent } from '@shared/components';
import { AyudaTicketFacade } from './services/ayuda-ticket.facade';
import { EduMessageService, EduSelect, EduSpinner, EduTable, EduTag, EduTemplate, EduTextarea, EduToast } from '@edu-ui';

interface TipoOption {
	label: string;
	value: number;
}

const ESTADO_LABELS: Record<TicketEstado, string> = {
	PENDIENTE: 'Pendiente',
	EN_REVISION: 'En revisión',
	RESUELTO: 'Resuelto',
};

const ESTADO_SEVERITY: Record<TicketEstado, 'warn' | 'info' | 'success'> = {
	PENDIENTE: 'warn',
	EN_REVISION: 'info',
	RESUELTO: 'success',
};
// #endregion

/**
 * Sección Ticket: formulario de creación (tipo de problema + descripción +
 * propuesta opcional) e historial/estado de los tickets propios del usuario.
 * Entidad independiente del sistema de "Reportar" existente — no reusa sus
 * componentes/formularios (`api-catalog.md` § Ayuda > Ticket).
 */
@Component({
	selector: 'app-ayuda-ticket',
	standalone: true,
	imports: [CommonModule, FormsModule, EduSelect, EduTextarea, ButtonModule, EduSpinner, EduTable, EduTag, EduToast, ErrorStateComponent, EduTemplate],
	providers: [AyudaTicketFacade, EduMessageService],
	templateUrl: './ayuda-ticket.component.html',
	styleUrl: './ayuda-ticket.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AyudaTicketComponent implements OnInit {
	// #region Dependencies
	private readonly facade = inject(AyudaTicketFacade);
	private readonly messageService = inject(EduMessageService);
	// #endregion

	// #region State del facade
	readonly tickets = this.facade.tickets;
	readonly loading = this.facade.loading;
	readonly error = this.facade.error;
	readonly submitting = this.facade.submitting;

	readonly tipoOptions = computed<TipoOption[]>(() =>
		this.facade.tipos().map((t) => ({ label: t.nombre, value: t.id })),
	);
	// #endregion

	// #region Form state
	readonly tipoId = signal<number | null>(null);
	readonly descripcion = signal('');
	readonly propuesta = signal('');

	readonly descripcionLength = computed(() => this.descripcion().length);
	readonly descripcionValid = computed(() => {
		const len = this.descripcionLength();
		return len >= TICKET_DESCRIPCION_MIN && len <= TICKET_DESCRIPCION_MAX;
	});
	readonly canSubmit = computed(
		() => this.tipoId() !== null && this.descripcionValid() && !this.submitting(),
	);

	readonly descripcionMin = TICKET_DESCRIPCION_MIN;
	readonly descripcionMax = TICKET_DESCRIPCION_MAX;
	readonly propuestaMax = TICKET_PROPUESTA_MAX;
	// #endregion

	// #region Vista previa (auditoría /intranet/ayuda, hallazgo 06 — antes el
	// formulario dejaba vacía la mitad del viewport en desktop; ahora esa
	// columna muestra cómo queda el ticket antes de enviarlo)
	readonly tipoLabel = computed(() => {
		const id = this.tipoId();
		if (id === null) return 'Sin especificar';
		return this.tipoOptions().find((t) => t.value === id)?.label ?? 'Sin especificar';
	});
	// #endregion

	ngOnInit(): void {
		this.facade.init();
	}

	onRetryTickets(): void {
		this.facade.init();
	}

	// #region Handlers
	onTipoChange(value: number | null): void {
		this.tipoId.set(value);
	}

	onDescripcionChange(value: string): void {
		this.descripcion.set(value);
	}

	onPropuestaChange(value: string): void {
		this.propuesta.set(value);
	}

	async onSubmit(): Promise<void> {
		if (!this.canSubmit()) return;

		const ok = await this.facade.crear({
			tipoId: this.tipoId()!,
			descripcion: this.descripcion(),
			propuesta: this.propuesta().trim() || null,
		});

		if (ok) {
			this.messageService.add({
				severity: 'success',
				summary: 'Ticket creado',
				detail: 'Tu ticket fue registrado correctamente.',
				life: 3000,
			});
			this.resetForm();
		} else {
			this.messageService.add({
				severity: 'error',
				summary: 'Error',
				detail: 'No se pudo crear el ticket. Intenta de nuevo más tarde.',
				life: 4000,
			});
		}
	}
	// #endregion

	private resetForm(): void {
		this.tipoId.set(null);
		this.descripcion.set('');
		this.propuesta.set('');
	}

	// #region Template helpers
	estadoLabel(estado: TicketEstado): string {
		return ESTADO_LABELS[estado];
	}

	estadoTagSeverity(estado: TicketEstado): 'warn' | 'info' | 'success' {
		return ESTADO_SEVERITY[estado];
	}
	// #endregion
}
