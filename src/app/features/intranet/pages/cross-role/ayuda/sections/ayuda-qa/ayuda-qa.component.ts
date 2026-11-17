// #region Imports
import {
	AfterViewInit,
	ApplicationRef,
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
 * Sección QA: cabecera de dos estados + lista/detalle que se alternan a ancho completo (pantallas separadas
 * en todos los anchos; la cabecera y la lista se ocultan mientras se lee la respuesta). El BE ya filtra por capability — este componente no reimplementa el
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
	private readonly appRef = inject(ApplicationRef);
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

	/** Última pregunta abierta: al volver a la lista sigue marcada y recibe el foco, aunque la selección ya sea `null`. */
	readonly lastOpenedId = signal<number | null>(null);
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

	/**
	 * Lista y detalle se alternan a ancho completo: al abrir una pregunta se sube al inicio de la sección, y al
	 * volver la lista reaparece en el mismo punto (sin esto el scroll queda donde estaba el detalle).
	 */
	private readonly restoreScrollAndFocus = effect(() => {
		const id = this.selectedId();
		untracked(() => {
			if (id !== null) {
				this.lastOpenedId.set(id);
				this.host.nativeElement.scrollIntoView?.({ block: 'start' });
				return;
			}
			if (this.lastOpenedId() === null) return;
			requestAnimationFrame(() => this.revealLastOpened());
		});
	});

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
		const navigate = (): Promise<boolean> =>
			this.router.navigate([], {
				relativeTo: this.route,
				queryParams: { [FAQ_QUERY_PARAM]: id },
				queryParamsHandling: 'merge',
			});

		const root = document.documentElement;
		const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
		if (typeof document.startViewTransition !== 'function' || reduceMotion) {
			void navigate();
			return;
		}

		// Elemento compartido: la pregunta de la lista (si se abre desde ella) viaja hasta el título del detalle.
		const source =
			id === null ? null : this.host.nativeElement.querySelector<HTMLElement>(`[data-faq-id="${id}"] .faq-item__pregunta`);
		if (source) source.style.viewTransitionName = 'faq-q';

		root.classList.add('faq-vt');
		const transition = document.startViewTransition(async () => {
			await navigate();
			this.appRef.tick(); // vuelca URL → selección → DOM antes de que el navegador capture el estado nuevo
			if (id === null) this.revealLastOpened(); // al volver, la fila ya está en su sitio y el título aterriza en ella
			const target = this.host.nativeElement.querySelector<HTMLElement>('.faq-item--on .faq-item__pregunta');
			if (id === null && target) target.style.viewTransitionName = 'faq-q';
		});
		void transition.finished.finally(() => {
			root.classList.remove('faq-vt');
			this.host.nativeElement
				.querySelectorAll<HTMLElement>('.faq-item__pregunta')
				.forEach((el) => el.style.removeProperty('view-transition-name'));
		});
	}

	/** Deja a la vista la última pregunta abierta y le devuelve el foco (al volver del detalle). */
	private revealLastOpened(): void {
		const item = this.host.nativeElement.querySelector<HTMLElement>('.faq-item--on');
		item?.scrollIntoView?.({ block: 'center' });
		item?.focus({ preventScroll: true });
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
