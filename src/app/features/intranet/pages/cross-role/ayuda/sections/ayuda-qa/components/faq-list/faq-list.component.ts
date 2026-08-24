import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import { FaqDto } from '@features/intranet/pages/cross-role/ayuda/models/faq.models';
import { EduAccordion, EduAccordionHeader, EduAccordionPanel, EduButton } from '@edu-ui';
/** Lista presentacional de FAQ — el botón "ir→" solo aparece si `faq.wizard` no es null. */
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

	onOpenWizard(faq: FaqDto, event: Event): void {
		event.stopPropagation();
		this.openWizard.emit(faq);
	}
}
