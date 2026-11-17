import {
	ChangeDetectionStrategy,
	Component,
	ElementRef,
	computed,
	effect,
	inject,
	input,
	signal,
	untracked,
} from '@angular/core';

import { FaqWizardDto } from '@features/intranet/pages/cross-role/ayuda/models/faq.models';
import { StorageService } from '@core/services';
import { deriveStepTitle, estimateMinutes, sanitizeGuideProgress } from '../../helpers/faq-guide';

/**
 * Guía paso a paso como checklist dentro del detalle (sin modal): un indicador de progreso,
 * título por paso derivado del texto, captura opcional y avance recordado en el navegador.
 * Cada paso se identifica por su posición: `orden` puede repetirse en los datos.
 * ↑↓ mueven entre pasos; Enter o espacio marcan el paso enfocado (es un `<button>`).
 * Al marcar un paso el siguiente pasa a ser el actual y se le hace scroll; el progreso va pegado arriba
 * (con anterior/siguiente) y en escritorio hay un índice lateral de pasos.
 */
@Component({
	selector: 'app-faq-guide',
	standalone: true,
	templateUrl: './faq-guide.component.html',
	styleUrl: './faq-guide.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
	host: { '(keydown)': 'onKeydown($event)' },
})
export class FaqGuideComponent {
	private readonly storage = inject(StorageService);
	private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

	readonly faqId = input.required<number>();
	readonly wizard = input.required<FaqWizardDto>();

	private readonly done = signal<ReadonlySet<number>>(new Set());
	private readonly currentIndex = signal<number | null>(null);

	/** Último paso marcado por la persona (no al cargar): solo ese hace la animación del check. */
	readonly justDone = signal<number | null>(null);
	/** `true` si la persona acaba de completar la guía (no al reabrir una ya completa): dispara la celebración. */
	readonly celebrate = signal(false);

	readonly steps = computed(() =>
		this.wizard().pasos.map((paso, index) => ({
			index,
			title: paso.titulo?.trim() || deriveStepTitle(paso.texto),
			texto: paso.texto,
			imagenUrl: paso.imagenUrl,
			done: this.done().has(index),
		})),
	);
	readonly total = computed(() => this.steps().length);
	readonly doneCount = computed(() => this.steps().filter((s) => s.done).length);
	readonly percent = computed(() => (this.total() === 0 ? 0 : Math.round((this.doneCount() / this.total()) * 100)));
	readonly minutes = computed(() => estimateMinutes(this.total()));
	readonly finished = computed(() => this.total() > 0 && this.doneCount() === this.total());

	/** Paso resaltado: el último trabajado o, si no hay, el primero pendiente. */
	readonly current = computed(() => {
		const stored = this.currentIndex();
		const steps = this.steps();
		if (stored !== null && steps.some((s) => s.index === stored)) return stored;
		return steps.find((s) => !s.done)?.index ?? null;
	});

	readonly currentStep = computed(() => this.steps().find((s) => s.index === this.current()) ?? null);
	readonly hasPrev = computed(() => (this.current() ?? 0) > 0);
	readonly hasNext = computed(() => {
		const current = this.current();
		return current !== null && current < this.total() - 1;
	});

	/** Al cambiar de pregunta se carga su avance guardado. */
	private readonly loadProgress = effect(() => {
		const faqId = this.faqId();
		untracked(() => {
			const saved = sanitizeGuideProgress(this.storage.getAyudaGuideProgress(faqId));
			this.done.set(new Set(saved.done));
			this.currentIndex.set(saved.current);
			this.justDone.set(null);
			this.celebrate.set(false);
		});
	});

	toggle(index: number): void {
		const marking = !this.done().has(index);
		this.done.update((current) => {
			const next = new Set(current);
			if (!next.delete(index)) next.add(index);
			return next;
		});
		this.currentIndex.set(index);
		this.justDone.set(marking ? index : null);
		this.celebrate.set(marking && this.finished());

		// Auto-avance: solo al paso inmediato y si sigue pendiente, para no mover a quien marca a destiempo.
		const next = index + 1;
		if (marking && next < this.total() && !this.done().has(next)) {
			this.currentIndex.set(next);
			this.scrollToStep(next);
		}
		this.persist();
	}

	/** Lleva a un paso (índice, anterior/siguiente): lo deja actual, con foco y a la vista. */
	goTo(index: number): void {
		if (index < 0 || index >= this.total()) return;
		this.currentIndex.set(index);
		this.persist();
		this.scrollToStep(index);
		this.stepButtons()[index]?.focus({ preventScroll: true });
	}

	goPrev(): void {
		this.goTo((this.current() ?? 0) - 1);
	}

	goNext(): void {
		this.goTo((this.current() ?? -1) + 1);
	}

	onStepFocus(index: number): void {
		if (this.currentIndex() === index) return;
		this.currentIndex.set(index);
		this.persist();
	}

	onKeydown(event: KeyboardEvent): void {
		if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
		const buttons = this.stepButtons();
		const index = buttons.findIndex((b) => b === document.activeElement);
		if (index === -1) return;
		event.preventDefault();
		buttons[index + (event.key === 'ArrowDown' ? 1 : -1)]?.focus();
	}

	private stepButtons(): HTMLButtonElement[] {
		return Array.from(this.host.nativeElement.querySelectorAll<HTMLButtonElement>('.faq-guide__check'));
	}

	/** El `scroll-margin-top` del paso deja libre el progreso pegado; sin animación si la persona pidió menos movimiento. */
	private scrollToStep(index: number): void {
		const step = this.host.nativeElement.querySelectorAll<HTMLElement>('.faq-guide__step')[index];
		const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
		step?.scrollIntoView?.({ block: 'start', behavior: reduceMotion ? 'auto' : 'smooth' });
	}

	private persist(): void {
		this.storage.setAyudaGuideProgress(this.faqId(), { done: [...this.done()], current: this.currentIndex() });
	}
}
