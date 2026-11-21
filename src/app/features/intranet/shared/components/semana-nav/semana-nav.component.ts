import {
	ChangeDetectionStrategy,
	Component,
	ElementRef,
	computed,
	effect,
	inject,
	input,
	output,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import type { ContenidoSemanasLayout } from '@core/services/storage';

export type SemanaNavEstado = 'actual' | 'pasada' | 'proxima';

/** Lo mínimo que la navegación necesita saber de una semana; el contenido lo proyecta el padre. */
export interface SemanaNavItem {
	id: number;
	numero: number;
	titulo: string | null;
	fechaInicio: string | null;
	fechaFin: string | null;
	estado: SemanaNavEstado;
	archivos: number;
	/** Tareas y actividades (sin exámenes). */
	tareas: number;
	examenes: number;
	/** Próxima fecha límite aún vigente (ISO) o `null`. */
	proximaFecha: string | null;
	borrador: boolean;
}

/**
 * Navegación de semanas de la pestaña Contenido, con dos vistas que el usuario elige:
 *
 * - `list`: riel con todas las semanas a la izquierda y el detalle a la derecha (escala a cursos largos).
 * - `strip`: tira horizontal con puntos por tipo de contenido y la semana como agenda debajo.
 *
 * Muestra una sola semana a la vez: el contenido de la semana activa se proyecta con `<ng-content>`
 * y lo renderiza el padre (profesor edita, estudiante entrega).
 */
@Component({
	selector: 'app-semana-nav',
	standalone: true,
	imports: [DatePipe],
	changeDetection: ChangeDetectionStrategy.OnPush,
	styleUrl: './semana-nav.component.scss',
	templateUrl: './semana-nav.component.html',
})
export class SemanaNavComponent {
	private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

	readonly items = input.required<readonly SemanaNavItem[]>();
	readonly activeId = input<number | null>(null);
	readonly layout = input<ContenidoSemanasLayout>('list');
	/** Prefijo de los `data-info-anchor`. */
	readonly anchorPrefix = input.required<string>();

	readonly selectWeek = output<number>();
	readonly layoutChange = output<ContenidoSemanasLayout>();

	protected readonly activeIndex = computed(() => this.items().findIndex((i) => i.id === this.activeId()));
	protected readonly active = computed(() => this.items()[this.activeIndex()] ?? null);
	protected readonly prev = computed(() => this.items()[this.activeIndex() - 1] ?? null);
	protected readonly next = computed(() => this.items()[this.activeIndex() + 1] ?? null);

	constructor() {
		// Mantiene a la vista la semana activa dentro del riel/tira (que scrollean por su cuenta).
		effect(() => {
			this.activeId();
			this.layout();
			setTimeout(() => {
				this.host.nativeElement
					.querySelector('[aria-current="true"]')
					?.scrollIntoView?.({ block: 'nearest', inline: 'center' });
			});
		});
	}

	protected estadoLabel(estado: SemanaNavEstado): string {
		return estado === 'actual' ? 'En curso' : estado === 'pasada' ? 'Terminada' : 'Próxima';
	}

	protected urgente(fecha: string | null): boolean {
		return !!fecha && new Date(fecha).getTime() - Date.now() <= 2 * 86_400_000;
	}

	protected goPrev(): void {
		const p = this.prev();
		if (p) this.selectWeek.emit(p.id);
	}

	protected goNext(): void {
		const n = this.next();
		if (n) this.selectWeek.emit(n.id);
	}
}
