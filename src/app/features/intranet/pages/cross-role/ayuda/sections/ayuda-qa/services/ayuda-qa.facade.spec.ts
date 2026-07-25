// #region Imports
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { environment } from '@env/environment';
import { FaqDto } from '@features/intranet/pages/cross-role/ayuda/models/faq.models';
import { AyudaQaFacade } from './ayuda-qa.facade';
// #endregion

const FAQ_API = `${environment.apiUrl}/api/faq`;

const FAQS: FaqDto[] = [
	{ id: 1, pregunta: '¿Cómo cambio mi contraseña?', respuesta: 'Ve a...', categoria: 'Cuenta', wizard: null },
	{
		id: 2,
		pregunta: '¿Cómo registro asistencia?',
		respuesta: 'Ve a...',
		categoria: 'Asistencia',
		wizard: { titulo: 'Registrar asistencia', pasos: [{ orden: 1, texto: 'Paso 1', imagenUrl: null }] },
	},
];

describe('AyudaQaFacade', () => {
	let facade: AyudaQaFacade;
	let httpMock: HttpTestingController;

	beforeEach(() => {
		TestBed.configureTestingModule({
			providers: [AyudaQaFacade, provideHttpClient(), provideHttpClientTesting()],
		});

		facade = TestBed.inject(AyudaQaFacade);
		httpMock = TestBed.inject(HttpTestingController);
	});

	/** init() dispara dos GET sin filtros en paralelo (categorías + listado inicial). */
	function flushInitRequests(): void {
		const requests = httpMock.match(FAQ_API);
		expect(requests).toHaveLength(2);
		for (const req of requests) req.flush(FAQS);
	}

	it('init() carga categorías (sin filtros) y el listado inicial', () => {
		facade.init();
		flushInitRequests();

		expect(facade.faqs()).toEqual(FAQS);
		expect(facade.categorias()).toEqual(['Asistencia', 'Cuenta']);
	});

	it('setCategoria() dispara un nuevo GET con el query param categoria', () => {
		facade.init();
		flushInitRequests();

		facade.setCategoria('Asistencia');

		const req = httpMock.expectOne((r) => r.url === FAQ_API && r.params.get('categoria') === 'Asistencia');
		req.flush([FAQS[1]]);

		expect(facade.categoria()).toBe('Asistencia');
		expect(facade.faqs()).toEqual([FAQS[1]]);
	});

	it('setSearchTerm() debounce 300ms antes de disparar el GET con q', () => {
		vi.useFakeTimers();
		try {
			facade.init();
			flushInitRequests();

			facade.setSearchTerm('contraseña');
			httpMock.expectNone((r) => r.url === FAQ_API && r.params.has('q'));

			vi.advanceTimersByTime(300);

			const req = httpMock.expectOne((r) => r.url === FAQ_API && r.params.get('q') === 'contraseña');
			req.flush([FAQS[0]]);

			expect(facade.faqs()).toEqual([FAQS[0]]);
		} finally {
			vi.useRealTimers();
		}
	});

	it('error de red deja faqs vacío y marca error()', () => {
		facade.init();

		const requests = httpMock.match(FAQ_API);
		expect(requests).toHaveLength(2);
		requests[0].flush(FAQS);
		requests[1].flush('fail', { status: 500, statusText: 'Server Error' });

		expect(facade.error()).toBe(true);
		expect(facade.faqs()).toEqual([]);
	});
});
