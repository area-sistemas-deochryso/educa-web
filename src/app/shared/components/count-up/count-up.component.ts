import { ChangeDetectionStrategy, Component, DestroyRef, computed, effect, inject, input, signal, untracked } from '@angular/core';

/** Cuadro de la animación: ~60 fps sin depender de `requestAnimationFrame` (fake timers en tests). */
const FRAME_MS = 16;
/** Respaldo si el token `--motion-slow*` no se puede leer. */
const FALLBACK_DURATION_MS = 600;
/** El conteo es más largo que un movimiento de UI: múltiplo del token `--motion-slow`. */
const DURATION_FACTOR = 3;

/**
 * Contador que sube hasta su valor final. Solo anima números (`number`); un texto («95 %», «S/ 1,200»)
 * se muestra tal cual. Arranca en 0 al primer render y, ante un cambio, parte del valor anterior.
 * Accesibilidad: el valor final queda siempre en el DOM para lectores (`count-up__final`); la cifra
 * intermedia es solo visual (`aria-hidden`). Con `prefers-reduced-motion` muestra el valor final al instante.
 */
@Component({
	selector: 'app-count-up',
	standalone: true,
	changeDetection: ChangeDetectionStrategy.OnPush,
	template: `
		@if (animatable()) {
			<span aria-hidden="true">{{ shown() }}</span>
			<span class="count-up__final">{{ value() }}</span>
		} @else {
			{{ value() }}
		}
	`,
	styleUrl: './count-up.component.scss',
})
export class CountUpComponent {
	readonly value = input.required<number | string>();

	private readonly current = signal(0);
	private timer: ReturnType<typeof setTimeout> | null = null;
	private lastTarget: number | null = null;

	/** Solo los enteros se interpolan; decimales o texto se muestran sin animar. */
	readonly animatable = computed(() => typeof this.value() === 'number' && Number.isInteger(this.value()));
	readonly shown = computed(() => Math.round(this.current()));

	constructor() {
		inject(DestroyRef).onDestroy(() => this.stop());

		effect(() => {
			const value = this.value();
			untracked(() => this.run(value));
		});
	}

	private run(value: number | string): void {
		this.stop();
		if (typeof value !== 'number' || !Number.isInteger(value)) {
			this.lastTarget = null;
			return;
		}

		const from = this.lastTarget ?? 0;
		this.lastTarget = value;
		const duration = this.duration();
		if (from === value || duration <= 0 || this.prefersReducedMotion()) {
			this.current.set(value);
			return;
		}

		this.current.set(from);
		const start = Date.now();
		const step = (): void => {
			const progress = Math.min((Date.now() - start) / duration, 1);
			const eased = 1 - Math.pow(1 - progress, 3);
			this.current.set(from + (value - from) * eased);
			this.timer = progress < 1 ? setTimeout(step, FRAME_MS) : null;
		};
		step();
	}

	private stop(): void {
		if (this.timer === null) return;
		clearTimeout(this.timer);
		this.timer = null;
	}

	private duration(): number {
		if (typeof document === 'undefined') return 0;
		const raw = getComputedStyle(document.documentElement).getPropertyValue('--motion-slow').trim();
		const ms = raw.endsWith('ms') ? Number.parseFloat(raw) : Number.NaN;
		return (Number.isFinite(ms) ? ms : FALLBACK_DURATION_MS / DURATION_FACTOR) * DURATION_FACTOR;
	}

	private prefersReducedMotion(): boolean {
		return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
	}
}
