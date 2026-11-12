// #region Imports
import { DestroyRef, Injectable, inject, signal, computed } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { EMPTY, catchError, of } from 'rxjs';

import { AuthService } from '@core/services';
import { logger } from '@core/helpers';

import { FaqDto, FaqMotivo, FaqVoto } from '@features/intranet/pages/cross-role/ayuda/models/faq.models';
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
const RELACIONADAS_MAX = 3;

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
	/** Votos vigentes por pregunta (`faqId`). */
	private readonly _votes = signal<Record<number, FaqVoto>>({});
	/** Ids en el orden de «más consultadas» del servidor; `null` mientras no llegó o si falló. */
	private readonly _consultadasIds = signal<number[] | null>(null);
	/** Preguntas cuya apertura ya se contó en esta visita a la sección. */
	private readonly openedIds = new Set<number>();

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

	/**
	 * «Más consultadas»: las primeras del rol según el orden del servidor. Si ese orden no llegó
	 * (falló o aún carga), se usan las primeras del rol en el orden de siempre.
	 */
	readonly populares = computed(() => {
		const permitidas = this.categoriasPermitidas();
		const visibles = this._faqs().filter((f) => permitidas.includes(f.categoria ?? 'Común'));
		const ids = this._consultadasIds();
		if (!ids) return visibles.slice(0, POPULARES_MAX);

		const posicion = new Map(ids.map((id, i) => [id, i]));
		return [...visibles]
			.sort((a, b) => (posicion.get(a.id) ?? ids.length) - (posicion.get(b.id) ?? ids.length))
			.slice(0, POPULARES_MAX);
	});

	readonly selectedFaq = computed(() => {
		const id = this._selectedId();
		return id === null ? null : (this._faqs().find((f) => f.id === id) ?? null);
	});

	/** Misma categoría que la pregunta abierta, sin ella, en el orden de la lista (máx. `RELACIONADAS_MAX`). */
	readonly relacionadas = computed(() => {
		const selected = this.selectedFaq();
		if (!selected) return [];
		return this._faqs()
			.filter((f) => f.id !== selected.id && f.categoria === selected.categoria)
			.slice(0, RELACIONADAS_MAX);
	});

	/** Voto vigente de la pregunta abierta, o `null`. */
	readonly selectedVote = computed(() => {
		const id = this._selectedId();
		return id === null ? null : (this._votes()[id] ?? null);
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
				this.trackOpening();
			});

		this.loadSecondary();
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
		this.trackOpening();
	}

	/**
	 * Guarda el voto: la UI lo refleja al instante y el envío es fire-and-forget. Si el servidor
	 * lo rechaza se descarta sin avisar (la lectura nunca depende del voto).
	 */
	vote(faqId: number, util: boolean, motivo: FaqMotivo | null = null): void {
		const voto: FaqVoto = { util, motivo: util ? null : motivo };
		this._votes.update((votes) => ({ ...votes, [faqId]: voto }));

		this.faqService
			.votar(faqId, voto.util, voto.motivo)
			.pipe(
				catchError((err) => {
					logger.warn('[AyudaQaFacade] Voto de FAQ descartado', err?.status);
					return EMPTY;
				}),
				takeUntilDestroyed(this.destroyRef),
			)
			.subscribe();
	}
	// #endregion

	// #region Private helpers
	/** Votos propios y orden de «más consultadas»: si fallan, la sección funciona igual sin ellos. */
	private loadSecondary(): void {
		this.faqService
			.misVotos()
			.pipe(
				catchError(() => of([])),
				takeUntilDestroyed(this.destroyRef),
			)
			.subscribe((votos) => {
				const porPregunta: Record<number, FaqVoto> = {};
				for (const v of votos) porPregunta[v.faqId] = { util: v.util, motivo: v.util ? null : (v.motivo ?? null) };
				// Un voto dado mientras cargaba prevalece sobre el guardado en el servidor.
				this._votes.update((actuales) => ({ ...porPregunta, ...actuales }));
			});

		this.faqService
			.getFaqsMasConsultadas()
			.pipe(
				catchError(() => of(null)),
				takeUntilDestroyed(this.destroyRef),
			)
			.subscribe((faqs) => this._consultadasIds.set(faqs ? faqs.map((f) => f.id) : null));
	}

	/** Cuenta la apertura de la pregunta elegida, una vez por pregunta y por visita a la sección. */
	private trackOpening(): void {
		const id = this._selectedId();
		if (id === null || this.openedIds.has(id)) return;
		if (!this._faqs().some((f) => f.id === id)) return;

		this.openedIds.add(id);
		this.faqService
			.registrarApertura(id)
			.pipe(
				catchError(() => EMPTY),
				takeUntilDestroyed(this.destroyRef),
			)
			.subscribe();
	}

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
