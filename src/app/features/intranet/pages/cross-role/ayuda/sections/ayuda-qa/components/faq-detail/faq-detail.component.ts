import { ChangeDetectionStrategy, Component, DestroyRef, inject, input, output, signal } from '@angular/core';

import { FaqDto } from '@features/intranet/pages/cross-role/ayuda/models/faq.models';
import { EduButton } from '@edu-ui';
import { FaqGuideComponent } from '../faq-guide/faq-guide.component';

type FeedbackTipo = 'util' | 'no-util';

const FEEDBACK_VISIBLE_MS = 3000;

/**
 * Detalle de una FAQ (columna derecha del maestro-detalle): categoría, respuesta, guía en checklist,
 * preguntas relacionadas y feedback «¿Te sirvió?» (en memoria hasta que F6 lo envíe al servidor).
 * «No útil» ofrece generar un ticket con la pregunta citada. En móvil ocupa la pantalla completa
 * y `back` vuelve a la lista.
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
	private readonly destroyRef = inject(DestroyRef);

	readonly faq = input.required<FaqDto>();
	readonly relacionadas = input<FaqDto[]>([]);
	readonly relatedSelected = output<number>();
	readonly ticketRequested = output<FaqDto>();
	readonly back = output<void>();

	private readonly _feedback = signal<Record<number, FeedbackTipo>>({});
	readonly feedback = this._feedback.asReadonly();

	private readonly timers = new Set<ReturnType<typeof setTimeout>>();

	constructor() {
		this.destroyRef.onDestroy(() => this.timers.forEach((t) => clearTimeout(t)));
	}

	registrarFeedback(faqId: number, tipo: FeedbackTipo): void {
		this._feedback.update((estados) => ({ ...estados, [faqId]: tipo }));
		// «No útil» queda visible: ofrece el ticket hasta que la persona cambie de pregunta.
		if (tipo === 'no-util') return;

		const timer = setTimeout(() => {
			this.timers.delete(timer);
			this._feedback.update((estados) => {
				const nuevo = { ...estados };
				delete nuevo[faqId];
				return nuevo;
			});
		}, FEEDBACK_VISIBLE_MS);
		this.timers.add(timer);
	}
}
