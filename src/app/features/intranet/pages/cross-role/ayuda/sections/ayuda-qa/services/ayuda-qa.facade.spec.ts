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
});
