import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import type { TipoEventoCalendario } from '@data/models';

// #region Implementation
export type EventMarkerKind = TipoEventoCalendario | 'holiday';

const KNOWN_KINDS: readonly string[] = ['academic', 'cultural', 'sports', 'meeting', 'holiday', 'other'];

/** Tipos que no conoce el sistema (datos antiguos o de prueba, ej. 'feriado') se muestran como 'other'. */
export function resolveEventMarkerKind(value: string): EventMarkerKind {
	return KNOWN_KINDS.includes(value) ? (value as EventMarkerKind) : 'other';
}

/**
 * Marcador de tipo de evento: forma + color. Compartido por calendario, eventos y notificaciones.
 * Con `label` se expone como imagen accesible; sin `label` es decorativo (el texto ya está al lado).
 */
@Component({
	selector: 'app-event-type-marker',
	standalone: true,
	template: `
		<span
			class="marker"
			[attr.data-kind]="resolvedKind()"
			[attr.role]="label() ? 'img' : null"
			[attr.aria-label]="label() || null"
			[attr.aria-hidden]="label() ? null : 'true'"
		></span>
	`,
	styleUrl: './event-type-marker.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EventTypeMarkerComponent {
	readonly kind = input.required<EventMarkerKind>();
	readonly label = input<string>('');

	protected readonly resolvedKind = computed(() => resolveEventMarkerKind(this.kind()));
}
// #endregion
