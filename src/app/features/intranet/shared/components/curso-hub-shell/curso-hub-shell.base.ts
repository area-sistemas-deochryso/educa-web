import { Directive, DestroyRef, OnInit, Signal, computed, effect, inject, signal, untracked } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterOutlet } from '@angular/router';
import { Observable, catchError, forkJoin, map, of } from 'rxjs';
import { EduConfirmDialog, EduConfirmationService, EduSpinner } from '@edu-ui';
import { ErrorHandlerService, WalClockService } from '@core/services';
import type { HorarioProfesorDto } from '@features/intranet/pages/profesor/models';

import { buildCursosListCommands, type CursoHubRol } from '../../helpers/curso-hub-link.helpers';
import { filterPairSlots, resolveSlot } from '../../helpers/curso-hub-slot.helpers';
import { EmptyStateComponent } from '../empty-state';
import { CursoHubHeaderComponent } from '../curso-hub-header';
import { CursoHubTabsComponent, cursoHubTabsFor } from '../curso-hub-tabs';
import { CursoHubContextService } from './curso-hub-context.service';

// #region Shared template
export const CURSO_HUB_SHELL_IMPORTS = [
	RouterOutlet,
	EduSpinner,
	EduConfirmDialog,
	EmptyStateComponent,
	CursoHubHeaderComponent,
	CursoHubTabsComponent,
];

export const CURSO_HUB_SHELL_TEMPLATE = `
	@switch (state()) {
		@case ('loading') {
			<div class="flex justify-content-center p-5">
				<edu-spinner strokeWidth="4" />
			</div>
		}
		@case ('error') {
			<app-empty-state
				icon="pi pi-exclamation-triangle"
				title="Curso"
				message="No se pudieron cargar tus cursos. Intenta de nuevo más tarde."
			/>
		}
		@case ('ready') {
			@if (slot(); as current) {
				<app-curso-hub-header
					[cursoNombre]="current.cursoNombre"
					[salonDescripcion]="current.salonDescripcion"
					[slots]="pairSlots()"
					[selectedSlotId]="current.id"
					[resetKey]="selectionResetKey()"
					(slotChange)="onSlotChange($event)"
				/>
				<app-curso-hub-tabs [tabs]="tabs()" />
				<router-outlet />
			}
		}
	}
	<edu-confirm-dialog />
`;
// #endregion

type CursoHubState = 'loading' | 'error' | 'ready';

function parseId(raw: string | null): number {
	const value = Number(raw);
	return Number.isInteger(value) && value > 0 ? value : Number.NaN;
}

/**
 * Lógica común de los shells del hub de curso (profesor y estudiante):
 * espera a que carguen los horarios, valida el par (curso, salón), resuelve la
 * franja (query válido → única con contenido → en curso → siguiente futura) y
 * emite los avisos de par/franja inválidos. Cada rol aporta solo su fuente de
 * horarios y su sonda de contenido.
 */
@Directive()
export abstract class CursoHubShellBase implements OnInit {
	// #region Dependencias
	private readonly route = inject(ActivatedRoute);
	private readonly router = inject(Router);
	private readonly errorHandler = inject(ErrorHandlerService);
	private readonly clock = inject(WalClockService);
	private readonly destroyRef = inject(DestroyRef);
	private readonly hubContext = inject(CursoHubContextService);
	private readonly confirmation = inject(EduConfirmationService);
	// #endregion

	// #region Contrato por rol
	protected abstract readonly rol: CursoHubRol;
	protected abstract readonly horarios: Signal<readonly HorarioProfesorDto[]>;
	protected abstract readonly loading: Signal<boolean>;
	protected abstract readonly loadError: Signal<string | null>;
	protected abstract loadHorarios(): void;
	/** Contenido de la franja (`null` si todavía no existe). Solo se usa como sonda. */
	protected abstract probeContenido(horarioId: number): Observable<unknown | null>;
	/** Si hay datos del rol editados sin guardar; avisa antes de cambiar de franja. Por defecto no hay. */
	protected hasUnsavedChanges(): boolean {
		return false;
	}
	// #endregion

	// #region Estado de ruta
	private readonly params = toSignal(this.route.paramMap, { requireSync: true });
	private readonly query = toSignal(this.route.queryParamMap, { requireSync: true });

	private readonly cursoId = computed(() => parseId(this.params().get('cursoId')));
	private readonly salonId = computed(() => parseId(this.params().get('salonId')));
	private readonly pairKey = computed(() => `${this.cursoId()}-${this.salonId()}`);
	/** `null` si no vino `horarioId`; `NaN` si vino pero no es numérico. */
	private readonly requestedId = computed(() => {
		const raw = this.query().get('horarioId');
		return raw === null ? null : Number(raw);
	});
	// #endregion

	// #region Carga de horarios
	/**
	 * `true` solo cuando los horarios realmente cargaron (o ya estaban en el
	 * store). Los stores arrancan con `loading: false` y `horarios: []`, así que
	 * "sin horarios y sin carga" NO significa "par inexistente": hasta que haya
	 * una carga observada el shell espera y nunca valida ni redirige.
	 */
	private readonly settled = signal(false);
	private sawLoading = false;
	// #endregion

	// #region Resolución
	protected readonly pairSlots = computed(() =>
		this.settled() ? filterPairSlots(this.horarios(), this.cursoId(), this.salonId()) : [],
	);

	private readonly contentProbe = signal<{ key: string; ids: ReadonlySet<number> } | null>(null);
	private probedKey: string | null = null;
	private readonly contentIds = computed(() => {
		const probe = this.contentProbe();
		return probe && probe.key === this.pairKey() ? probe.ids : null;
	});

	private readonly resolution = computed(() =>
		resolveSlot(
			this.pairSlots(),
			this.requestedId(),
			this.contentIds(),
			new Date(this.clock.adjustedNow()),
		),
	);

	protected readonly slot = computed(() => this.resolution().slot);
	protected readonly tabs = computed(() => cursoHubTabsFor(this.rol));

	private readonly failed = computed(
		() => this.settled() && !!this.loadError() && this.horarios().length === 0,
	);

	protected readonly state = computed<CursoHubState>(() => {
		if (this.failed()) return 'error';
		if (!this.settled() || this.pairSlots().length === 0) return 'loading';
		return 'ready';
	});
	// #endregion

	/** Sube cuando se bloquea un cambio de franja, para que el selector vuelva a mostrar la franja vigente. */
	protected readonly selectionResetKey = signal(0);
	private redirected = false;
	private warnedRequest: string | null = null;

	constructor() {
		// Las pestañas hijas leen la franja resuelta por este contexto (ver `CursoHubContextService`).
		this.hubContext.bind(this.slot);
		this.destroyRef.onDestroy(() => this.hubContext.unbind(this.slot));

		effect(() => {
			if (this.loading()) {
				this.sawLoading = true;
			} else if (this.sawLoading) {
				this.settled.set(true);
			}
		});

		effect(() => {
			if (!this.settled() || this.failed() || this.pairSlots().length > 0) return;
			untracked(() => this.redirectToList());
		});

		effect(() => {
			if (!this.resolution().requestedInvalid) return;
			untracked(() => this.dropInvalidSlotQuery());
		});

		effect(() => {
			const slots = this.pairSlots();
			const requested = this.requestedId();
			const hasValidRequest = requested !== null && slots.some((s) => s.id === requested);
			if (slots.length < 2 || hasValidRequest) return;
			untracked(() => this.probeContent(slots));
		});
	}

	ngOnInit(): void {
		if (this.horarios().length > 0) this.settled.set(true);
		this.loadHorarios();
	}

	protected onSlotChange(horarioId: number): void {
		if (this.hasUnsavedChanges()) {
			// El selector ya muestra la franja elegida: se revierte de inmediato y solo avanza si el usuario acepta
			// (cerrar con la X o Cancelar deja todo como estaba).
			this.selectionResetKey.update((n) => n + 1);
			this.confirmation.confirm({
				header: 'Cambios sin guardar',
				message: 'Tienes cambios sin guardar. Si cambias de franja se perderán. ¿Quieres continuar?',
				icon: 'pi pi-exclamation-triangle',
				acceptLabel: 'Sí, cambiar de franja',
				rejectLabel: 'Cancelar',
				accept: () => this.navigateToSlot(horarioId),
			});
			return;
		}
		this.navigateToSlot(horarioId);
	}

	private navigateToSlot(horarioId: number): void {
		// Sin `relativeTo`: navega a la URL actual (incluida la pestaña hija) cambiando solo el query.
		void this.router.navigate([], {
			queryParams: { horarioId },
			queryParamsHandling: 'merge',
			replaceUrl: true,
		});
	}

	// #region Efectos laterales
	private redirectToList(): void {
		if (this.redirected) return;
		this.redirected = true;
		this.errorHandler.showInfo('Curso no disponible', 'No se encontró este curso para tu usuario.');
		void this.router.navigate(buildCursosListCommands(this.rol), { replaceUrl: true });
	}

	private dropInvalidSlotQuery(): void {
		const raw = this.query().get('horarioId');
		if (raw === null || raw === this.warnedRequest) return;
		this.warnedRequest = raw;
		this.errorHandler.showWarning(
			'Franja no disponible',
			'La franja indicada no corresponde a este curso. Se muestra la franja que corresponde por horario.',
		);
		void this.router.navigate([], {
			queryParams: { horarioId: null },
			queryParamsHandling: 'merge',
			replaceUrl: true,
		});
	}

	/** No bloquea el primer pintado: el hub ya mostró la franja por horario mientras esto corre. */
	private probeContent(slots: readonly HorarioProfesorDto[]): void {
		const key = this.pairKey();
		if (this.probedKey === key) return;
		this.probedKey = key;

		forkJoin(
			slots.map((s) =>
				this.probeContenido(s.id).pipe(
					map((contenido) => contenido != null),
					catchError(() => of(false)),
				),
			),
		)
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe((flags) => {
				const ids = new Set(slots.filter((_, i) => flags[i]).map((s) => s.id));
				this.contentProbe.set({ key, ids });
			});
	}
	// #endregion
}
