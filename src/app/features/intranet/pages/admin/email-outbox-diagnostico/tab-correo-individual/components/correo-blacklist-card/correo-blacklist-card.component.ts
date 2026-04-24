import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { TagModule } from 'primeng/tag';

import {
	BlacklistEstado,
	EmailDiagnosticoBlacklist,
} from '../../models/correo-individual.models';

@Component({
	selector: 'app-correo-blacklist-card',
	standalone: true,
	imports: [DatePipe, TagModule],
	templateUrl: './correo-blacklist-card.component.html',
	styleUrl: './correo-blacklist-card.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CorreoBlacklistCardComponent {
	readonly blacklist = input.required<EmailDiagnosticoBlacklist>();

	readonly severity = computed<'danger' | 'warn'>(() =>
		this.blacklist().estado === 'ACTIVO' ? 'danger' : 'warn',
	);

	readonly headline = computed(() => {
		const estado: BlacklistEstado = this.blacklist().estado;
		return estado === 'ACTIVO'
			? 'Blacklist activa — el worker rechaza pre-SMTP (INV-MAIL01)'
			: 'Blacklist despejada — el correo puede volver a enviarse';
	});
}
