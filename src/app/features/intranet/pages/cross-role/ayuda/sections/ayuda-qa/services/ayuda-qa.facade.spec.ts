// #region Imports
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { environment } from '@config/environment';
import { AuthService } from '@core/services';
import { FaqDto } from '@features/intranet/pages/cross-role/ayuda/models/faq.models';
import { AyudaQaFacade } from './ayuda-qa.facade';
// #endregion

const FAQ_API = `${environment.apiUrl}/api/faq`;

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
});
