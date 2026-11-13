import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

import { FaqDto } from '@features/intranet/pages/cross-role/ayuda/models/faq.models';
import { highlightSegments } from '../../helpers/faq-highlight';

interface CategoriaGrupo {
	categoria: string;
	faqs: FaqDto[];
}

/**
 * Lista presentacional de FAQ agrupada por categoría (columna «maestro» del maestro-detalle).
 * Solo marca la pregunta seleccionada y emite la elección; la respuesta vive en `FaqDetailComponent`,
 * por eso abrir una pregunta no mueve la lista.
 */
@Component({
	selector: 'app-faq-list',
	standalone: true,
	templateUrl: './faq-list.component.html',
	styleUrl: './faq-list.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FaqListComponent {
	readonly faqs = input.required<FaqDto[]>();
	readonly selectedId = input<number | null>(null);
	/** Término de búsqueda activo, para resaltar coincidencias en la pregunta. */
	readonly term = input('');
	readonly faqSelected = output<number>();

	readonly categoriaIconMap: Record<string, string> = {
		Común: 'pi pi-users',
		Profesor: 'pi pi-book',
		Estudiante: 'pi pi-graduation-cap',
		'Asistente Administrativo': 'pi pi-briefcase',
	};

	readonly faqsPorCategoria = computed<CategoriaGrupo[]>(() => {
		const grouped = new Map<string, FaqDto[]>();
		for (const faq of this.faqs()) {
			const cat = faq.categoria ?? 'Común';
			grouped.set(cat, [...(grouped.get(cat) ?? []), faq]);
		}
		return Array.from(grouped.entries())
			.map(([categoria, faqs]) => ({ categoria, faqs }))
			.sort((a, b) => a.categoria.localeCompare(b.categoria, 'es'));
	});

	segments(pregunta: string) {
		return highlightSegments(pregunta, this.term());
	}
}
