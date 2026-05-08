import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { CorrelationTimelineSectionComponent } from './correlation-timeline-section.component';
import {
	CorrelationEmailOutboxDto,
	CorrelationErrorLogDto,
	CorrelationRateLimitEventDto,
	CorrelationReporteUsuarioDto,
	TimelineEvent,
} from '../../models';

function makeError(over: Partial<CorrelationErrorLogDto> = {}): CorrelationErrorLogDto {
	return {
		id: 1,
		severidad: 'ERROR',
		mensaje: 'Boom',
		url: '/api/x',
		httpMethod: 'GET',
		httpStatus: 500,
		errorCode: null,
		usuarioDniMasked: '***1234',
		usuarioRol: 'Director',
		plataforma: 'web',
		fecha: '2026-05-08T10:00:00',
		...over,
	};
}

function makeRateLimit(over: Partial<CorrelationRateLimitEventDto> = {}): CorrelationRateLimitEventDto {
	return {
		id: 1,
		endpoint: '/api/y',
		httpMethod: 'POST',
		policy: 'reports',
		usuarioDniMasked: null,
		usuarioRol: null,
		limiteEfectivo: 5,
		tokensConsumidos: 6,
		fueRechazado: true,
		fecha: '2026-05-08T11:00:00',
		...over,
	};
}

function makeReporte(over: Partial<CorrelationReporteUsuarioDto> = {}): CorrelationReporteUsuarioDto {
	return {
		id: 1,
		tipo: 'PAGINA_LENTA',
		descripcionResumen: 'Tarda mucho',
		propuestaResumen: null,
		url: '/intranet/x',
		estado: 'NUEVO',
		plataforma: 'web',
		usuarioDniMasked: '***5678',
		usuarioRol: 'Estudiante',
		usuarioNombre: 'Anon',
		fechaReg: '2026-05-08T09:00:00',
		...over,
	};
}

function makeOutbox(over: Partial<CorrelationEmailOutboxDto> = {}): CorrelationEmailOutboxDto {
	return {
		id: 1,
		tipo: 'ASISTENCIA',
		estado: 'SENT',
		destinatarioMasked: 'a***@x.com',
		asunto: 'Asistencia hoy',
		entidadOrigen: 'Asistencia',
		entidadId: 99,
		intentos: 1,
		ultimoErrorResumen: null,
		tipoFallo: null,
		fechaEnvio: '2026-05-08T12:00:00',
		fechaReg: '2026-05-08T11:55:00',
		...over,
	};
}

describe('CorrelationTimelineSectionComponent', () => {
	let fixture: ComponentFixture<CorrelationTimelineSectionComponent>;
	let component: CorrelationTimelineSectionComponent;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [CorrelationTimelineSectionComponent],
		}).compileComponents();

		fixture = TestBed.createComponent(CorrelationTimelineSectionComponent);
		component = fixture.componentInstance;
	});

	it('renders empty state when there are no events', () => {
		fixture.componentRef.setInput('events', []);
		fixture.detectChanges();

		expect(component.count()).toBe(0);
		const html = fixture.nativeElement.innerHTML as string;
		expect(html).toContain('correlation-section__empty');
	});

	it('renders one li per event with the kind class', () => {
		const events: TimelineEvent[] = [
			{ kind: 'error', fecha: '2026-05-08T11:00:00', payload: makeError({ fecha: '2026-05-08T11:00:00' }) },
			{ kind: 'reporte', fecha: '2026-05-08T10:00:00', payload: makeReporte({ fechaReg: '2026-05-08T10:00:00' }) },
			{ kind: 'outbox', fecha: '2026-05-08T09:00:00', payload: makeOutbox({ fechaEnvio: '2026-05-08T09:00:00' }) },
		];
		fixture.componentRef.setInput('events', events);
		fixture.detectChanges();

		const html = fixture.nativeElement.innerHTML as string;
		expect(component.count()).toBe(3);
		expect(html).toContain('timeline-event--error');
		expect(html).toContain('timeline-event--reporte');
		expect(html).toContain('timeline-event--outbox');
	});

	it('exposes track key combining kind, id and fecha', () => {
		const evt: TimelineEvent = {
			kind: 'rate-limit',
			fecha: '2026-05-08T11:00:00',
			payload: makeRateLimit({ id: 42 }),
		};
		const key = component.trackEvent(0, evt);
		expect(key).toBe('rate-limit:42:2026-05-08T11:00:00');
	});
});
