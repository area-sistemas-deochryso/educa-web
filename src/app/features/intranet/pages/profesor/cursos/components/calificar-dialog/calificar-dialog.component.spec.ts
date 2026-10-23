import { ComponentFixture, TestBed } from '@angular/core/testing';
import { afterEach, describe, expect, it } from 'vitest';
import type { CalificacionConNotasDto, GrupoContenidoDto } from '@features/intranet/pages/profesor/models';
import { CalificarDialogComponent } from './calificar-dialog.component';

const cal = (over: Partial<CalificacionConNotasDto> = {}): CalificacionConNotasDto =>
	({
		id: 10,
		titulo: 'Práctica 1',
		tipo: 'Tarea',
		peso: 0.2,
		fechaEvaluacion: '2026-10-05T00:00:00',
		numeroSemana: 3,
		esGrupal: false,
		tareaId: null,
		notas: [],
		entregas: [],
		...over,
	}) as CalificacionConNotasDto;

describe('CalificarDialogComponent — entrega y estado vacío grupal', () => {
	let fixture: ComponentFixture<CalificarDialogComponent>;

	function render(inputs: Record<string, unknown>): void {
		TestBed.configureTestingModule({ imports: [CalificarDialogComponent] });
		fixture = TestBed.createComponent(CalificarDialogComponent);
		fixture.componentRef.setInput('visible', true);
		for (const [name, value] of Object.entries(inputs)) fixture.componentRef.setInput(name, value);
		fixture.detectChanges();
	}

	const anchor = (name: string) => document.body.querySelector<HTMLElement>(`[data-info-anchor="${name}"]`);

	afterEach(() => {
		fixture?.destroy();
		TestBed.resetTestingModule();
	});

	describe('evaluación grupal sin grupos', () => {
		it('dice qué hacer y ofrece ir a crear los grupos', () => {
			render({ calificacion: cal({ esGrupal: true }), grupos: [], gruposCargados: true });
			let pedido = false;
			fixture.componentInstance.irACrearGrupos.subscribe(() => (pedido = true));

			expect(document.body.textContent).toContain('el curso todavía no tiene grupos');
			(anchor('profesor-calificar-crear-grupos')?.querySelector('button') ?? anchor('profesor-calificar-crear-grupos'))?.click();

			expect(pedido).toBe(true);
		});

		it('no afirma que no hay grupos mientras todavía se cargan', () => {
			render({ calificacion: cal({ esGrupal: true }), grupos: [], gruposCargados: false });

			expect(anchor('profesor-calificar-sin-grupos')).toBeNull();
		});

		it('no muestra el estado vacío si el curso sí tiene grupos', () => {
			const grupos = [
				{ id: 5, nombre: 'Grupo 5', estudiantes: [{ estudianteId: 1, estudianteNombre: 'Ana' }] },
			] as unknown as GrupoContenidoDto[];
			render({ calificacion: cal({ esGrupal: true }), grupos, gruposCargados: true });

			expect(anchor('profesor-calificar-sin-grupos')).toBeNull();
		});

		it('no lo muestra en una evaluación individual aunque no haya grupos', () => {
			render({ calificacion: cal({ esGrupal: false }), grupos: [], gruposCargados: true });

			expect(anchor('profesor-calificar-sin-grupos')).toBeNull();
		});
	});

	describe('«Ver entregas de la tarea»', () => {
		it('se ofrece con tarea enlazada cuando quien aloja el diálogo sabe abrirlas', () => {
			render({ calificacion: cal({ tareaId: 7 }), puedeVerEntregas: true });

			expect(anchor('profesor-calificar-ver-entregas')).not.toBeNull();
		});

		it('no se ofrece sin tarea enlazada', () => {
			render({ calificacion: cal({ tareaId: null }), puedeVerEntregas: true });

			expect(anchor('profesor-calificar-ver-entregas')).toBeNull();
		});

		it('no se ofrece si el anfitrión no puede abrirlas (botón muerto)', () => {
			render({ calificacion: cal({ tareaId: 7 }), puedeVerEntregas: false });

			expect(anchor('profesor-calificar-ver-entregas')).toBeNull();
		});
	});
});
