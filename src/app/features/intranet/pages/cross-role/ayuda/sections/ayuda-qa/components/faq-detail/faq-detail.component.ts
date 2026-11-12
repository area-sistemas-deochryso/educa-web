import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import { FaqDto, FaqMotivo, FaqVoto } from '@features/intranet/pages/cross-role/ayuda/models/faq.models';
import { EduButton } from '@edu-ui';
import { FaqGuideComponent } from '../faq-guide/faq-guide.component';

export interface FaqVoteEvent {
	util: boolean;
	motivo: FaqMotivo | null;
}

const MOTIVOS: readonly { value: FaqMotivo; label: string }[] = [
	{ value: 'INCOMPLETA', label: 'Está incompleta' },
	{ value: 'NO_ES_LO_QUE_BUSCO', label: 'No es lo que busco' },
	{ value: 'DESACTUALIZADA', label: 'Está desactualizada' },
];

/**
 * Detalle de una FAQ (columna derecha del maestro-detalle): categoría, respuesta, guía en checklist,
 * voto «¿Te sirvió?» y preguntas relacionadas. El voto vigente llega por `vote` y los cambios salen por
 * `voted` (quien lo persiste es el facade). «No útil» pide el motivo (opcional) y ofrece generar un
 * ticket con la pregunta citada. En móvil ocupa la pantalla completa y `back` vuelve a la lista.
 */
@Component({
	selector: 'app-faq-detail',
	standalone: true,
	imports: [EduButton, FaqGuideComponent],
	templateUrl: './faq-detail.component.html',
	styleUrl: './faq-detail.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FaqDetailComponent {
	readonly faq = input.required<FaqDto>();
	readonly relacionadas = input<FaqDto[]>([]);
	readonly vote = input<FaqVoto | null>(null);
	readonly voted = output<FaqVoteEvent>();
	readonly relatedSelected = output<number>();
	readonly ticketRequested = output<FaqDto>();
	readonly back = output<void>();

	readonly motivos = MOTIVOS;

	votar(util: boolean, motivo: FaqMotivo | null = null): void {
		this.voted.emit({ util, motivo });
	}
}
