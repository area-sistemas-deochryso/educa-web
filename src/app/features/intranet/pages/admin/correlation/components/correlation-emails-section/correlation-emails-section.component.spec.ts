import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CorrelationEmailsSectionComponent } from './correlation-emails-section.component';
import { CorrelationEmailOutboxDto } from '../../models';

function makeRow(over: Partial<CorrelationEmailOutboxDto> = {}): CorrelationEmailOutboxDto {
	return {
		id: 10,
		tipo: 'ASISTENCIA',
		estado: 'SENT',
		destinatarioMasked: 'u***@example.com',
		asunto: 'Asunto',
		entidadOrigen: null,
		entidadId: null,
		intentos: 1,
		ultimoErrorResumen: null,
		tipoFallo: null,
		fechaEnvio: '2026-05-18T10:00:00',
		fechaReg: '2026-05-18T09:59:00',
		...over,
	};
}

describe('CorrelationEmailsSectionComponent', () => {
	let fixture: ComponentFixture<CorrelationEmailsSectionComponent>;
	let component: CorrelationEmailsSectionComponent;
	let router: Router;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [CorrelationEmailsSectionComponent],
			providers: [provideRouter([])],
		}).compileComponents();

		fixture = TestBed.createComponent(CorrelationEmailsSectionComponent);
		component = fixture.componentInstance;
		router = TestBed.inject(Router);

		fixture.componentRef.setInput('items', [makeRow()]);
		fixture.componentRef.setInput('correlationId', 'abc-1');
		fixture.detectChanges();
	});

	it('onGoToOutbox navigates with destinatario queryParam', () => {
		const spy = vi.spyOn(router, 'navigate').mockResolvedValue(true);
		component.onGoToOutbox(makeRow({ destinatarioMasked: 'a***@b.com' }));
		expect(spy).toHaveBeenCalledWith(['/intranet/admin/email-outbox'], {
			queryParams: { destinatario: 'a***@b.com' },
		});
	});

	it('renders the Acciones button', () => {
		const html = fixture.nativeElement as HTMLElement;
		const buttons = html.querySelectorAll('button[aria-label="Ver bandeja del destinatario"]');
		expect(buttons.length).toBe(1);
	});
});
