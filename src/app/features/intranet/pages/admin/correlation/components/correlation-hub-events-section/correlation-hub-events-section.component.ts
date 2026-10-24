import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { DatePipe } from '@angular/common';

import {
	CorrelationHubEventDto,
	HUB_EVENT_LABEL_MAP,
	HUB_EVENT_SEVERITY_MAP,
} from '../../models';
import { EduTag } from '@edu-ui';

/**
 * Plan 41 F6 — sección «Eventos de SignalR»: conexiones rechazadas, desconexiones
 * y invocaciones con error de la sesión del request (ADR-0009). Solo forma, nunca
 * payload ni texto de mensajes (INV-CORR04). Se renderiza siempre; sin datos muestra
 * un aviso, y sin sesión resuelta aclara que solo hay eventos del id consultado.
 */
@Component({
	selector: 'app-correlation-hub-events-section',
	standalone: true,
	imports: [DatePipe, EduTag],
	templateUrl: './correlation-hub-events-section.component.html',
	styleUrl: './correlation-hub-events-section.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CorrelationHubEventsSectionComponent {
	readonly items = input<readonly CorrelationHubEventDto[]>([]);
	/** `false` cuando el snapshot no trae `sessionId`: los eventos son solo los del id consultado. */
	readonly sessionResolved = input<boolean>(true);

	readonly hasItems = computed(() => this.items().length > 0);

	readonly labelMap = HUB_EVENT_LABEL_MAP;
	readonly severityMap = HUB_EVENT_SEVERITY_MAP;
}
