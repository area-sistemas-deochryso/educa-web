// #region Imports
import {
	ChangeDetectionStrategy,
	Component,
	HostListener,
	OnInit,
	computed,
	effect,
	inject,
	signal,
	untracked,
	viewChild,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { map } from 'rxjs/operators';

import { FaqDto } from '../../models/faq.models';
import { FaqDetailComponent } from './components/faq-detail/faq-detail.component';
import { FaqHeaderComponent } from './components/faq-header/faq-header.component';
import { FaqListComponent } from './components/faq-list/faq-list.component';
import { FaqWizardDialogComponent } from './components/faq-wizard-dialog/faq-wizard-dialog.component';
import { AyudaQaFacade, ModoVista } from './services/ayuda-qa.facade';
import { EduButton, EduSpinner } from '@edu-ui';
// #endregion

/** Query param con el id de la pregunta abierta (enlace directo). */
const FAQ_QUERY_PARAM = 'faq';

/**
 * Sección QA: cabecera de dos estados + maestro-detalle (lista a la izquierda, respuesta a la derecha;
 * en móvil son dos pantallas). El BE ya filtra por capability — este componente no reimplementa el
 * chequeo. La pregunta abierta vive en la URL (`?faq=<id>`) para poder compartirla.
 */
@Component({
	selector: 'app-ayuda-qa',
	standalone: true,
	imports: [
		EduButton,
		EduSpinner,
		FaqHeaderComponent,
		FaqListComponent,
		FaqDetailComponent,
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
	private readonly route = inject(ActivatedRoute);
	private readonly router = inject(Router);
	// #endregion

	// #region State del facade
	readonly faqs = this.facade.faqs;
	readonly categoria = this.facade.categoria;
	readonly searchTerm = this.facade.searchTerm;
	readonly loading = this.facade.loading;
	readonly error = this.facade.error;
	readonly modoVista = this.facade.modoVista;
	readonly chips = this.facade.categoriaChips;
	readonly paraTiCount = this.facade.paraTiCount;
	readonly todasCount = this.facade.todasCount;
	readonly populares = this.facade.populares;
	readonly selectedFaq = this.facade.selectedFaq;
	readonly selectedId = this.facade.selectedId;
	readonly headerCompact = this.facade.isFiltering;

	readonly detailOpen = computed(() => this.selectedFaq() !== null);
	// #endregion

	// #region Estado local — wizard
	readonly wizardFaq = signal<FaqDto | null>(null);
	readonly wizardVisible = computed(() => this.wizardFaq() !== null);
	// #endregion

	// #region Enlace directo (?faq=<id>)
	private readonly faqIdFromUrl = toSignal(
		this.route.queryParamMap.pipe(
			map((params) => {
				const id = Number(params.get(FAQ_QUERY_PARAM));
				return Number.isInteger(id) && id > 0 ? id : null;
			}),
		),
		{ initialValue: null },
	);

	/** `untracked`: `select` lee los filtros para decidir si limpiarlos; no debe re-ejecutarse al teclear. */
	private readonly syncSelectionFromUrl = effect(() => {
		const id = this.faqIdFromUrl();
		untracked(() => this.facade.select(id));
	});
	// #endregion

	private readonly header = viewChild(FaqHeaderComponent);

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

	onModoVistaChange(modo: ModoVista): void {
		this.facade.setModoVista(modo);
	}

	onFaqSelected(id: number | null): void {
		void this.router.navigate([], {
			relativeTo: this.route,
			queryParams: { [FAQ_QUERY_PARAM]: id },
			queryParamsHandling: 'merge',
		});
	}

	onClearFilters(): void {
		this.facade.clearFilters();
	}

	/** Lleva la búsqueda al formulario de ticket para que la persona no la reescriba. */
	onTicketRequested(): void {
		const term = this.searchTerm().trim();
		const descripcion = term
			? `Busqué «${term}» en las preguntas frecuentes y no encontré respuesta.`
			: null;
		void this.router.navigate(['../ticket'], {
			relativeTo: this.route,
			queryParams: { descripcion },
		});
	}

	onOpenWizard(faq: FaqDto): void {
		if (faq.wizard) this.wizardFaq.set(faq);
	}

	onWizardVisibleChange(visible: boolean): void {
		if (!visible) this.wizardFaq.set(null);
	}
	// #endregion

	// #region Atajos de lista
	@HostListener('document:keydown', ['$event'])
	onKeydown(event: KeyboardEvent): void {
		if (this.wizardVisible() || event.ctrlKey || event.metaKey || event.altKey) return;

		if (event.key === 'Escape' && this.detailOpen()) {
			this.onFaqSelected(null);
			return;
		}

		if (event.key === '/' && !this.isTypingTarget(event.target)) {
			event.preventDefault();
			this.header()?.focusSearch();
		}
	}

	private isTypingTarget(target: EventTarget | null): boolean {
		const el = target as HTMLElement | null;
		if (!el) return false;
		return el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable;
	}
	// #endregion
}
