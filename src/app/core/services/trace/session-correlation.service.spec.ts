import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { SessionCorrelationService } from './session-correlation.service';

describe('SessionCorrelationService', () => {
	let service: SessionCorrelationService;

	beforeEach(() => {
		TestBed.configureTestingModule({});
		service = TestBed.inject(SessionCorrelationService);
	});

	it('genera un id con el charset y el largo que acepta el BE (INV-CORR04)', () => {
		expect(service.id).toMatch(/^[A-Za-z0-9_-]{1,50}$/);
	});

	it('mantiene el mismo id durante toda la sesión', () => {
		expect(TestBed.inject(SessionCorrelationService).id).toBe(service.id);
	});

	it('hubUrl suma el id de la sesión en el query correlationId', () => {
		expect(service.hubUrl('/chathub')).toBe(`/chathub?correlationId=${service.id}`);
	});
});
