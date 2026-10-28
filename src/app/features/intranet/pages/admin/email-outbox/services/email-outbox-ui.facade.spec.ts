// * P14 / brief 872 — el diagnóstico SMTP del drawer viene del endpoint de detalle, no de la lista.
// #region Imports
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { of, Subject } from 'rxjs';

import { ErrorHandlerService } from '@core/services/error';
import type { EmailOutboxDetalle, EmailOutboxLista } from '@data/models';

import { EmailOutboxApiService } from '@features/intranet/pages/admin/email-outbox-shared';
import { EmailOutboxStore } from './email-outbox.store';
import { EmailOutboxUiFacade } from './email-outbox-ui.facade';
// #endregion

// #region Mocks
function makeLista(id: number): EmailOutboxLista {
	return {
		id,
		tipo: 'ASISTENCIA',
		estado: 'FAILED',
		destinatario: 'a@b.com',
		asunto: 'x',
		entidadOrigen: null,
		entidadId: null,
		intentos: 1,
		maxIntentos: 3,
		ultimoError: null,
		tipoFallo: null,
		fechaEnvio: null,
		duracionMs: null,
		usuarioReg: 'sys',
		fechaReg: '2026-10-28T10:00:00',
		correlationId: null,
	} as EmailOutboxLista;
}

function makeDetalle(id: number): EmailOutboxDetalle {
	return {
		...makeLista(id),
		remitente: 's0@educa.com',
		lastSmtpCode: 550,
		lastSmtpMessage: 'mailbox unavailable',
		lastAttemptAt: '2026-10-28T10:05:00',
		bounceSource: 'sync',
	};
}
// #endregion

describe('EmailOutboxUiFacade — detalle SMTP del drawer', () => {
	let facade: EmailOutboxUiFacade;
	let store: EmailOutboxStore;
	let api: {
		obtenerDetalle: ReturnType<typeof vi.fn>;
		obtenerHtml: ReturnType<typeof vi.fn>;
		getManualAttempts: ReturnType<typeof vi.fn>;
	};

	beforeEach(() => {
		api = {
			obtenerDetalle: vi.fn().mockReturnValue(of(makeDetalle(7))),
			obtenerHtml: vi.fn().mockReturnValue(of(null)),
			getManualAttempts: vi.fn().mockReturnValue(of([])),
		};
		TestBed.configureTestingModule({
			providers: [
				EmailOutboxUiFacade,
				EmailOutboxStore,
				{ provide: EmailOutboxApiService, useValue: api },
				{ provide: ErrorHandlerService, useValue: {} },
			],
		});
		facade = TestBed.inject(EmailOutboxUiFacade);
		store = TestBed.inject(EmailOutboxStore);
	});

	it('openDetail pide el detalle del item y lo deja en el store', () => {
		facade.openDetail(makeLista(7));

		expect(api.obtenerDetalle).toHaveBeenCalledWith(7);
		expect(store.detalle()?.lastSmtpCode).toBe(550);
		expect(store.detalle()?.remitente).toBe('s0@educa.com');
	});

	it('descarta la respuesta si el usuario ya abrió otro item', () => {
		const lenta = new Subject<EmailOutboxDetalle>();
		api.obtenerDetalle.mockReturnValueOnce(lenta).mockReturnValueOnce(of(makeDetalle(8)));

		facade.openDetail(makeLista(7));
		facade.openDetail(makeLista(8));
		lenta.next(makeDetalle(7));

		expect(store.detalle()?.id).toBe(8);
	});

	it('closeDrawer limpia el detalle', () => {
		facade.openDetail(makeLista(7));
		facade.closeDrawer();

		expect(store.detalle()).toBeNull();
	});
});
