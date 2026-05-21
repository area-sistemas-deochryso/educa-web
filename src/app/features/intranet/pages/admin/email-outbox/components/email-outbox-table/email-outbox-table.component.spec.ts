import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { beforeEach, describe, expect, it } from 'vitest';

import { EmailOutboxLista } from '@data/models';

import { EmailOutboxTableComponent } from './email-outbox-table.component';

function buildItem(over: Partial<EmailOutboxLista>): EmailOutboxLista {
	return {
		id: 1,
		tipo: 'ASISTENCIA',
		estado: 'PROCESSING',
		destinatario: 'foo@x.com',
		asunto: 'Asunto',
		entidadOrigen: null,
		entidadId: null,
		intentos: 1,
		maxIntentos: 5,
		ultimoError: null,
		tipoFallo: null,
		fechaEnvio: null,
		duracionMs: null,
		usuarioReg: 'sistema',
		fechaReg: new Date().toISOString(),
		correlationId: null,
		...over,
	};
}

describe('EmailOutboxTableComponent — badge "Pendiente reintento" (Plan 43 Chat 2.1 A3)', () => {
	let fixture: ComponentFixture<EmailOutboxTableComponent>;

	beforeEach(() => {
		TestBed.configureTestingModule({
			imports: [EmailOutboxTableComponent, NoopAnimationsModule],
		});
		fixture = TestBed.createComponent(EmailOutboxTableComponent);
	});

	it('renderiza badge cuando estado=PROCESSING y ultimoErrorTransiente está poblado', () => {
		fixture.componentRef.setInput('items', [
			buildItem({
				estado: 'PROCESSING',
				ultimoErrorTransiente: '4.2.2 mailbox temporarily full',
			}),
		]);
		fixture.detectChanges();
		const html = fixture.nativeElement.innerHTML;
		expect(html).toContain('Pendiente reintento');
	});

	it('NO renderiza badge cuando estado=PROCESSING y ultimoErrorTransiente es null', () => {
		fixture.componentRef.setInput('items', [
			buildItem({
				estado: 'PROCESSING',
				ultimoErrorTransiente: null,
			}),
		]);
		fixture.detectChanges();
		const html = fixture.nativeElement.innerHTML;
		expect(html).not.toContain('Pendiente reintento');
	});

	it('NO renderiza badge cuando estado=SENT (aunque haya transiente — caso defensivo)', () => {
		fixture.componentRef.setInput('items', [
			buildItem({
				estado: 'SENT',
				ultimoErrorTransiente: '4.2.2 algún error',
			}),
		]);
		fixture.detectChanges();
		const html = fixture.nativeElement.innerHTML;
		expect(html).not.toContain('Pendiente reintento');
	});
});
