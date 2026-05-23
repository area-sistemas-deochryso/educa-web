import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { DrawerModule } from 'primeng/drawer';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';

import { CorrelationIdPillComponent } from '@shared/components';

import { EmailDiagnosticoHistoriaItem } from '../../models/correo-individual.models';

type Severity = 'secondary' | 'success' | 'danger' | 'warn' | 'info';

const ESTADO_SEVERITY: Record<string, Severity> = {
	SENT: 'success',
	FAILED: 'danger',
	PENDING: 'warn',
	RETRYING: 'warn',
	FAILED_BLACKLISTED: 'danger',
	PROCESSING: 'info',
};

const TIPO_PERSONA_LABEL: Record<string, string> = {
	E: 'Estudiante',
	P: 'Profesor',
	D: 'Director',
	APO: 'Apoderado',
};

@Component({
	selector: 'app-correo-detail-drawer',
	standalone: true,
	imports: [DrawerModule, ButtonModule, TagModule, TooltipModule, DatePipe, CorrelationIdPillComponent],
	templateUrl: './correo-detail-drawer.component.html',
	styleUrl: './correo-detail-drawer.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CorreoDetailDrawerComponent {
	// #region Dependencias
	private readonly router = inject(Router);
	// #endregion

	// #region Inputs / Outputs
	readonly visible = input<boolean>(false);
	readonly item = input<EmailDiagnosticoHistoriaItem | null>(null);
	readonly htmlBody = input<string | null>(null);
	readonly loadingHtml = input<boolean>(false);

	readonly visibleChange = output<boolean>();
	readonly closeDrawer = output<void>();
	readonly loadHtml = output<number>();
	// #endregion

	// #region Computed
	readonly estadoSeverity = computed<Severity>(() => {
		const estado = this.item()?.estado;
		return estado ? (ESTADO_SEVERITY[estado] ?? 'secondary') : 'secondary';
	});

	readonly ownerLabel = computed(() => {
		const owner = this.item()?.owner;
		if (!owner) return null;
		const tipo = TIPO_PERSONA_LABEL[owner.tipoPersona] ?? owner.tipoPersona;
		return `${tipo}: ${owner.nombreCompleto}`;
	});

	readonly intentosLabel = computed(() => {
		const i = this.item();
		if (!i) return '';
		return `${i.intentos} / ${i.maxIntentos}`;
	});

	readonly hasSmtp = computed(() => {
		const i = this.item();
		return !!(i?.lastSmtpCode || i?.lastSmtpMessage);
	});
	// #endregion

	// #region Handlers
	onVisibleChange(vis: boolean): void {
		this.visibleChange.emit(vis);
	}

	onClose(): void {
		this.closeDrawer.emit();
	}

	onLoadHtml(): void {
		const id = this.item()?.id;
		if (id) this.loadHtml.emit(id);
	}

	navigateToOwner(): void {
		const owner = this.item()?.owner;
		if (!owner) return;
		// TODO: route depends on owner type — for now no-op
	}
	// #endregion
}
