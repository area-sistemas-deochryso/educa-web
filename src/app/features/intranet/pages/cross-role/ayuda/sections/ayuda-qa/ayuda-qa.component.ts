// #region Imports
import {
	AfterViewInit,
	ChangeDetectionStrategy,
	Component,
	DestroyRef,
	ElementRef,
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

import { FaqDto, FaqMotivo } from '../../models/faq.models';
import { FaqDetailComponent } from './components/faq-detail/faq-detail.component';
import { FaqHeaderComponent } from './components/faq-header/faq-header.component';
import { FaqListComponent } from './components/faq-list/faq-list.component';
import { FaqStickyBarComponent } from './components/faq-sticky-bar/faq-sticky-bar.component';
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
		FaqStickyBarComponent,
		FaqListComponent,
		FaqDetailComponent,
	],
	providers: [AyudaQaFacade],
	templateUrl: './ayuda-qa.component.html',
	styleUrl: './ayuda-qa.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AyudaQaComponent implements OnInit, AfterViewInit {
	// #region Dependencies
	private readonly facade = inject(AyudaQaFacade);
	private readonly route = inject(ActivatedRoute);
	private readonly router = inject(Router);
	private readonly destroyRef = inject(DestroyRef);
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
	readonly relacionadas = this.facade.relacionadas;
	readonly selectedVote = this.facade.selectedVote;
	readonly selectedId = this.facade.selectedId;
	readonly headerCompact = this.facade.isFiltering;
	readonly hasActiveFilters = this.facade.hasActiveFilters;

	readonly detailOpen = computed(() => this.selectedFaq() !== null);
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
	private readonly stickyBar = viewChild(FaqStickyBarComponent);
	private readonly headerEl = viewChild<ElementRef<HTMLElement>>('headerEl');

	// #region Barra compacta al hacer scroll
	/** Alto de respaldo del encabezado fijo de la app (escritorio) si no se puede medir. */
	private static readonly APP_HEADER_FALLBACK_PX = 80;

	private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

	/** `true` cuando la cabecera ya salió de la pantalla por arriba. */
	private readonly headerGone = signal(false);

	/** La barra compacta solo aparece si la cabecera no está compacta (con filtros activos ya lo está). */
	readonly stickyBarOn = computed(() => this.headerGone() && !this.headerCompact());

	/** Si la barra se oculta con el foco dentro (porque el filtrado encogió la página), el foco vuelve a la cabecera. */
	private readonly restoreFocus = effect(() => {
		if (this.stickyBarOn()) return;
		untracked(() => {
			if (this.stickyBar()?.hasFocus()) this.header()?.focusSearch();
		});
	});

	/** Borde inferior del encabezado fijo de la app: cambia con el ancho (en móvil es más alto). */
	private appHeaderBottom(): number {
		const header = document.querySelector('header.intranet-header');
		const bottom = header?.getBoundingClientRect().bottom ?? 0;
		return bottom > 0 ? Math.round(bottom) : AyudaQaComponent.APP_HEADER_FALLBACK_PX;
	}
	// #endregion

	ngOnInit(): void {
		this.facade.init();
	}

	ngAfterViewInit(): void {
		const el = this.headerEl()?.nativeElement;
		if (!el || typeof IntersectionObserver === 'undefined') return;

		let observer: IntersectionObserver | null = null;
		const observe = (): void => {
			const top = this.appHeaderBottom();
			this.host.nativeElement.style.setProperty('--ayuda-sticky-top', `${top}px`);
			observer?.disconnect();
			observer = new IntersectionObserver(
				([entry]) =>
					this.headerGone.set(!entry.isIntersecting && entry.boundingClientRect.top < 0),
				{ rootMargin: `-${top}px 0px 0px 0px` },
			);
			observer.observe(el);
		};
		observe();

		window.addEventListener('resize', observe);
		this.destroyRef.onDestroy(() => {
			window.removeEventListener('resize', observe);
			observer?.disconnect();
		});
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

	onVoted(faqId: number, vote: { util: boolean; motivo: FaqMotivo | null }): void {
		this.facade.vote(faqId, vote.util, vote.motivo);
	}

	/** «No útil» → ticket con la pregunta citada (el formulario la precarga desde `?descripcion=`). */
	onFaqTicketRequested(faq: FaqDto): void {
		void this.router.navigate(['../ticket'], {
			relativeTo: this.route,
			queryParams: {
				descripcion: `Consulta sobre la pregunta frecuente «${faq.pregunta}»: la respuesta no me resolvió el problema.`,
			},
		});
	}
	// #endregion

	// #region Atajos de lista
	@HostListener('document:keydown', ['$event'])
	onKeydown(event: KeyboardEvent): void {
		if (event.ctrlKey || event.metaKey || event.altKey) return;

		if (event.key === 'Escape' && this.detailOpen()) {
			this.onFaqSelected(null);
			return;
		}

		if (event.key === '/' && !this.isTypingTarget(event.target)) {
			event.preventDefault();
			if (this.stickyBarOn()) this.stickyBar()?.focusSearch();
			else this.header()?.focusSearch();
		}
	}

	private isTypingTarget(target: EventTarget | null): boolean {
		const el = target as HTMLElement | null;
		if (!el) return false;
		return el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable;
	}
	// #endregion
}
