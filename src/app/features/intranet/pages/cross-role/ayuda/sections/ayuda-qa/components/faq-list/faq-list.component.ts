import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';

import { FaqDto } from '@features/intranet/pages/cross-role/ayuda/models/faq.models';
import { EduAccordion, EduAccordionHeader, EduAccordionPanel, EduButton } from '@edu-ui';
/** Lista presentacional de FAQ — muestra tarjetas agrupadas por categoría con iconos y badge de rol.
 * El botón "ir→" solo aparece si `faq.wizard` no es null. Incluye feedback "¿Fue útil?" por FAQ. */
interface CategoriaGrupo {
	categoria: string;
	faqs: FaqDto[];
}

interface FeedbackEstado {
	tipo: 'util' | 'no-util';
}

@Component({
	selector: 'app-faq-list',
	standalone: true,
	imports: [EduAccordion, EduAccordionHeader, EduAccordionPanel, EduButton],
	templateUrl: './faq-list.component.html',
	styleUrl: './faq-list.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FaqListComponent {
	readonly faqs = input.required<FaqDto[]>();
	readonly openWizard = output<FaqDto>();

	readonly categoriaIconMap = computed<Record<string, { icon: string; color: string }>>(() => ({
		Común: { icon: 'pi pi-users', color: 'var(--primary-color)' },
		Profesor: { icon: 'pi pi-chalkboard-teacher', color: 'var(--primary-color)' },
		Estudiante: { icon: 'pi pi-student', color: 'var(--primary-color)' },
		'Asistente Administrativo': { icon: 'pi pi-user-shield', color: 'var(--primary-color)' },
	}));

	readonly faqsPorCategoria = computed<CategoriaGrupo[]>(() => {
		const grouped = new Map<string, FaqDto[]>();
		for (const faq of this.faqs()) {
			const cat = faq.categoria ?? 'Común';
			if (!grouped.has(cat)) grouped.set(cat, []);
			grouped.get(cat)!.push(faq);
		}
		return Array.from(grouped.entries())
			.map(([categoria, faqs]) => ({ categoria, faqs }))
			.sort((a, b) => a.categoria.localeCompare(b.categoria, 'es'));
	});

	private readonly _feedbackEstado = signal<Record<number, FeedbackEstado>>({});
	readonly feedbackEstado = this._feedbackEstado.asReadonly();

	onOpenWizard(faq: FaqDto, event: Event): void {
		event.stopPropagation();
		this.openWizard.emit(faq);
	}

	registrarFeedback(faqId: number, tipo: 'util' | 'no-util'): void {
		this._feedbackEstado.update((estados) => ({
			...estados,
			[faqId]: { tipo },
		}));
		setTimeout(() => {
			this._feedbackEstado.update((estados) => {
				const nuevo = { ...estados };
				delete nuevo[faqId];
				return nuevo;
			});
		}, 3000);
	}
}
