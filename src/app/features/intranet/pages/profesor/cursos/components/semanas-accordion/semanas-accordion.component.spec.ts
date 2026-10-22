import { FileViewerService } from '@shared/components';
import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ErrorHandlerService } from '@core/services';
import { UPLOAD_LIMITS, describeUploadLimits } from '@shared/components';
import { CursoContenidoCrudFacade } from '../../services/curso-contenido-crud.facade';
import { CursoContenidoDataFacade } from '../../services/curso-contenido-data.facade';
import { CursoContenidoPublicacionFacade } from '../../services/curso-contenido-publicacion.facade';
import { CursoContenidoUiFacade } from '../../services/curso-contenido-ui.facade';
import { SemanasAccordionComponent } from './semanas-accordion.component';

const semanas = [
	{
		id: 1,
		numeroSemana: 1,
		titulo: 'Intro',
		archivos: [
			{ id: 10, nombreArchivo: 'guia.pdf', urlArchivo: 'https://blob/guia.pdf', tipoArchivo: 'application/pdf', tamanoBytes: 2048, fechaReg: '2026-10-01' },
		],
		tareas: [
			{
				id: 20,
				titulo: 'Tarea 1',
				descripcion: null,
				fechaLimite: null,
				esGrupal: false,
				fechaReg: '2026-10-01',
				archivos: [
					{ id: 30, nombreArchivo: 'rubrica.pptx', urlArchivo: 'https://blob/rubrica.pptx', tipoArchivo: null, tamanoBytes: 5 * 1024 * 1024 },
				],
			},
		],
	},
];

describe('SemanasAccordionComponent', () => {
	let fixture: ComponentFixture<SemanasAccordionComponent>;
	let component: SemanasAccordionComponent;
	const crud = { uploadArchivo: vi.fn(), uploadTareaArchivo: vi.fn() };
	const errorHandler = { showWarning: vi.fn() };

	beforeEach(() => {
		vi.clearAllMocks();
		TestBed.configureTestingModule({
			imports: [SemanasAccordionComponent],
			providers: [
				{ provide: CursoContenidoUiFacade, useValue: { vm: signal({ semanas }) } },
				{ provide: CursoContenidoDataFacade, useValue: { refreshContenido: vi.fn() } },
				{ provide: CursoContenidoCrudFacade, useValue: crud },
				{ provide: ErrorHandlerService, useValue: errorHandler },
			],
		});
		fixture = TestBed.createComponent(SemanasAccordionComponent);
		component = fixture.componentInstance;
		component.openPanels.set([1]);
		fixture.detectChanges();
	});

	afterEach(() => vi.restoreAllMocks());

	const el = () => fixture.nativeElement as HTMLElement;
	const file = (name: string, size = 1024) => ({ name, size }) as File;

	it('renderiza archivos de semana y de tarea con app-file-row; la subida de material va por el menú Agregar y la de tarea por edu-file-upload', () => {
		expect(el().querySelectorAll('app-file-row').length).toBe(2);
		expect(el().querySelectorAll('edu-file-upload').length).toBe(1);
		expect(el().querySelector('input[type="file"]')).not.toBeNull();
	});

	it('muestra el aviso de formatos y tamaño en la subida de material y en la de adjuntos de tarea, asociado a cada control', () => {
		const expected = describeUploadLimits();
		const materialHint = el().querySelector('#material-hint-1') as HTMLElement;
		expect(materialHint.textContent?.trim()).toBe(expected);
		const buttons = Array.from(el().querySelectorAll('edu-button button'));
		expect(buttons.some((b) => b.getAttribute('aria-describedby') === 'material-hint-1')).toBe(true);

		const tareaUpload = el().querySelector('edu-file-upload') as HTMLElement;
		const tareaHint = tareaUpload.querySelector('.edu-file-upload__hint') as HTMLElement;
		expect(tareaHint.textContent?.trim()).toBe(expected);
		expect(tareaUpload.querySelector('button')?.getAttribute('aria-describedby')).toBe(tareaHint.id);
	});

	it('no muestra el aviso de subida en la vista de estudiante', () => {
		component.studentView.set(true);
		fixture.detectChanges();
		expect(el().querySelector('#material-hint-1')).toBeNull();
	});

	it('(open) delega en el visor compartido con name y url del archivo', () => {
		const openSpy = vi.spyOn(TestBed.inject(FileViewerService), 'open').mockImplementation(() => undefined);
		(el().querySelector('app-file-row .file-row__info') as HTMLButtonElement).click();
		expect(openSpy).toHaveBeenCalledWith(expect.objectContaining({ name: 'guia.pdf', url: 'https://blob/guia.pdf' }));
	});

	it('rechaza un tipo de archivo no permitido y avisa', () => {
		component.onFilesSelected({ files: [file('virus.exe')] }, 1);
		expect(errorHandler.showWarning).toHaveBeenCalledWith('Archivo no válido', 'Tipo de archivo no permitido.');
		expect(crud.uploadArchivo).not.toHaveBeenCalled();
	});

	it('rechaza un archivo de más de 100 MB y avisa', () => {
		component.onTareaFilesSelected({ files: [file('grande.pdf', UPLOAD_LIMITS.maxFileSizeBytes + 1)] }, 1, 20);
		expect(errorHandler.showWarning).toHaveBeenCalledWith('Archivo no válido', 'El archivo supera el tamaño máximo de 100 MB.');
		expect(crud.uploadTareaArchivo).not.toHaveBeenCalled();
	});

	it('envía un archivo válido al facade', () => {
		const pdf = file('guia.pdf');
		component.onFilesSelected({ files: [pdf] }, 1);
		component.onTareaFilesSelected({ files: [pdf] }, 1, 20);
		expect(crud.uploadArchivo).toHaveBeenCalledWith(1, pdf);
		expect(crud.uploadTareaArchivo).toHaveBeenCalledWith(1, 20, pdf);
		expect(errorHandler.showWarning).not.toHaveBeenCalled();
	});
});

describe('SemanasAccordionComponent — semana vigente (P110-F14)', () => {
	const dosSemanas = [
		{ id: 1, numeroSemana: 1, titulo: null, archivos: [], tareas: [] },
		{ id: 2, numeroSemana: 2, titulo: null, archivos: [], tareas: [] },
	];

	function create(contenido: { semanaVigente?: number | null } | null) {
		TestBed.configureTestingModule({
			imports: [SemanasAccordionComponent],
			providers: [
				{ provide: CursoContenidoUiFacade, useValue: { vm: signal({ semanas: dosSemanas, contenido }) } },
				{ provide: CursoContenidoDataFacade, useValue: { refreshContenido: vi.fn() } },
				{ provide: CursoContenidoCrudFacade, useValue: {} },
				{ provide: ErrorHandlerService, useValue: { showWarning: vi.fn() } },
			],
		});
		const fixture = TestBed.createComponent(SemanasAccordionComponent);
		fixture.detectChanges();
		return { fixture, component: fixture.componentInstance, el: fixture.nativeElement as HTMLElement };
	}

	const scrollIntoView = vi.fn();
	beforeEach(() => {
		scrollIntoView.mockClear();
		// jsdom no implementa scrollIntoView.
		Element.prototype.scrollIntoView = scrollIntoView;
	});

	it('expande y destaca la semana vigente y lleva la vista hasta ella; las demás quedan colapsadas', async () => {
		const { fixture, component, el } = create({ semanaVigente: 2 });
		fixture.detectChanges();
		await new Promise((resolve) => setTimeout(resolve));

		expect(scrollIntoView).toHaveBeenCalledOnce();

		expect(component.openPanels()).toEqual([2]);
		expect(el.querySelectorAll('.week-vigente-tag').length).toBe(1);
		expect(el.querySelector('[data-semana-vigente="true"]')?.textContent).toContain('Semana 2');
	});

	it('sin semanaVigente no expande ni destaca nada', async () => {
		const { component, el } = create({});
		await new Promise((resolve) => setTimeout(resolve));

		expect(scrollIntoView).not.toHaveBeenCalled();

		expect(component.openPanels()).toEqual([]);
		expect(el.querySelector('.week-vigente-tag')).toBeNull();
	});

	it('con una semanaVigente fuera de rango no rompe ni destaca nada', () => {
		const { component, el } = create({ semanaVigente: 52 });

		expect(component.openPanels()).toEqual([]);
		expect(el.querySelector('[data-semana-vigente]')).toBeNull();
	});
});

describe('SemanasAccordionComponent — rediseño (vista estudiante, estado de fecha)', () => {
	function create() {
		TestBed.configureTestingModule({
			imports: [SemanasAccordionComponent],
			providers: [
				{ provide: CursoContenidoUiFacade, useValue: { vm: signal({ semanas, contenido: { semanaVigente: 1 } }) } },
				{ provide: CursoContenidoDataFacade, useValue: { refreshContenido: vi.fn() } },
				{ provide: CursoContenidoCrudFacade, useValue: {} },
				{ provide: ErrorHandlerService, useValue: { showWarning: vi.fn() } },
			],
		});
		const fixture = TestBed.createComponent(SemanasAccordionComponent);
		fixture.componentInstance.openPanels.set([1]);
		fixture.detectChanges();
		return { fixture, component: fixture.componentInstance, el: fixture.nativeElement as HTMLElement };
	}

	it('vista estudiante oculta los controles de edición', () => {
		const { fixture, component, el } = create();
		expect(el.querySelector('[data-info-anchor="profesor-semanas-editar"]')).not.toBeNull();
		expect(el.querySelector('[data-info-anchor="profesor-semanas-agregar"]')).not.toBeNull();

		component.studentView.set(true);
		fixture.detectChanges();

		expect(el.querySelector('[data-info-anchor="profesor-semanas-editar"]')).toBeNull();
		expect(el.querySelector('[data-info-anchor="profesor-semanas-agregar"]')).toBeNull();
		expect(el.querySelector('[data-info-anchor="profesor-semanas-tarea-eliminar"]')).toBeNull();
		expect(el.querySelector('.student-banner')).not.toBeNull();
	});

	it('clasifica la fecha límite: vencida, pronto y normal', () => {
		const { component } = create();
		const dia = 86_400_000;
		expect(component.fechaLimiteEstado(null)).toBe('normal');
		expect(component.fechaLimiteEstado(new Date(Date.now() - dia).toISOString())).toBe('vencida');
		expect(component.fechaLimiteEstado(new Date(Date.now() + dia).toISOString())).toBe('pronto');
		expect(component.fechaLimiteEstado(new Date(Date.now() + 10 * dia).toISOString())).toBe('normal');
	});

	it('el filtro "Para estudiar" oculta el bloque de tareas', () => {
		const { fixture, component, el } = create();
		component.filtro.set('study');
		fixture.detectChanges();
		const bloques = Array.from(el.querySelectorAll('.section-label')).map((n) => n.textContent?.trim());
		expect(bloques).toEqual(['Para estudiar']);
	});
});

describe('SemanasAccordionComponent — tipos y borradores', () => {
	const semanasMixtas = [
		{
			id: 1,
			numeroSemana: 1,
			titulo: null,
			publicado: true,
			archivos: [
				{ id: 1, nombreArchivo: 'clase.pdf', urlArchivo: 'u', tipoArchivo: null, tamanoBytes: 1, fechaReg: '2026-10-01', tipo: 'CLASE', publicado: true },
				{ id: 2, nombreArchivo: 'oculto.pdf', urlArchivo: 'u', tipoArchivo: null, tamanoBytes: 1, fechaReg: '2026-10-01', tipo: 'COMPLEMENTARIO', publicado: false },
			],
			tareas: [
				{ id: 10, titulo: 'Parcial', descripcion: null, fechaLimite: null, esGrupal: false, fechaReg: '2026-10-01', archivos: [], tipo: 'EXAMEN', duracionMinutos: 45, publicado: false, entregasRecibidas: 0, entregasEsperadas: 30 },
				{ id: 11, titulo: 'Maqueta', descripcion: null, fechaLimite: null, esGrupal: true, fechaReg: '2026-10-01', archivos: [], tipo: 'ACTIVIDAD', publicado: true, entregasRecibidas: 3, entregasEsperadas: 8 },
			],
		},
		{ id: 2, numeroSemana: 2, titulo: null, publicado: false, archivos: [], tareas: [] },
	];

	function create() {
		TestBed.configureTestingModule({
			imports: [SemanasAccordionComponent],
			providers: [
				{ provide: CursoContenidoUiFacade, useValue: { vm: signal({ semanas: semanasMixtas, contenido: { semanaVigente: 1 } }) } },
				{ provide: CursoContenidoDataFacade, useValue: { refreshContenido: vi.fn() } },
				{ provide: CursoContenidoCrudFacade, useValue: {} },
				{ provide: ErrorHandlerService, useValue: { showWarning: vi.fn() } },
			],
		});
		const fixture = TestBed.createComponent(SemanasAccordionComponent);
		fixture.componentInstance.openPanels.set([1]);
		fixture.detectChanges();
		return { fixture, component: fixture.componentInstance, el: fixture.nativeElement as HTMLElement };
	}

	it('el docente ve borradores y el resumen cuenta el examen aparte de los trabajos', () => {
		const { component, el } = create();
		expect(el.textContent).toContain('oculto.pdf');
		expect(el.textContent).toContain('Parcial');
		expect(el.textContent).toContain('3/8');
		expect(el.textContent).toContain('Examen');
		expect(component.resumenes().get(1)).toMatchObject({ examenes: 1, individuales: 0, grupales: 1 });
		expect(component.semanasVista().length).toBe(2);
	});

	it('la vista estudiante oculta semanas, archivos y tareas en borrador', () => {
		const { fixture, component, el } = create();
		component.studentView.set(true);
		fixture.detectChanges();

		expect(component.semanasVista().map((s) => s.numeroSemana)).toEqual([1]);
		expect(el.textContent).toContain('clase.pdf');
		expect(el.textContent).not.toContain('oculto.pdf');
		expect(el.textContent).not.toContain('Parcial');
		expect(el.textContent).toContain('Maqueta');
		expect(el.textContent).not.toContain('3/8');
	});

	it('etiqueta cada tipo de trabajo y calcula el porcentaje de entregas', () => {
		const { component } = create();
		const [examen, actividad] = semanasMixtas[0].tareas as never[];
		expect(component.tareaEtiqueta(examen)).toBe('Examen');
		expect(component.tareaEtiqueta(actividad)).toBe('Actividad grupal');
		expect(component.entregasPorcentaje(actividad)).toBe(38);
		expect(component.entregasPorcentaje({ ...(actividad as object), entregasEsperadas: 0 } as never)).toBeNull();
	});
});

describe('SemanasAccordionComponent — archivos nuevos en borrador (P113 F4)', () => {
	const archivo = (id: number, nombre: string, publicado: boolean) => ({
		id,
		nombreArchivo: nombre,
		urlArchivo: 'u',
		tipoArchivo: null,
		tamanoBytes: 1,
		fechaReg: '2026-10-01',
		publicado,
	});
	// Estado tal como lo devuelve el BE al recargar: el borrador viene del dato, no de estado local.
	const semanasBE = [
		{
			id: 1,
			numeroSemana: 1,
			titulo: null,
			publicado: true,
			archivos: [{ ...archivo(1, 'material-borrador.pdf', false), tipo: 'CLASE' }, { ...archivo(2, 'material-publicado.pdf', true), tipo: 'CLASE' }],
			tareas: [
				{
					id: 10,
					titulo: 'Tarea',
					descripcion: null,
					fechaLimite: null,
					esGrupal: false,
					fechaReg: '2026-10-01',
					tipo: 'TAREA',
					publicado: true,
					archivos: [archivo(3, 'adjunto-borrador.pdf', false), archivo(4, 'adjunto-publicado.pdf', true)],
				},
			],
		},
	];
	const publicacion = { cambiarPublicacionArchivo: vi.fn(), cambiarPublicacionTareaArchivo: vi.fn(), cambiarPublicacionTarea: vi.fn(), cambiarPublicacionSemana: vi.fn() };

	function create() {
		TestBed.configureTestingModule({
			imports: [SemanasAccordionComponent],
			providers: [
				{ provide: CursoContenidoUiFacade, useValue: { vm: signal({ semanas: semanasBE, contenido: { semanaVigente: 1 } }) } },
				{ provide: CursoContenidoDataFacade, useValue: { refreshContenido: vi.fn() } },
				{ provide: CursoContenidoCrudFacade, useValue: {} },
				{ provide: CursoContenidoPublicacionFacade, useValue: publicacion },
				{ provide: ErrorHandlerService, useValue: { showWarning: vi.fn() } },
			],
		});
		const fixture = TestBed.createComponent(SemanasAccordionComponent);
		fixture.componentInstance.openPanels.set([1]);
		fixture.detectChanges();
		return { fixture, component: fixture.componentInstance, el: fixture.nativeElement as HTMLElement };
	}

	beforeEach(() => vi.clearAllMocks());

	it('el docente ve «Borrador» solo en lo que está en borrador y «Publicada» en el resto (texto, no solo color)', () => {
		const { el } = create();
		const borradores = Array.from(el.querySelectorAll('.pub-tag--draft'));
		const publicados = Array.from(el.querySelectorAll('.pub-tag:not(.pub-tag--draft)'));

		expect(borradores).toHaveLength(2);
		expect(borradores.every((m) => m.textContent?.trim() === 'Borrador')).toBe(true);
		expect(publicados.length).toBeGreaterThan(0);
		expect(publicados.every((m) => m.textContent?.trim() === 'Publicada')).toBe(true);
	});

	it('los controles de publicación tienen texto («Publicar» / «Despublicar»), no solo ícono', () => {
		const { el } = create();
		const textos = Array.from(el.querySelectorAll('.pub-toggle')).map((b) => b.textContent?.trim());

		expect(textos).toContain('Publicar');
		expect(textos).toContain('Despublicar');
		expect(textos.every((t) => t === 'Publicar' || t === 'Despublicar')).toBe(true);
	});

	it('el archivo en borrador ofrece «Publicar» y el publicado «Pasar a borrador»', () => {
		const { el } = create();

		expect(el.querySelectorAll('button[aria-label="Publicar archivo"]')).toHaveLength(1);
		expect(el.querySelectorAll('button[aria-label="Pasar archivo a borrador"]')).toHaveLength(1);
		expect(el.querySelectorAll('button[aria-label="Publicar archivo de tarea"]')).toHaveLength(1);
		expect(el.querySelectorAll('button[aria-label="Pasar archivo de tarea a borrador"]')).toHaveLength(1);
	});

	it('publicar un adjunto de tarea delega en la fachada con el estado contrario al actual', () => {
		const { component } = create();

		component.togglePublicacionTareaArchivo(1, 10, semanasBE[0].tareas[0].archivos[0]);
		component.togglePublicacionTareaArchivo(1, 10, semanasBE[0].tareas[0].archivos[1]);

		expect(publicacion.cambiarPublicacionTareaArchivo).toHaveBeenNthCalledWith(1, 1, 10, 3, true, expect.any(Function));
		expect(publicacion.cambiarPublicacionTareaArchivo).toHaveBeenNthCalledWith(2, 1, 10, 4, false, expect.any(Function));
	});

	it('al confirmarse el servidor, avisa el efecto sobre los estudiantes y «Deshacer» revierte sin volver a avisar', () => {
		const { fixture, component, el } = create();

		component.togglePublicacionTarea(1, semanasBE[0].tareas[0] as never);
		const [, , publicar, onCommitted] = publicacion.cambiarPublicacionTarea.mock.calls[0];
		expect(publicar).toBe(false);
		expect(el.querySelector('.publicacion-toast__summary')).toBeNull();

		onCommitted();
		fixture.detectChanges();
		expect(el.querySelector('.publicacion-toast__summary')?.textContent?.trim()).toBe('Tarea en borrador');
		expect(el.textContent).toContain('Los estudiantes ya no la ven.');

		(Array.from(el.querySelectorAll('.edu-toast button')).find((b) => b.textContent?.trim() === 'Deshacer') as HTMLElement).click();
		expect(publicacion.cambiarPublicacionTarea).toHaveBeenLastCalledWith(1, 10, true);
	});

	it('la vista estudiante no muestra archivos en borrador (ni de semana ni de tarea) ni las acciones de publicar', () => {
		const { fixture, component, el } = create();
		component.studentView.set(true);
		fixture.detectChanges();

		expect(el.textContent).not.toContain('material-borrador.pdf');
		expect(el.textContent).not.toContain('adjunto-borrador.pdf');
		expect(el.textContent).toContain('material-publicado.pdf');
		expect(el.textContent).toContain('adjunto-publicado.pdf');
		expect(el.querySelectorAll('.pub-tag')).toHaveLength(0);
		expect(el.querySelectorAll('.pub-toggle')).toHaveLength(0);
	});
});
