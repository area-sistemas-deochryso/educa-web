import { ChangeDetectionStrategy, Component, ElementRef, input, output, viewChild } from '@angular/core';

import { FaqDto } from '@features/intranet/pages/cross-role/ayuda/models/faq.models';
import { EduButton } from '@edu-ui';
import { CategoriaChip, ModoVista } from '../../services/ayuda-qa.facade';

/**
 * Cabecera presentacional con dos estados: inicial (buscador grande + «más consultadas»
 * + salida a ticket) y compacta (en cuanto hay búsqueda o categoría activa).
 * El control «Para ti / Todas» y los chips se muestran en ambos estados.
 */
@Component({
	selector: 'app-faq-header',
	standalone: true,
	imports: [EduButton],
	templateUrl: './faq-header.component.html',
	styleUrl: './faq-header.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FaqHeaderComponent {
	// #region Inputs / Outputs
	readonly compact = input.required<boolean>();
	readonly searchTerm = input.required<string>();
	readonly modoVista = input.required<ModoVista>();
	readonly categoria = input<string | null>(null);
	readonly chips = input.required<CategoriaChip[]>();
	readonly paraTiCount = input.required<number>();
	readonly todasCount = input.required<number>();
	readonly resultCount = input.required<number>();
	readonly populares = input<FaqDto[]>([]);

	readonly searchChange = output<string>();
	readonly modoChange = output<ModoVista>();
	readonly categoriaChange = output<string | null>();
	readonly faqSelected = output<number>();
	readonly ticketRequested = output<void>();
	// #endregion

	private readonly searchInput = viewChild<ElementRef<HTMLInputElement>>('searchInput');

	focusSearch(): void {
		this.searchInput()?.nativeElement.focus();
	}

	onSearchInput(event: Event): void {
		this.searchChange.emit((event.target as HTMLInputElement).value);
	}
}
