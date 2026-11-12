// #region Imports
import { DestroyRef, Injectable, inject, signal, computed } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, of } from 'rxjs';

import { AuthService } from '@core/services';
import { logger } from '@core/helpers';

import { FaqDto } from '@features/intranet/pages/cross-role/ayuda/models/faq.models';
import { FaqService } from '@features/intranet/pages/cross-role/ayuda/services/faq.service';
// #endregion

export type ModoVista = 'para-ti' | 'todas';

export interface CategoriaChip {
	/** `null` = chip «Todas». */
	value: string | null;
	count: number;
}

interface FaqFilter {
	term: string;
	categoria: string | null;
	modo: ModoVista;
}

const POPULARES_MAX = 3;

/**
 * Estado + carga de la sección QA. Scoped al componente (no `providedIn: 'root'`)
 * para que el filtro/búsqueda se reinicie cada vez que se entra a la sección.
 *
 * Una sola carga de `GET /api/faq` (el BE ya filtra por capability): búsqueda,
 * categoría y modo «Para ti / Todas» se aplican aquí con un único criterio
 * (`matches`), así los conteos de la cabecera coinciden con lo que se ve en la lista.
 * El BE busca con LIKE sobre pregunta y respuesta, igual que `matchesTerm`.
 */
@Injectable()
export class AyudaQaFacade {
	// #region Dependencies
	private readonly faqService = inject(FaqService);
	private readonly destroyRef = inject(DestroyRef);
	private readonly authService = inject(AuthService);
	// #endregion

	// #region State
	private readonly _faqs = signal<FaqDto[]>([]);
	private readonly _categoria = signal<string | null>(null);
	private readonly _searchTerm = signal('');
	private readonly _modoVista = signal<ModoVista>('todas');
	private readonly _selectedId = signal<number | null>(null);
	private readonly _loading = signal(false);
	private readonly _error = signal(false);

	readonly rolUsuario = computed(() => this.authService.currentUser?.rol);

	readonly categoriasPermitidas = computed(() => {
		const rol = this.rolUsuario();
		switch (rol) {
			case 'Estudiante': return ['Estudiante', 'Común'];
			case 'Profesor': return ['Profesor', 'Común'];
			default: return ['Asistente Administrativo', 'Común'];
		}
	});

	private readonly filter = computed<FaqFilter>(() => ({
		term: this._searchTerm().trim().toLowerCase(),
		categoria: this._categoria(),
		modo: this._modoVista(),
	}));

	/** Lista visible: aplica búsqueda, categoría y modo. */
	readonly faqs = computed(() => {
		const filter = this.filter();
		return this._faqs().filter((f) => this.matches(f, filter));
	});

	/** Conteo de cada modo con el mismo criterio de la lista (misma búsqueda y categoría). */
	readonly paraTiCount = computed(() => this.countWith({ modo: 'para-ti' }));
	readonly todasCount = computed(() => this.countWith({ modo: 'todas' }));

	/** Chips de categoría: «Todas» + cada categoría con resultados en el modo y la búsqueda actuales. */
	readonly categoriaChips = computed<CategoriaChip[]>(() => {
		const activa = this._categoria();
		const categorias = Array.from(
			new Set(this._faqs().map((f) => f.categoria).filter((c): c is string => !!c)),
		).sort((a, b) => a.localeCompare(b, 'es'));

		const chips = categorias
			.map((value) => ({ value, count: this.countWith({ categoria: value }) }))
			.filter((chip) => chip.count > 0 || chip.value === activa);

		return [{ value: null, count: this.countWith({ categoria: null }) }, ...chips];
	});

	/** Estado inicial (buscador grande) mientras no se escriba ni se filtre por categoría. */
	readonly isFiltering = computed(
		() => this._searchTerm().trim() !== '' || this._categoria() !== null,
	);

	/** Sustituto de «más consultadas» hasta F6: primeras preguntas del rol. */
	readonly populares = computed(() => {
		const permitidas = this.categoriasPermitidas();
		return this._faqs()
			.filter((f) => permitidas.includes(f.categoria ?? 'Común'))
			.slice(0, POPULARES_MAX);
	});

	readonly selectedFaq = computed(() => {
		const id = this._selectedId();
		return id === null ? null : (this._faqs().find((f) => f.id === id) ?? null);
	});

	readonly categoria = this._categoria.asReadonly();
	readonly searchTerm = this._searchTerm.asReadonly();
	readonly modoVista = this._modoVista.asReadonly();
	readonly selectedId = this._selectedId.asReadonly();
	readonly loading = this._loading.asReadonly();
	readonly error = this._error.asReadonly();
	// #endregion

	// #region Commands
	init(): void {
		this._loading.set(true);
		this._error.set(false);

		this.faqService
			.getFaqs()
			.pipe(
				catchError((err) => {
					logger.warn('[AyudaQaFacade] Error cargando FAQ', err?.status);
					this._error.set(true);
					return of([] as FaqDto[]);
				}),
				takeUntilDestroyed(this.destroyRef),
			)
			.subscribe((faqs) => {
				this._faqs.set(faqs);
				this._loading.set(false);
				this.revealSelected();
			});
	}

	setCategoria(categoria: string | null): void {
		this._categoria.set(categoria);
	}

	setModoVista(modo: ModoVista): void {
		this._modoVista.set(modo);
	}

	setSearchTerm(term: string): void {
		this._searchTerm.set(term);
	}

	clearFilters(): void {
		this._searchTerm.set('');
		this._categoria.set(null);
	}

	/** Selecciona una pregunta (o `null` para volver a la lista). Si los filtros la ocultan, los limpia. */
	select(id: number | null): void {
		this._selectedId.set(id);
		this.revealSelected();
	}
	// #endregion

	// #region Private helpers
	/** Una pregunta elegida por enlace directo debe verse en la lista aunque haya filtros activos. */
	private revealSelected(): void {
		const id = this._selectedId();
		if (id === null) return;
		if (!this._faqs().some((f) => f.id === id)) return;
		if (this.faqs().some((f) => f.id === id)) return;

		this.clearFilters();
		this._modoVista.set('todas');
	}

	private countWith(override: Partial<FaqFilter>): number {
		const filter = { ...this.filter(), ...override };
		return this._faqs().filter((f) => this.matches(f, filter)).length;
	}

	private matches(faq: FaqDto, filter: FaqFilter): boolean {
		if (filter.categoria && faq.categoria !== filter.categoria) return false;
		if (filter.term && !this.matchesTerm(faq, filter.term)) return false;
		if (filter.modo === 'para-ti' && !this.categoriasPermitidas().includes(faq.categoria ?? 'Común')) {
			return false;
		}
		return true;
	}

	private matchesTerm(faq: FaqDto, term: string): boolean {
		return faq.pregunta.toLowerCase().includes(term) || faq.respuesta.toLowerCase().includes(term);
	}
	// #endregion
}
