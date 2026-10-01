import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ErrorHandlerService } from '@core/services';
import { UPLOAD_LIMITS } from '@shared/components';
import { CursoContenidoCrudFacade } from '../../services/curso-contenido-crud.facade';
import { CursoContenidoDataFacade } from '../../services/curso-contenido-data.facade';
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

	it('renderiza archivos de semana y de tarea con app-file-row y subida con edu-file-upload', () => {
		expect(el().querySelectorAll('app-file-row').length).toBe(2);
		expect(el().querySelectorAll('edu-file-upload').length).toBe(2);
	});

	it('(open) de una fila abre la URL en una pestaña nueva', () => {
		const openSpy = vi.spyOn(window, 'open').mockReturnValue(null);
		(el().querySelector('app-file-row .file-row__info') as HTMLButtonElement).click();
		expect(openSpy).toHaveBeenCalledWith('https://blob/guia.pdf', '_blank');
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
