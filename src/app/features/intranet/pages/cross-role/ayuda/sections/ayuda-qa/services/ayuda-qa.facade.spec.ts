// #region Imports
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { environment } from '@config/environment';
import { AuthService } from '@core/services';
import { FaqDto, FaqProgresoDto } from '@features/intranet/pages/cross-role/ayuda/models/faq.models';
import { AyudaQaFacade } from './ayuda-qa.facade';
// #endregion

const FAQ_API = `${environment.apiUrl}/api/faq`;

/** Provee el facade como la sección real (a nivel de componente) para probar lo que ocurre al destruirse. */
@Component({ standalone: true, template: '', providers: [AyudaQaFacade] })
class FacadeHostComponent {}

const FAQS: FaqDto[] = [
	{ id: 1, pregunta: '¿Cómo cambio mi contraseña?', respuesta: 'Ve a tu perfil.', categoria: 'Común', wizard: null },
	{
		id: 2,
		pregunta: '¿Cómo registro asistencia?',
		respuesta: 'Ve a Asistencias.',
		categoria: 'Profesor',
		wizard: { titulo: 'Registrar asistencia', pasos: [{ orden: 1, texto: 'Paso 1', imagenUrl: null }] },
	},
	{ id: 3, pregunta: '¿Cómo veo mis notas?', respuesta: 'Ve a Notas y cambia el período.', categoria: 'Estudiante', wizard: null },
];

describe('AyudaQaFacade', () => {
	let facade: AyudaQaFacade;
	let httpMock: HttpTestingController;

	beforeEach(() => {
		TestBed.configureTestingModule({
			providers: [
				AyudaQaFacade,
				provideHttpClient(),
				provideHttpClientTesting(),
				{ provide: AuthService, useValue: { currentUser: { rol: 'Profesor' } } },
			],
		});

		facade = TestBed.inject(AyudaQaFacade);
		httpMock = TestBed.inject(HttpTestingController);
	});

	function load(faqs: FaqDto[] = FAQS): void {
		facade.init();
		httpMock.expectOne(FAQ_API).flush(faqs);
	}

	it('init() hace una sola carga sin filtros y deja todas las preguntas visibles', () => {
		load();

		expect(facade.faqs()).toEqual(FAQS);
		expect(facade.loading()).toBe(false);
	});

	it('buscar y filtrar por categoría no vuelve a llamar al servidor', () => {
		load();

		facade.setSearchTerm('notas');
		facade.setCategoria('Estudiante');

		httpMock.expectNone(FAQ_API);
		expect(facade.faqs().map((f) => f.id)).toEqual([3]);
	});

	it('la búsqueda mira pregunta y respuesta sin distinguir mayúsculas', () => {
		load();

		facade.setSearchTerm('PERFIL');

		expect(facade.faqs().map((f) => f.id)).toEqual([1]);
	});

	describe('búsqueda por todas las palabras', () => {
		const LOGIN: FaqDto = {
			id: 10,
			pregunta: '¿Cómo entro a la intranet por primera vez?',
			respuesta: 'Usa tu DNI.',
			categoria: 'Común',
			palabrasClave: 'login, inicio de sesion',
			wizard: { titulo: null, pasos: [{ orden: 1, titulo: 'Abrir el navegador', texto: 'Escribe la dirección', imagenUrl: null }] },
		};
		const ids = () => facade.faqs().map((f) => f.id);

		it('encuentra por palabra clave', () => {
			load([...FAQS, LOGIN]);
			facade.setSearchTerm('login');
			expect(ids()).toEqual([10]);
		});

		it('palabras fuera de orden y sin tilde', () => {
			load([...FAQS, LOGIN]);
			facade.setSearchTerm('sesión inicio');
			expect(ids()).toEqual([10]);
		});

		it('exige todas las palabras, aunque estén en campos distintos', () => {
			load([...FAQS, LOGIN]);
			facade.setSearchTerm('login intranet');
			expect(ids()).toEqual([10]);
			facade.setSearchTerm('login notas');
			expect(ids()).toEqual([]);
		});

		it('encuentra por título o texto de un paso', () => {
			load([...FAQS, LOGIN]);
			facade.setSearchTerm('navegador');
			expect(ids()).toEqual([10]);
			facade.setSearchTerm('dirección');
			expect(ids()).toEqual([10]);
		});

		it('una pregunta sin palabras clave sigue encontrándose por pregunta y respuesta', () => {
			load();
			facade.setSearchTerm('perfil');
			expect(ids()).toEqual([1]);
		});

		it('una palabra inexistente deja la lista vacía y los conteos en cero', () => {
			load([...FAQS, LOGIN]);
			facade.setSearchTerm('zzz');
			expect(ids()).toEqual([]);
			expect([facade.paraTiCount(), facade.todasCount()]).toEqual([0, 0]);
		});
	});

	it('«Para ti» solo deja la categoría del rol y «Común»', () => {
		load();

		facade.setModoVista('para-ti');

		expect(facade.faqs().map((f) => f.id)).toEqual([1, 2]);
	});

	it('los conteos de «Para ti» y «Todas» coinciden con lo que muestra la lista en cada modo', () => {
		load();

		facade.setSearchTerm('cómo');
		const paraTi = facade.paraTiCount();
		const todas = facade.todasCount();

		facade.setModoVista('para-ti');
		expect(facade.faqs()).toHaveLength(paraTi);
		facade.setModoVista('todas');
		expect(facade.faqs()).toHaveLength(todas);
		expect([paraTi, todas]).toEqual([2, 3]);
	});

	it('los conteos respetan la categoría y la búsqueda activas', () => {
		load();

		facade.setCategoria('Estudiante');

		expect(facade.todasCount()).toBe(1);
		expect(facade.paraTiCount()).toBe(0);
	});

	it('los chips de categoría cuentan con el modo y la búsqueda actuales', () => {
		load();
		facade.setModoVista('para-ti');

		const chips = facade.categoriaChips();

		expect(chips).toEqual([
			{ value: null, count: 2 },
			{ value: 'Común', count: 1 },
			{ value: 'Profesor', count: 1 },
		]);
	});

	it('la cabecera pasa a compacta al escribir o filtrar y se restaura al vaciar', () => {
		load();
		expect(facade.isFiltering()).toBe(false);

		facade.setSearchTerm('notas');
		expect(facade.isFiltering()).toBe(true);

		facade.setSearchTerm('');
		facade.setCategoria('Profesor');
		expect(facade.isFiltering()).toBe(true);

		facade.setCategoria(null);
		expect(facade.isFiltering()).toBe(false);
	});

	it('clearFilters devuelve búsqueda, categoría y modo al estado inicial; hasActiveFilters lo refleja', () => {
		load();
		expect(facade.hasActiveFilters()).toBe(false);

		facade.setModoVista('para-ti');
		expect(facade.hasActiveFilters()).toBe(true);

		facade.setSearchTerm('notas');
		facade.setCategoria('Profesor');
		facade.clearFilters();

		expect(facade.hasActiveFilters()).toBe(false);
		expect(facade.searchTerm()).toBe('');
		expect(facade.categoria()).toBeNull();
		expect(facade.modoVista()).toBe('todas');
		expect(facade.todasCount()).toBe(facade.faqs().length);
	});

	it('«más consultadas» usa las primeras preguntas del rol', () => {
		load();

		expect(facade.populares().map((f) => f.id)).toEqual([1, 2]);
	});

	it('seleccionar una pregunta oculta por los filtros los limpia para que se vea en la lista', () => {
		load();
		facade.setSearchTerm('notas');
		facade.setModoVista('para-ti');

		facade.select(3);

		expect(facade.selectedFaq()?.id).toBe(3);
		expect(facade.searchTerm()).toBe('');
		expect(facade.modoVista()).toBe('todas');
		expect(facade.faqs().some((f) => f.id === 3)).toBe(true);
	});

	it('una selección previa a la carga (enlace directo) se resuelve cuando llegan los datos', () => {
		facade.select(2);
		expect(facade.selectedFaq()).toBeNull();

		load();

		expect(facade.selectedFaq()?.id).toBe(2);
	});

	it('select(null) vuelve a la lista sin tocar los filtros', () => {
		load();
		facade.setSearchTerm('perfil');
		facade.select(1);

		facade.select(null);

		expect(facade.selectedFaq()).toBeNull();
		expect(facade.searchTerm()).toBe('perfil');
	});

	it('error de red deja faqs vacío y marca error()', () => {
		facade.init();
		httpMock.expectOne(FAQ_API).flush('fail', { status: 500, statusText: 'Server Error' });

		expect(facade.error()).toBe(true);
		expect(facade.faqs()).toEqual([]);
	});

	it('relacionadas: misma categoría que la pregunta abierta, sin ella y con tope de 3', () => {
		const comunes = [1, 2, 3, 4, 5].map((id) => ({ ...FAQS[0], id, pregunta: `Común ${id}` }));
		load([...comunes, FAQS[1]]);

		facade.select(1);

		expect(facade.relacionadas().map((f) => f.id)).toEqual([2, 3, 4]);
	});

	it('relacionadas: vacío sin pregunta abierta o sin otras de su categoría', () => {
		load();
		expect(facade.relacionadas()).toEqual([]);

		facade.select(2);

		expect(facade.relacionadas()).toEqual([]);
	});

	// #region F6 — integración con el servidor
	const consultasReq = (): ReturnType<HttpTestingController['expectOne']> =>
		httpMock.expectOne((r) => r.url === FAQ_API && r.params.get('orden') === 'consultas');
	const aperturaUrl = (id: number): string => `${FAQ_API}/${id}/apertura`;

	it('populares sigue el orden de «más consultadas» del servidor', () => {
		load();
		consultasReq().flush([FAQS[1], FAQS[0], FAQS[2]]);

		expect(facade.populares().map((f) => f.id)).toEqual([2, 1]);
	});

	it('populares usa las primeras del rol si falla el orden del servidor', () => {
		load();
		consultasReq().flush('fail', { status: 500, statusText: 'Server Error' });

		expect(facade.populares().map((f) => f.id)).toEqual([1, 2]);
	});

	it('pinta el voto guardado en el servidor al volver a la pregunta', () => {
		load();
		httpMock.expectOne(`${FAQ_API}/feedback/mios`).flush([{ faqId: 2, util: false, motivo: 'DESACTUALIZADA' }]);

		facade.select(2);

		expect(facade.selectedVote()).toEqual({ util: false, motivo: 'DESACTUALIZADA' });
	});

	it('votar se refleja al instante y envía el voto con su motivo', () => {
		load();
		facade.select(1);

		facade.vote(1, false, 'INCOMPLETA');

		expect(facade.selectedVote()).toEqual({ util: false, motivo: 'INCOMPLETA' });
		const req = httpMock.expectOne(`${FAQ_API}/1/feedback`);
		expect(req.request.method).toBe('PUT');
		expect(req.request.body).toEqual({ util: false, motivo: 'INCOMPLETA' });
	});

	it('un voto «útil» no envía motivo y reemplaza al anterior', () => {
		load();
		facade.select(1);
		facade.vote(1, false, 'INCOMPLETA');
		httpMock.expectOne(`${FAQ_API}/1/feedback`);

		facade.vote(1, true, 'INCOMPLETA');

		expect(facade.selectedVote()).toEqual({ util: true, motivo: null });
		expect(httpMock.expectOne(`${FAQ_API}/1/feedback`).request.body).toEqual({ util: true });
	});

	it('si el servidor rechaza el voto, se descarta sin romper nada', () => {
		load();
		facade.select(1);
		facade.vote(1, true);

		httpMock.expectOne(`${FAQ_API}/1/feedback`).flush('fail', { status: 429, statusText: 'Too Many Requests' });

		expect(facade.error()).toBe(false);
		expect(facade.faqs().length).toBe(3);
	});

	it('cuenta la apertura una sola vez por pregunta y por visita', () => {
		load();

		facade.select(1);
		httpMock.expectOne(aperturaUrl(1)).flush(null, { status: 204, statusText: 'No Content' });
		facade.select(null);
		facade.select(1);
		httpMock.expectNone(aperturaUrl(1));

		facade.select(2);
		expect(httpMock.expectOne(aperturaUrl(2)).request.method).toBe('POST');
	});

	it('un enlace directo cuenta la apertura cuando las preguntas ya cargaron', () => {
		facade.init();
		facade.select(1);
		httpMock.expectNone(aperturaUrl(1));

		httpMock.expectOne(FAQ_API).flush(FAQS);

		httpMock.expectOne(aperturaUrl(1));
	});

	it('una pregunta que no existe no registra apertura', () => {
		load();

		facade.select(999);

		httpMock.expectNone(aperturaUrl(999));
	});

	it('si falla el registro de la apertura, la lectura sigue', () => {
		load();
		facade.select(1);

		httpMock.expectOne(aperturaUrl(1)).flush('fail', { status: 500, statusText: 'Server Error' });

		expect(facade.error()).toBe(false);
		expect(facade.selectedFaq()?.id).toBe(1);
	});
	// #endregion

	describe('progreso de guías', () => {
		const guia = (id: number, pasos: number): FaqDto => ({
			id,
			pregunta: `Guía ${id}`,
			respuesta: 'Sigue los pasos.',
			categoria: 'Profesor',
			wizard: { titulo: null, pasos: Array.from({ length: pasos }, (_, i) => ({ orden: i + 1, texto: `Paso ${i + 1}`, imagenUrl: null })) },
		});
		const G20 = guia(20, 3);
		const G21 = guia(21, 2);
		const PROGRESS_API = `${FAQ_API}/progreso/mios`;
		const putUrl = (id: number) => `${FAQ_API}/${id}/progreso`;

		function loadWith(progresos: FaqProgresoDto[] | 'error', faqs: FaqDto[] = [...FAQS, G20, G21]): void {
			load(faqs);
			const req = httpMock.expectOne(PROGRESS_API);
			if (progresos === 'error') req.flush('', { status: 500, statusText: 'Server Error' });
			else req.flush(progresos);
		}

		const saved = (faqId: number, hechos: number[], actual: number | undefined, totalPasos: number, fecha = '2026-11-17T10:00:00Z'): FaqProgresoDto => ({
			faqId,
			hechos,
			actual,
			totalPasos,
			fecha,
		});

		beforeEach(() => vi.useFakeTimers());
		afterEach(() => vi.useRealTimers());

		it('la guía espera a que termine la carga del avance, con éxito o con error', () => {
			load();
			expect(facade.progressReady()).toBe(false);
			httpMock.expectOne(PROGRESS_API).flush('', { status: 500, statusText: 'Server Error' });

			expect(facade.progressReady()).toBe(true);
			expect(facade.progressSummary()).toEqual({});
		});

		it('resume el avance de cada guía: en curso, terminada y nunca vista sin marca', () => {
			loadWith([saved(20, [0, 1], 1, 3), saved(21, [0, 1], 1, 2)]);

			expect(facade.progressSummary()).toEqual({
				20: { status: 'en-curso', done: 2, total: 3, step: 2, fecha: '2026-11-17T10:00:00Z' },
				21: { status: 'terminada', done: 2, total: 2, step: 2, fecha: '2026-11-17T10:00:00Z' },
			});
			expect(facade.progressSummary()[2]).toBeUndefined();
		});

		it('recorta el avance guardado a los pasos que tiene hoy la guía', () => {
			loadWith([saved(20, [0, 4], 4, 5)]);

			expect(facade.progressSummary()[20]).toMatchObject({ status: 'en-curso', done: 1, total: 3, step: 2 });
		});

		it('«Retomar» lista solo las guías en curso, la más reciente primero y con tope', () => {
			const [g1, g2, g3, g4] = [30, 31, 32, 33].map((id) => guia(id, 4));
			loadWith(
				[
					saved(30, [0], 0, 4, '2026-11-17T08:00:00Z'),
					saved(31, [0], 0, 4, '2026-11-17T12:00:00Z'),
					saved(32, [0], 0, 4, '2026-11-17T10:00:00Z'),
					saved(33, [0], 0, 4, '2026-11-17T09:00:00Z'),
					saved(21, [0, 1], 1, 2, '2026-11-17T13:00:00Z'), // terminada: no entra
				],
				[g1, g2, g3, g4, G21],
			);

			expect(facade.retomar().map((i) => i.faq.id)).toEqual([31, 32, 33]);
		});

		it('sin guías en curso «Retomar» queda vacío', () => {
			loadWith([saved(21, [0, 1], 1, 2)]);

			expect(facade.retomar()).toEqual([]);
		});

		it('la pregunta abierta recibe su avance guardado', () => {
			loadWith([saved(20, [0], 0, 3)]);

			facade.select(20);

			expect(facade.selectedProgress()).toEqual({ done: [0], current: 0 });
			facade.select(1);
			expect(facade.selectedProgress()).toBeNull();
		});

		it('marcar se refleja al instante y el guardado se agrupa en un solo PUT', () => {
			loadWith([]);

			facade.saveProgress(20, { done: [0], current: 1 });
			facade.saveProgress(20, { done: [0, 1], current: 2 });
			facade.saveProgress(20, { done: [0, 1, 2], current: 2 });

			expect(facade.progressSummary()[20].status).toBe('terminada');
			vi.advanceTimersByTime(799);
			httpMock.expectNone(putUrl(20));

			vi.advanceTimersByTime(1);
			const put = httpMock.expectOne(putUrl(20));
			expect(put.request.method).toBe('PUT');
			expect(put.request.body).toEqual({ hechos: [0, 1, 2], actual: 2, totalPasos: 3 });
			expect(put.request.headers.get('X-Skip-Error-Toast')).toBe('true');
		});

		it('el PUT omite `actual` cuando no hay paso actual', () => {
			loadWith([]);

			facade.saveProgress(20, { done: [1], current: null });
			vi.advanceTimersByTime(800);

			expect(httpMock.expectOne(putUrl(20)).request.body).toEqual({ hechos: [1], totalPasos: 3 });
		});

		it('no reenvía un estado igual al que el servidor ya tiene', () => {
			loadWith([saved(20, [0], 0, 3)]);

			facade.saveProgress(20, { done: [0], current: 0 });
			vi.advanceTimersByTime(800);

			httpMock.expectNone(putUrl(20));
		});

		it('«Reiniciar» borra el avance enviando `hechos` vacío, y sin nada guardado no envía nada', () => {
			loadWith([saved(20, [0], 0, 3)]);

			facade.saveProgress(20, { done: [], current: null });
			expect(facade.progressSummary()[20]).toBeUndefined();
			vi.advanceTimersByTime(800);
			expect(httpMock.expectOne(putUrl(20)).request.body).toEqual({ hechos: [], totalPasos: 3 });

			facade.saveProgress(21, { done: [], current: null });
			vi.advanceTimersByTime(800);
			httpMock.expectNone(putUrl(21));
		});

		it('un guardado pendiente se envía al cambiar de pregunta, sin esperar el debounce', () => {
			loadWith([]);
			facade.select(20);

			facade.saveProgress(20, { done: [0], current: 1 });
			facade.select(null);

			expect(httpMock.expectOne(putUrl(20)).request.body.hechos).toEqual([0]);
		});

		it('si el servidor falla (500) conserva el avance en memoria y la siguiente acción reenvía todo', () => {
			loadWith([]);
			facade.saveProgress(20, { done: [0], current: 1 });
			vi.advanceTimersByTime(800);
			httpMock.expectOne(putUrl(20)).flush('', { status: 500, statusText: 'Server Error' });

			expect(facade.progressSummary()[20]).toMatchObject({ status: 'en-curso', done: 1 });
			vi.advanceTimersByTime(60_000);
			httpMock.expectNone(putUrl(20)); // no reintenta por su cuenta

			facade.saveProgress(20, { done: [0, 1], current: 2 });
			vi.advanceTimersByTime(800);
			expect(httpMock.expectOne(putUrl(20)).request.body).toEqual({ hechos: [0, 1], actual: 2, totalPasos: 3 });
		});

		it.each([400, 404, 429])('%i no se reintenta y el avance sigue en memoria', (status) => {
			loadWith([]);
			facade.saveProgress(20, { done: [0], current: 1 });
			vi.advanceTimersByTime(800);
			httpMock.expectOne(putUrl(20)).flush('', { status, statusText: 'Error' });

			vi.advanceTimersByTime(60_000);

			httpMock.expectNone(putUrl(20));
			expect(facade.progressSummary()[20]).toBeDefined();
		});

		it('503 reintenta una sola vez tras `Retry-After`', () => {
			loadWith([]);
			facade.saveProgress(20, { done: [0], current: 1 });
			vi.advanceTimersByTime(800);
			httpMock.expectOne(putUrl(20)).flush('', { status: 503, statusText: 'Unavailable', headers: { 'Retry-After': '2' } });

			vi.advanceTimersByTime(1999);
			httpMock.expectNone(putUrl(20));
			vi.advanceTimersByTime(1);
			httpMock.expectOne(putUrl(20)).flush('', { status: 503, statusText: 'Unavailable', headers: { 'Retry-After': '2' } });

			vi.advanceTimersByTime(60_000);
			httpMock.expectNone(putUrl(20));
		});

		it('la espera de un 503 tiene tope aunque `Retry-After` pida más', () => {
			loadWith([]);
			facade.saveProgress(20, { done: [0], current: 1 });
			vi.advanceTimersByTime(800);
			httpMock.expectOne(putUrl(20)).flush('', { status: 503, statusText: 'Unavailable', headers: { 'Retry-After': '120' } });

			vi.advanceTimersByTime(10_000);

			expect(httpMock.expectOne(putUrl(20))).toBeTruthy();
		});

		it('un cambio durante un PUT en vuelo espera a que termine para que no se pisen', () => {
			loadWith([]);
			facade.saveProgress(20, { done: [0], current: 1 });
			vi.advanceTimersByTime(800);
			const primero = httpMock.expectOne(putUrl(20));

			facade.saveProgress(20, { done: [0, 1], current: 2 });
			vi.advanceTimersByTime(800);
			httpMock.expectNone(putUrl(20));

			primero.flush({ faqId: 20, hechos: [0], totalPasos: 3 });
			expect(httpMock.expectOne(putUrl(20)).request.body).toEqual({ hechos: [0, 1], actual: 2, totalPasos: 3 });
		});

		it('al salir de la sección se envía lo que estaba por guardarse', () => {
			// El facade vive en el componente (no en la raíz): se destruye con él, con HttpClient aún operativo.
			const host = TestBed.createComponent(FacadeHostComponent);
			const scoped = host.debugElement.injector.get(AyudaQaFacade);
			scoped.init();
			httpMock.expectOne(FAQ_API).flush([...FAQS, G20]);
			httpMock.expectOne(PROGRESS_API).flush([]);
			scoped.saveProgress(20, { done: [0], current: 1 });

			host.destroy();

			expect(httpMock.expectOne(putUrl(20)).request.body).toEqual({ hechos: [0], actual: 1, totalPasos: 3 });
		});

		it('una guía sin pasos no se envía', () => {
			loadWith([]);

			facade.saveProgress(1, { done: [0], current: 0 }); // FAQ 1 no tiene guía
			vi.advanceTimersByTime(800);

			httpMock.expectNone(putUrl(1));
		});
	});
});
