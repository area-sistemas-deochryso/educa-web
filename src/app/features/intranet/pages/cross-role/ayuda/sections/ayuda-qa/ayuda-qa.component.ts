// #region Imports
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { InputTextModule } from 'primeng/inputtext';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { SelectModule } from 'primeng/select';

import { FaqDto } from '../../models/faq.models';
import { FaqListComponent } from './components/faq-list/faq-list.component';
import { FaqWizardDialogComponent } from './components/faq-wizard-dialog/faq-wizard-dialog.component';
import { AyudaQaFacade } from './services/ayuda-qa.facade';
// #endregion

interface CategoriaOption {
	label: string;
	value: string | null;
}

/**
 * Sección QA: listado de FAQ filtrado server-side por capability (el BE ya
 * resuelve esto — este componente no reimplementa el chequeo), filtro de
 * categoría opcional, búsqueda de texto libre, y wizard embebido por FAQ.
 */
@Component({
	selector: 'app-ayuda-qa',
	standalone: true,
	imports: [
		FormsModule,
		InputTextModule,
		SelectModule,
		ProgressSpinnerModule,
		FaqListComponent,
		FaqWizardDialogComponent,
	],
	providers: [AyudaQaFacade],
	templateUrl: './ayuda-qa.component.html',
	styleUrl: './ayuda-qa.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AyudaQaComponent implements OnInit {
	// #region Dependencies
	private readonly facade = inject(AyudaQaFacade);
	// #endregion

	// #region State del facade
	readonly faqs = this.facade.faqs;
	readonly categoria = this.facade.categoria;
	readonly searchTerm = this.facade.searchTerm;
	readonly loading = this.facade.loading;
	readonly error = this.facade.error;

	readonly categoriaOptions = computed<CategoriaOption[]>(() => [
		{ label: 'Todas las categorías', value: null },
		...this.facade.categorias().map((c) => ({ label: c, value: c })),
	]);
	// #endregion

	// #region Estado local — wizard
	readonly wizardFaq = signal<FaqDto | null>(null);
	readonly wizardVisible = computed(() => this.wizardFaq() !== null);
	// #endregion

	ngOnInit(): void {
		this.facade.init();
	}

	// #region Handlers
	onCategoriaChange(value: string | null): void {
		this.facade.setCategoria(value);
	}

	onSearchChange(value: string): void {
		this.facade.setSearchTerm(value);
	}

	onOpenWizard(faq: FaqDto): void {
		if (faq.wizard) this.wizardFaq.set(faq);
	}

	onWizardVisibleChange(visible: boolean): void {
		if (!visible) this.wizardFaq.set(null);
	}
	// #endregion
}
