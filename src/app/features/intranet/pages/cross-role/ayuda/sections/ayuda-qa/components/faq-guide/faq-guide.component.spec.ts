import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { beforeEach, describe, expect, it } from 'vitest';

import { FaqWizardDto } from '@features/intranet/pages/cross-role/ayuda/models/faq.models';
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

	function create(faqId = 7): void {
		fixture = TestBed.createComponent(FaqGuideComponent);
		fixture.componentRef.setInput('faqId', faqId);
		fixture.componentRef.setInput('wizard', WIZARD);
		fixture.detectChanges();
	}

	function checks(): HTMLButtonElement[] {
		return fixture.debugElement.queryAll(By.css('.faq-guide__check')).map((d) => d.nativeElement);
	}

	function text(selector: string): string {
		return fixture.debugElement.query(By.css(selector)).nativeElement.textContent.replace(/\s+/g, ' ').trim();
	}

	beforeEach(() => {
		localStorage.clear();
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

	it('marcar un paso actualiza el progreso y lo conserva al reabrir la guía', () => {
		create();
		checks()[0].click();
		fixture.detectChanges();

		expect(text('.faq-guide__count')).toBe('1 de 3 pasos');
		expect(checks()[0].getAttribute('aria-pressed')).toBe('true');

		fixture.destroy();
		create();

		expect(text('.faq-guide__count')).toBe('1 de 3 pasos');
		expect(checks()[0].getAttribute('aria-pressed')).toBe('true');
	});

	it('el avance es por pregunta', () => {
		create(7);
		checks()[0].click();
		fixture.destroy();

		create(8);

		expect(text('.faq-guide__count')).toBe('0 de 3 pasos');
	});

	it('recuerda el último paso trabajado', () => {
		create();
		checks()[1].click();
		fixture.destroy();

		create();

		expect(checks()[1].getAttribute('aria-current')).toBe('step');
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

	it('funciona aunque el almacenamiento local falle', () => {
		const original = Storage.prototype.setItem;
		Storage.prototype.setItem = () => {
			throw new Error('bloqueado');
		};
		try {
			create();
			checks()[0].click();
			fixture.detectChanges();

			expect(text('.faq-guide__count')).toBe('1 de 3 pasos');
		} finally {
			Storage.prototype.setItem = original;
		}
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
});
