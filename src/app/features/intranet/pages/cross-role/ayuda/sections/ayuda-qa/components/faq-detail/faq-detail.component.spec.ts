import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { beforeEach, describe, expect, it } from 'vitest';

import { FaqDto } from '@features/intranet/pages/cross-role/ayuda/models/faq.models';
import { FaqDetailComponent, FaqVoteEvent } from './faq-detail.component';

const FAQ_SIN_WIZARD: FaqDto = { id: 1, pregunta: '¿Cómo cambio mi contraseña?', respuesta: 'Ve a tu perfil.', categoria: 'Común', wizard: null };
const FAQ_CON_WIZARD: FaqDto = {
	id: 2,
	pregunta: '¿Cómo registro asistencia?',
	respuesta: 'Ve a Asistencias.',
	categoria: 'Profesor',
	wizard: { titulo: 'Registrar', pasos: [{ orden: 1, texto: 'Paso 1', imagenUrl: null }] },
};

describe('FaqDetailComponent', () => {
	let fixture: ComponentFixture<FaqDetailComponent>;

	function feedbackButtons(): HTMLButtonElement[] {
		return fixture.debugElement.queryAll(By.css('.faq-detail__feedback button')).map((d) => d.nativeElement);
	}

	beforeEach(() => {
		localStorage.clear();
		TestBed.configureTestingModule({ imports: [FaqDetailComponent] });
		fixture = TestBed.createComponent(FaqDetailComponent);
	});

	it('una FAQ sin wizard no muestra el bloque de guía', () => {
		fixture.componentRef.setInput('faq', FAQ_SIN_WIZARD);
		fixture.detectChanges();

		expect(fixture.debugElement.query(By.css('app-faq-guide'))).toBeNull();
	});

	it('una FAQ con wizard muestra la guía en la misma página, sin modal', () => {
		fixture.componentRef.setInput('faq', FAQ_CON_WIZARD);
		fixture.detectChanges();

		expect(fixture.debugElement.query(By.css('app-faq-guide'))).not.toBeNull();
		expect(fixture.debugElement.query(By.css('edu-dialog'))).toBeNull();
	});

	it('«Volver a la lista» emite back', () => {
		let backs = 0;
		fixture.componentInstance.back.subscribe(() => backs++);
		fixture.componentRef.setInput('faq', FAQ_SIN_WIZARD);
		fixture.detectChanges();

		fixture.debugElement.query(By.css('.faq-detail__back')).nativeElement.click();

		expect(backs).toBe(1);
	});

	it('sin voto no muestra agradecimiento ni motivos', () => {
		fixture.componentRef.setInput('faq', FAQ_SIN_WIZARD);
		fixture.detectChanges();

		expect(fixture.debugElement.query(By.css('.faq-detail__voto'))).toBeNull();
	});

	it('«Útil» y «No útil» emiten el voto', () => {
		const votos: FaqVoteEvent[] = [];
		fixture.componentInstance.voted.subscribe((v) => votos.push(v));
		fixture.componentRef.setInput('faq', FAQ_SIN_WIZARD);
		fixture.detectChanges();

		feedbackButtons()[0].click();
		feedbackButtons()[1].click();

		expect(votos).toEqual([
			{ util: true, motivo: null },
			{ util: false, motivo: null },
		]);
	});

	it('con voto «útil» agradece y no pide motivo', () => {
		fixture.componentRef.setInput('faq', FAQ_SIN_WIZARD);
		fixture.componentRef.setInput('vote', { util: true, motivo: null });
		fixture.detectChanges();

		expect(fixture.debugElement.query(By.css('.faq-detail__confirm--util'))).not.toBeNull();
		expect(fixture.debugElement.query(By.css('.faq-detail__motivo'))).toBeNull();
	});

	it('con voto «No útil» pide el motivo y emite el elegido', () => {
		let emitted: FaqVoteEvent | null = null;
		fixture.componentInstance.voted.subscribe((v) => (emitted = v));
		fixture.componentRef.setInput('faq', FAQ_SIN_WIZARD);
		fixture.componentRef.setInput('vote', { util: false, motivo: null });
		fixture.detectChanges();

		const motivos = fixture.debugElement.queryAll(By.css('.faq-detail__motivo'));
		motivos[1].nativeElement.click();

		expect(motivos.length).toBe(3);
		expect(emitted).toEqual({ util: false, motivo: 'NO_ES_LO_QUE_BUSCO' });
	});

	it('marca el motivo vigente', () => {
		fixture.componentRef.setInput('faq', FAQ_SIN_WIZARD);
		fixture.componentRef.setInput('vote', { util: false, motivo: 'DESACTUALIZADA' });
		fixture.detectChanges();

		const activos = fixture.debugElement.queryAll(By.css('.faq-detail__motivo--activo'));

		expect(activos.length).toBe(1);
		expect(activos[0].nativeElement.textContent).toContain('desactualizada');
	});

	it('«No útil» ofrece «Generar ticket» y lo emite con la pregunta', () => {
		let emitted: FaqDto | null = null;
		fixture.componentInstance.ticketRequested.subscribe((f) => (emitted = f));
		fixture.componentRef.setInput('faq', FAQ_SIN_WIZARD);
		fixture.componentRef.setInput('vote', { util: false, motivo: null });
		fixture.detectChanges();

		const button = fixture.debugElement.query(By.css('.faq-detail__ticket button'));
		button.nativeElement.click();

		expect(button.nativeElement.textContent).toContain('Generar ticket');
		expect(emitted).toEqual(FAQ_SIN_WIZARD);
	});

	it('muestra las preguntas relacionadas y emite la elegida', () => {
		let selected: number | null = null;
		fixture.componentInstance.relatedSelected.subscribe((id) => (selected = id));
		fixture.componentRef.setInput('faq', FAQ_SIN_WIZARD);
		fixture.componentRef.setInput('relacionadas', [FAQ_CON_WIZARD]);
		fixture.detectChanges();

		fixture.debugElement.query(By.css('.faq-detail__related-link')).nativeElement.click();

		expect(selected).toBe(2);
	});

	it('sin relacionadas no muestra el bloque', () => {
		fixture.componentRef.setInput('faq', FAQ_SIN_WIZARD);
		fixture.detectChanges();

		expect(fixture.debugElement.query(By.css('.faq-detail__related'))).toBeNull();
	});
});
