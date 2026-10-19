// * Render de la pestaña Contenido del alumno: borrador / publicado / archivos del grupo (P113 F5).
// #region Imports
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ErrorHandlerService } from '@core/services';
import { CursoHubContextService } from '@intranet-shared/components';
import { TareasPendientesService } from '@intranet-shared/services';
import { EstudianteCursosFacade } from '@features/intranet/pages/estudiante/services/estudiante-cursos.facade';
import { EstudianteCursoHubContenidoComponent } from './estudiante-curso-hub-contenido.component';
// #endregion

// #region Fixtures
type HubSlot = NonNullable<ReturnType<CursoHubContextService['slot']>>;

const tarea = (id: number, esGrupal: boolean) => ({ id, titulo: `Tarea ${id}`, tipo: 'TAREA', esGrupal, fechaLimite: null, archivos: [] });

const SEMANAS = [
	{ id: 10, numeroSemana: 1, titulo: 'Fracciones', archivos: [], tareas: [tarea(100, false), tarea(101, true)] },
];

const archivo = (id: number, nombre: string, publicado: boolean, estudianteNombre = 'Yo') => ({
	id,
	estudianteId: 1,
	estudianteNombre,
	nombreArchivo: nombre,
	urlArchivo: `https://blob/${nombre}`,
	tipoArchivo: 'application/pdf',
	tamanoBytes: 10,
	fechaReg: '2026-10-19',
	publicado,
});
// #endregion

describe('EstudianteCursoHubContenidoComponent — borrador y publicación (P113 F5)', () => {
	const vm = signal<Record<string, unknown>>({});
	const facade = {
		vm,
		loadMisArchivos: vi.fn(),
		loadMisTareaArchivos: vi.fn(),
		loadArchivosGrupoSemana: vi.fn(),
		loadArchivosGrupoTarea: vi.fn(),
		cambiarPublicacionArchivo: vi.fn(),
		cambiarPublicacionTareaArchivo: vi.fn(),
	};

	function render(extra: Record<string, unknown> = {}) {
		vm.set({
			contentLoading: false,
			contenido: { id: 8 },
			semanas: SEMANAS,
			misArchivos: {},
			misTareaArchivos: {},
			archivosGrupoSemana: {},
			archivosGrupoTarea: {},
			...extra,
		});
		const fixture = TestBed.createComponent(EstudianteCursoHubContenidoComponent);
		fixture.detectChanges();
		((fixture.nativeElement as HTMLElement).querySelector('button.edu-accordion-header') as HTMLButtonElement).click();
		fixture.detectChanges();
		return fixture.nativeElement as HTMLElement;
	}

	const text = (el: HTMLElement) => el.textContent?.replace(/\s+/g, ' ').trim() ?? '';
	const byAnchor = (root: HTMLElement, anchor: string) => Array.from(root.querySelectorAll<HTMLElement>(`[data-info-anchor="${anchor}"]`));
	const publishButton = (root: HTMLElement, label: string) => root.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`);

	beforeEach(() => {
		vi.clearAllMocks();
		TestBed.configureTestingModule({
			providers: [
				{ provide: TareasPendientesService, useValue: { nuevasIds: signal(new Set<number>()), marcarVista: vi.fn() } },
				{ provide: EstudianteCursosFacade, useValue: facade },
				{ provide: ErrorHandlerService, useValue: { showWarning: vi.fn() } },
			],
		});
		TestBed.inject(CursoHubContextService).bind(signal<HubSlot | null>({ id: 1 } as HubSlot));
	});

	describe('archivos propios de la semana', () => {
		it('un borrador lleva la marca «Borrador» con texto y la acción «Publicar»', () => {
			const root = render({ misArchivos: { 10: [archivo(1, 'resumen.pdf', false)] } });

			expect(text(root.querySelector('.draft-tag') as HTMLElement)).toBe('Borrador');
			expect(publishButton(root, 'Publicar el archivo')).not.toBeNull();
			expect(publishButton(root, 'Volver a borrador el archivo')).toBeNull();
		});

		it('un archivo publicado no lleva marca y ofrece «Volver a borrador»', () => {
			const root = render({ misArchivos: { 10: [archivo(1, 'resumen.pdf', true)] } });

			expect(root.querySelector('.draft-tag')).toBeNull();
			expect(publishButton(root, 'Volver a borrador el archivo')).not.toBeNull();
		});

		it('publicar delega en la facade con el estado contrario al actual', () => {
			const root = render({ misArchivos: { 10: [archivo(1, 'resumen.pdf', false)] } });

			publishButton(root, 'Publicar el archivo')?.click();

			expect(facade.cambiarPublicacionArchivo).toHaveBeenCalledExactlyOnceWith(10, 1, true);
		});

		it('volver a borrador delega en la facade con false', () => {
			const root = render({ misArchivos: { 10: [archivo(1, 'resumen.pdf', true)] } });

			publishButton(root, 'Volver a borrador el archivo')?.click();

			expect(facade.cambiarPublicacionArchivo).toHaveBeenCalledExactlyOnceWith(10, 1, false);
		});

		it('explica quién ve cada archivo', () => {
			const root = render();

			expect(text(byAnchor(root, 'estudiante-curso-dialog-mis-archivos-ayuda')[0])).toContain('solo tú lo ves');
		});
	});

	describe('Mi entrega', () => {
		it('un borrador de entrega lleva marca y «Publicar la entrega»; publicarlo delega en la facade', () => {
			const root = render({ misTareaArchivos: { 100: [archivo(5, 'entrega.pdf', false)] } });

			expect(text(root.querySelector('.draft-tag') as HTMLElement)).toBe('Borrador');
			publishButton(root, 'Publicar la entrega')?.click();

			expect(facade.cambiarPublicacionTareaArchivo).toHaveBeenCalledExactlyOnceWith(100, 5, true);
		});

		it('una entrega publicada ofrece volver a borrador', () => {
			const root = render({ misTareaArchivos: { 100: [archivo(5, 'entrega.pdf', true)] } });

			expect(root.querySelector('.draft-tag')).toBeNull();
			expect(publishButton(root, 'Volver a borrador la entrega')).not.toBeNull();
		});

		it('muestra «Borrador sin publicar» y no «Entregada» mientras todo es borrador', () => {
			const root = render({ misTareaArchivos: { 100: [archivo(5, 'entrega.pdf', false)], 101: [] } });

			const estados = byAnchor(root, 'estudiante-curso-dialog-tarea-estado').map(text);
			expect(estados[0]).toContain('Borrador sin publicar');
			expect(estados.join(' ')).not.toContain('Entregada');
		});

		it('la ayuda de una tarea grupal menciona al grupo y la de una individual no', () => {
			const root = render();

			const ayudas = byAnchor(root, 'estudiante-curso-dialog-mi-entrega-ayuda').map(text);
			expect(ayudas[0]).not.toContain('grupo');
			expect(ayudas[1]).toContain('tu grupo');
		});
	});

	describe('archivos del grupo', () => {
		it('lista las entregas publicadas por compañeros en una tarea grupal, con su autor y sin acciones de edición', () => {
			const root = render({ archivosGrupoTarea: { 101: [archivo(70, 'parte-ana.pdf', true, 'Ana Ruiz')] } });

			const seccion = byAnchor(root, 'estudiante-curso-dialog-entrega-grupo')[0];
			expect(text(seccion)).toContain('parte-ana.pdf');
			expect(text(seccion)).toContain('Ana Ruiz');
			expect(seccion.querySelector('edu-button')).toBeNull();
			expect(seccion.querySelector('.draft-tag')).toBeNull();
		});

		it('no muestra el bloque de grupo en una tarea individual aunque hubiera datos', () => {
			const root = render({ archivosGrupoTarea: { 100: [archivo(70, 'parte-ana.pdf', true, 'Ana Ruiz')] } });

			expect(byAnchor(root, 'estudiante-curso-dialog-entrega-grupo')).toHaveLength(0);
		});

		it('lista los archivos de semana publicados por el grupo, solo lectura', () => {
			const root = render({ archivosGrupoSemana: { 10: [archivo(80, 'apuntes-luis.pdf', true, 'Luis Paz')] } });

			const seccion = byAnchor(root, 'estudiante-curso-dialog-archivos-grupo-semana')[0];
			expect(text(seccion)).toContain('apuntes-luis.pdf');
			expect(text(seccion)).toContain('Luis Paz');
			expect(seccion.querySelector('edu-button')).toBeNull();
		});

		it('sin archivos del grupo no pinta el bloque', () => {
			const root = render();

			expect(byAnchor(root, 'estudiante-curso-dialog-archivos-grupo-semana')).toHaveLength(0);
			expect(byAnchor(root, 'estudiante-curso-dialog-entrega-grupo')).toHaveLength(0);
		});
	});
});
