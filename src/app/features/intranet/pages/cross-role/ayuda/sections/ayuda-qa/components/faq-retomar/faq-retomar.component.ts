import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import { RetomarItem } from '../../services/ayuda-qa.facade';

/**
 * Sección «Retomar» arriba de la lista: las guías que la persona dejó a medias, la más reciente primero,
 * con el paso donde seguir. Presentacional: elegir una emite el id y la página la abre igual que desde la
 * lista. Sin guías en curso no pinta nada. No afirma por qué se dejó la guía (pausa, olvido o traba).
 */
@Component({
	selector: 'app-faq-retomar',
	standalone: true,
	templateUrl: './faq-retomar.component.html',
	styleUrl: './faq-retomar.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FaqRetomarComponent {
	readonly items = input.required<RetomarItem[]>();
	readonly faqSelected = output<number>();
}
