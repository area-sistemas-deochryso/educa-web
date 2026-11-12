// #region Imports
import { DestroyRef, Injectable, inject, signal, computed } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, catchError, debounceTime, distinctUntilChanged, of } from 'rxjs';

import { AuthService } from '@core/services';
import { logger } from '@core/helpers';

import { FaqDto } from '@features/intranet/pages/cross-role/ayuda/models/faq.models';
import { FaqService } from '@features/intranet/pages/cross-role/ayuda/services/faq.service';
// #endregion

/**
 * Estado + carga de la sección QA. Scoped al componente (no `providedIn: 'root'`)
 * para que el filtro/búsqueda se reinicie cada vez que se entra a la sección.
 *
 * No hay endpoint dedicado para listar categorías (confirmado al leer
 * `Educa.API/Controllers/Ayuda/FaqController.cs` — solo `GET /api/faq` y el CRUD
 * admin). Las categorías se derivan client-side de un fetch inicial sin filtros.
 */
@Injectable()
export class AyudaQaFacade {
	// #region Dependencies
	private readonly faqService = inject(FaqService);
	private readonly destroyRef = inject(DestroyRef);
	private readonly searchTrigger$ = new Subject<string>();
	// #endregion

	// #region State
	private readonly _faqs = signal<FaqDto[]>([]);
	private readonly _categorias = signal<string[]>([]);
	private readonly _categoria = signal<string | null>(null);
	private readonly _searchTerm = signal('');
	private readonly _modoVista = signal<'para-ti' | 'todas'>('todas');
	private readonly _loading = signal(false);
	private readonly _error = signal(false);

	private readonly authService = inject(AuthService);

	readonly rolUsuario = computed(() => this.authService.currentUser?.rol);

	readonly categoriasPermitidas = computed(() => {
		const rol = this.rolUsuario();
		switch (rol) {
			case 'Estudiante': return ['Estudiante', 'Común'];
			case 'Profesor': return ['Profesor', 'Común'];
			default: return ['Asistente Administrativo', 'Común'];
		}
	});

	readonly faqsFiltradas = computed(() => {
		let resultado = this._faqs();
		const cat = this._categoria();
		if (cat) resultado = resultado.filter((f) => f.categoria === cat);
		const term = this._searchTerm();
		if (term) {
			const t = term.toLowerCase();
			resultado = resultado.filter(
				(f) => f.pregunta.toLowerCase().includes(t) || f.respuesta.toLowerCase().includes(t),
			);
		}
		if (this._modoVista() === 'para-ti') {
			const permitidas = this.categoriasPermitidas();
			resultado = resultado.filter((f) => permitidas.includes(f.categoria ?? 'Común'));
		}
		return resultado;
	});

	readonly faqs = this.faqsFiltradas;
	readonly categorias = this._categorias.asReadonly();
	readonly categoria = this._categoria.asReadonly();
	readonly searchTerm = this._searchTerm.asReadonly();
	readonly modoVista = this._modoVista.asReadonly();
	readonly loading = this._loading.asReadonly();
	readonly error = this._error.asReadonly();
	// #endregion

	constructor() {
		this.setupSearchPipeline();
	}

	// #region Commands
	init(): void {
		this.loadCategorias();
		this.loadFaqs();
	}

	setCategoria(categoria: string | null): void {
		this._categoria.set(categoria);
		this.loadFaqs();
	}

	setModoVista(modo: 'para-ti' | 'todas'): void {
		this._modoVista.set(modo);
	}

	/** Búsqueda de texto libre con debounce vía Subject — mismo patrón que `UsersDataFacade`. */
	setSearchTerm(term: string): void {
		this._searchTerm.set(term);
		this.searchTrigger$.next(term);
	}
	// #endregion

	// #region Private helpers
	private loadCategorias(): void {
		this.faqService
			.getFaqs()
			.pipe(
				catchError((err) => {
					logger.warn('[AyudaQaFacade] Error cargando categorías', err?.status);
					return of([] as FaqDto[]);
				}),
				takeUntilDestroyed(this.destroyRef),
			)
			.subscribe((faqs) => {
				const unique = Array.from(
					new Set(faqs.map((f) => f.categoria).filter((c): c is string => !!c)),
				);
				unique.sort((a, b) => a.localeCompare(b, 'es'));
				this._categorias.set(unique);
			});
	}

	private loadFaqs(): void {
		this._loading.set(true);
		this._error.set(false);

		this.faqService
			.getFaqs(this._categoria(), this._searchTerm() || null)
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
			});
	}

	private setupSearchPipeline(): void {
		this.searchTrigger$
			.pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
			.subscribe(() => this.loadFaqs());
	}
	// #endregion
}
