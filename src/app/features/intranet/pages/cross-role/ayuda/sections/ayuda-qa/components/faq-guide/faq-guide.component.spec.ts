import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { FaqWizardDto, GuideProgress } from '@features/intranet/pages/cross-role/ayuda/models/faq.models';
import { FaqGuideComponent } from './faq-guide.component';

const WIZARD: FaqWizardDto = {
	titulo: 'Registrar',
	pasos: [
		{ orden: 1, texto: 'Abre el menú. Elige Asistencias.', imagenUrl: null },
		{ orden: 2, texto: 'Marca a cada estudiante.', imagenUrl: 'https://cdn.test/paso2.png' },
		{ orden: 3, texto: 'Guarda los cambios.', imagenUrl: null },
	],
};

describe('FaqGuideComponent', () => {
	let fixture: ComponentFixture<FaqGuideComponent>;
	let emitted: GuideProgress[];

	function create(faqId = 7, progress: GuideProgress | null = null): void {
		fixture = TestBed.createComponent(FaqGuideComponent);
		fixture.componentRef.setInput('faqId', faqId);
		fixture.componentRef.setInput('wizard', WIZARD);
		fixture.componentRef.setInput('progress', progress);
		emitted = [];
		fixture.componentInstance.progressChange.subscribe((p) => emitted.push(p));
		fixture.detectChanges();
	}

	function checks(): HTMLButtonElement[] {
		return fixture.debugElement.queryAll(By.css('.faq-guide__check')).map((d) => d.nativeElement);
	}

	function text(selector: string): string {
		return fixture.debugElement.query(By.css(selector)).nativeElement.textContent.replace(/\s+/g, ' ').trim();
	}

	beforeEach(() => {
		TestBed.configureTestingModule({ imports: [FaqGuideComponent] });
	});

	it('muestra título por paso, un único indicador de progreso y el tiempo estimado', () => {
		create();

		expect(fixture.debugElement.queryAll(By.css('.faq-guide__step-title')).map((d) => d.nativeElement.textContent.trim())).toEqual(['Abre el menú', 'Marca a cada estudiante', 'Guarda los cambios']);
		expect(fixture.debugElement.queryAll(By.css('[role="progressbar"]')).length).toBe(1);
		expect(text('.faq-guide__count')).toBe('0 de 3 pasos');
		expect(text('.faq-guide__meta')).toContain('unos 3 min');
	});

	it('muestra la captura solo en el paso que la tiene', () => {
		create();

		const images = fixture.debugElement.queryAll(By.css('.faq-guide__image'));

		expect(images.length).toBe(1);
		expect(images[0].nativeElement.getAttribute('src')).toBe('https://cdn.test/paso2.png');
	});

	it('marcar un paso actualiza el progreso y lo emite para que se guarde', () => {
		create();
		checks()[0].click();
		fixture.detectChanges();

		expect(text('.faq-guide__count')).toBe('1 de 3 pasos');
		expect(checks()[0].getAttribute('aria-pressed')).toBe('true');
		expect(emitted.at(-1)).toEqual({ done: [0], current: 1 });
	});

	it('abre con el avance recibido y recuerda el último paso trabajado', () => {
		create(7, { done: [0, 2], current: 2 });

		expect(text('.faq-guide__count')).toBe('2 de 3 pasos');
		expect(checks()[0].getAttribute('aria-pressed')).toBe('true');
		expect(checks()[1].getAttribute('aria-pressed')).toBe('false');
		expect(checks()[2].getAttribute('aria-current')).toBe('step');
	});

	it('sin avance recibido arranca vacía y sin emitir nada', () => {
		create();

		expect(text('.faq-guide__count')).toBe('0 de 3 pasos');
		expect(emitted).toEqual([]);
	});

	it('recorta el avance guardado a los pasos que tiene hoy la guía', () => {
		create(7, { done: [1, 5, -1, 1], current: 9 });

		expect(text('.faq-guide__count')).toBe('1 de 3 pasos');
		expect(checks()[1].getAttribute('aria-pressed')).toBe('true');
		expect(checks()[0].getAttribute('aria-current')).toBe('step'); // `current` fuera de rango → primer pendiente
	});

	it('«Reiniciar guía» solo aparece con avance, vuelve a cero y emite el estado vacío', () => {
		create();
		expect(fixture.debugElement.query(By.css('.faq-guide__reset'))).toBeNull();

		fixture.destroy();
		create(7, { done: [0, 1], current: 1 });
		(fixture.debugElement.query(By.css('.faq-guide__reset')).nativeElement as HTMLButtonElement).click();
		fixture.detectChanges();

		expect(text('.faq-guide__count')).toBe('0 de 3 pasos');
		expect(checks().every((b) => b.getAttribute('aria-pressed') === 'false')).toBe(true);
		expect(fixture.debugElement.query(By.css('.faq-guide__reset'))).toBeNull();
		expect(emitted.at(-1)).toEqual({ done: [], current: null });
	});

	it('una guía en curso se abre con su paso actual a la vista; una sin avance o terminada, no', async () => {
		const scrollIntoView = vi.fn();
		Element.prototype.scrollIntoView = scrollIntoView;

		create(7, { done: [0], current: 1 });
		await fixture.whenStable();
		expect(scrollIntoView).toHaveBeenCalledTimes(1);

		scrollIntoView.mockClear();
		fixture.destroy();
		create(7, null);
		await fixture.whenStable();
		fixture.destroy();
		create(7, { done: [0, 1, 2], current: 2 });
		await fixture.whenStable();
		expect(scrollIntoView).not.toHaveBeenCalled();
	});

	it('al marcar un paso el siguiente pendiente pasa a ser el actual', () => {
		create();

		checks()[0].click();
		fixture.detectChanges();

		expect(checks()[1].getAttribute('aria-current')).toBe('step');
		expect(text('.faq-guide__now')).toContain('Paso 2: Marca a cada estudiante');
	});

	it('no avanza al desmarcar ni si el siguiente ya estaba hecho', () => {
		create();
		checks()[1].click(); // paso 2 hecho → actual: paso 3
		checks()[0].click(); // paso 1: el siguiente (2) ya está hecho → se queda en 1
		fixture.detectChanges();
		expect(checks()[0].getAttribute('aria-current')).toBe('step');

		checks()[0].click(); // desmarcar
		fixture.detectChanges();
		expect(checks()[0].getAttribute('aria-current')).toBe('step');
	});

	it('el índice y anterior/siguiente llevan a un paso sin marcarlo', () => {
		create();
		const indexItems = fixture.debugElement.queryAll(By.css('.faq-guide__index-item')).map((d) => d.nativeElement as HTMLButtonElement);
		expect(indexItems.length).toBe(3);

		indexItems[2].click();
		fixture.detectChanges();
		expect(checks()[2].getAttribute('aria-current')).toBe('step');
		expect(text('.faq-guide__count')).toBe('0 de 3 pasos');

		const [prev, next] = fixture.debugElement.queryAll(By.css('.faq-guide__nav-btn')).map((d) => d.nativeElement as HTMLButtonElement);
		expect(next.disabled).toBe(true);
		prev.click();
		fixture.detectChanges();
		expect(checks()[1].getAttribute('aria-current')).toBe('step');
	});

	it('celebra solo cuando la persona completa la guía, no al reabrir una ya completa', () => {
		create();
		checks().forEach((b) => b.click());
		fixture.detectChanges();
		expect(fixture.debugElement.query(By.css('.faq-guide--celebrate'))).not.toBeNull();
		expect(emitted.at(-1)?.done).toEqual([0, 1, 2]);
		fixture.destroy();

		create(7, { done: [0, 1, 2], current: 2 });

		expect(text('.faq-guide__count')).toBe('¡Guía completa!');
		expect(fixture.debugElement.query(By.css('.faq-guide--celebrate'))).toBeNull();
	});

	it('al completar todos los pasos lo indica', () => {
		create();
		checks().forEach((b) => b.click());
		fixture.detectChanges();

		expect(text('.faq-guide__count')).toBe('¡Guía completa!');
	});

	it('↑↓ mueven el foco entre pasos', () => {
		create();
		const buttons = checks();
		buttons[0].focus();

		buttons[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
		expect(document.activeElement).toBe(buttons[1]);

		buttons[1].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));
		expect(document.activeElement).toBe(buttons[0]);
	});

	it('marca un solo paso aunque el `orden` de los datos se repita', () => {
		fixture = TestBed.createComponent(FaqGuideComponent);
		fixture.componentRef.setInput('faqId', 9);
		fixture.componentRef.setInput('wizard', {
			titulo: null,
			pasos: [
				{ orden: 0, texto: 'Primero.', imagenUrl: null },
				{ orden: 0, texto: 'Segundo.', imagenUrl: null },
			],
		});
		fixture.detectChanges();

		checks()[0].click();
		fixture.detectChanges();

		expect(text('.faq-guide__count')).toBe('1 de 2 pasos');
		expect(checks()[0].getAttribute('aria-pressed')).toBe('true');
		expect(checks()[1].getAttribute('aria-pressed')).toBe('false');
	});

	it('usa el título real del paso y deriva el del texto cuando no hay', () => {
		fixture = TestBed.createComponent(FaqGuideComponent);
		fixture.componentRef.setInput('faqId', 11);
		fixture.componentRef.setInput('wizard', {
			titulo: null,
			pasos: [
				{ orden: 1, texto: 'Abre el menú. Elige Asistencias.', imagenUrl: null, titulo: 'Entrar a Asistencias' },
				{ orden: 2, texto: 'Marca a cada estudiante.', imagenUrl: null, titulo: null },
				{ orden: 3, texto: 'Guarda los cambios.', imagenUrl: null, titulo: '   ' },
			],
		});
		fixture.detectChanges();

		const titles = fixture.debugElement.queryAll(By.css('.faq-guide__step-title')).map((d) => d.nativeElement.textContent.trim());

		expect(titles).toEqual(['Entrar a Asistencias', 'Marca a cada estudiante', 'Guarda los cambios']);
	});

	it('describe la captura de un paso con su número y su título, no con un alt vacío', () => {
		create();

		const img = fixture.debugElement.query(By.css('.faq-guide__image')).nativeElement as HTMLImageElement;

		expect(img.alt).toBe('Captura del paso 2: Marca a cada estudiante');
	});
});
