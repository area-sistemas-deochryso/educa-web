import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { take } from 'rxjs/operators';
import { beforeEach, describe, expect, it } from 'vitest';

import { EmailHubService } from './email-hub.service';

describe('EmailHubService', () => {
	let service: EmailHubService;

	beforeEach(() => {
		TestBed.configureTestingModule({});
		service = TestBed.inject(EmailHubService);
	});

	it('blacklistEntryCreated$ emite ante eventos del subject (mapeo camelCase OK)', async () => {
		const emitted = firstValueFrom(service.blacklistEntryCreated$.pipe(take(1)));
		// Acceso al subject privado por reflexión para forzar emit sin levantar hub real.
		const subject = (service as unknown as { blacklistEntryCreatedSubject: { next: (v: unknown) => void } })
			.blacklistEntryCreatedSubject;
		subject.next({ correoEnmascarado: 'foo***@gmail.com', motivo: 'BOUNCE_5XX', origen: 'test' });
		const evt = await emitted;
		expect(evt.correoEnmascarado).toBe('foo***@gmail.com');
		expect(evt.motivo).toBe('BOUNCE_5XX');
	});

	it('candidatoBlacklistDetectado$ emite payloads del subject', async () => {
		const emitted = firstValueFrom(service.candidatoBlacklistDetectado$.pipe(take(1)));
		const subject = (service as unknown as { candidatoBlacklistDetectadoSubject: { next: (v: unknown) => void } })
			.candidatoBlacklistDetectadoSubject;
		subject.next({ correoEnmascarado: 'a@b.com', hitsActuales: 1, thresholdHits: 2 });
		const evt = await emitted;
		expect(evt.hitsActuales).toBe(1);
		expect(evt.thresholdHits).toBe(2);
	});

	it('connected() arranca en false antes de connect()', () => {
		expect(service.connected()).toBe(false);
	});
});
