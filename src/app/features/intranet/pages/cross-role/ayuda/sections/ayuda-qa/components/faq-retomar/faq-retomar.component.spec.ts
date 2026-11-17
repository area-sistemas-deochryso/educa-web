import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { beforeEach, describe, expect, it } from 'vitest';

import { FaqDto } from '@features/intranet/pages/cross-role/ayuda/models/faq.models';
import { RetomarItem } from '../../services/ayuda-qa.facade';
import { FaqRetomarComponent } from './faq-retomar.component';

const guia = (id: number): FaqDto => ({
	id,
	pregunta: `¿Cómo hago la tarea ${id}?`,
	respuesta: '...',
	categoria: 'Común',
	wizard: { titulo: null, pasos: [{ orden: 1, texto: 'Paso', imagenUrl: null }] },
});

const item = (id: number, done: number, total: number, step: number): RetomarItem => ({
	faq: guia(id),
	summary: { status: 'en-curso', done, total, step, fecha: '2026-11-17T10:00:00Z' },
});

describe('FaqRetomarComponent', () => {
	let fixture: ComponentFixture<FaqRetomarComponent>;

	beforeEach(() => {
		TestBed.configureTestingModule({ imports: [FaqRetomarComponent] });
		fixture = TestBed.createComponent(FaqRetomarComponent);
	});

	it('sin guías en curso no pinta nada', () => {
		fixture.componentRef.setInput('items', []);
		fixture.detectChanges();

		expect(fixture.debugElement.query(By.css('.faq-retomar'))).toBeNull();
	});

	it('lista cada guía con su avance y «Continuar en el paso N», en el orden recibido', () => {
		fixture.componentRef.setInput('items', [item(5, 3, 9, 4), item(6, 1, 2, 2)]);
		fixture.detectChanges();

		const rows = fixture.debugElement.queryAll(By.css('.faq-retomar__item')).map((d) => (d.nativeElement as HTMLElement).textContent?.replace(/\s+/g, ' ').trim());

		expect(rows).toEqual([
			'¿Cómo hago la tarea 5? 3/9 pasos Continuar en el paso 4',
			'¿Cómo hago la tarea 6? 1/2 pasos Continuar en el paso 2',
		]);
	});

	it('elegir una guía emite su id', () => {
		let emitted: number | null = null;
		fixture.componentInstance.faqSelected.subscribe((id) => (emitted = id));
		fixture.componentRef.setInput('items', [item(5, 3, 9, 4), item(6, 1, 2, 2)]);
		fixture.detectChanges();

		(fixture.debugElement.query(By.css('[data-retomar-id="6"]')).nativeElement as HTMLButtonElement).click();

		expect(emitted).toBe(6);
	});
});
