import { ComponentFixture, TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FileViewerService } from '@shared/components';
import type { EntregaCalificacionDto } from '@features/intranet/pages/profesor/models';
import { CalificarEntregaComponent } from './calificar-entrega.component';

const archivo = {
	id: 1,
	estudianteId: 2,
	nombreArchivo: 'informe.pdf',
	urlArchivo: 'https://blob/informe.pdf',
	tipoArchivo: 'application/pdf',
	tamanoBytes: 1024,
	fechaReg: '2026-10-02T09:30:00',
};

const entrega = (over: Partial<EntregaCalificacionDto> = {}): EntregaCalificacionDto => ({
	estudianteId: 2,
	estudianteNombre: 'Ana Pérez',
	estudianteDni: '12345678',
	estado: 'ENTREGADO',
	fechaEntrega: '2026-10-02T09:30:00',
	grupoId: null,
	grupoNombre: null,
	archivos: [archivo],
	...over,
});

describe('CalificarEntregaComponent', () => {
	let fixture: ComponentFixture<CalificarEntregaComponent>;
	const el = () => fixture.nativeElement as HTMLElement;

	function render(dto: EntregaCalificacionDto, autores: { estudianteId: number; nombre: string }[] = []): void {
		fixture = TestBed.createComponent(CalificarEntregaComponent);
		fixture.componentRef.setInput('entrega', dto);
		fixture.componentRef.setInput('autores', autores);
		fixture.detectChanges();
	}

	beforeEach(() => TestBed.configureTestingModule({ imports: [CalificarEntregaComponent] }));
	afterEach(() => vi.restoreAllMocks());

	it('muestra «Entregado», la fecha y el archivo abrible', () => {
		render(entrega());

		expect(el().textContent).toContain('Entregado');
		expect(el().textContent).toContain('02/10/2026 09:30');
		expect(el().querySelectorAll('app-file-row')).toHaveLength(1);
	});

	it('muestra «Entrega tardía» para TARDIO', () => {
		render(entrega({ estado: 'TARDIO' }));

		expect(el().textContent).toContain('Entrega tardía');
	});

	it('muestra «Sin entregar» sin fecha ni archivos para PENDIENTE', () => {
		render(entrega({ estado: 'PENDIENTE', fechaEntrega: null, archivos: [] }));

		expect(el().textContent).toContain('Sin entregar');
		expect(el().querySelector('.entrega__fecha')).toBeNull();
		expect(el().querySelectorAll('app-file-row')).toHaveLength(0);
	});

	it('abre el archivo en el visor compartido al hacer clic', () => {
		render(entrega());
		const openSpy = vi.spyOn(TestBed.inject(FileViewerService), 'open').mockImplementation(() => undefined);

		(el().querySelector('.file-row__info') as HTMLButtonElement).click();

		expect(openSpy).toHaveBeenCalledWith(
			expect.objectContaining({ name: 'informe.pdf', url: 'https://blob/informe.pdf' }),
		);
	});

	it('rotula cada archivo grupal con el nombre de quien lo subió', () => {
		render(entrega({ grupoId: 5 }), [{ estudianteId: 2, nombre: 'Ana Pérez' }]);

		expect(el().querySelector('.entrega__autor')?.textContent).toContain('Ana Pérez');
	});

	it('no rotula el archivo si el autor no está entre los miembros', () => {
		render(entrega({ grupoId: 5 }), [{ estudianteId: 99, nombre: 'Otro' }]);

		expect(el().querySelector('.entrega__autor')).toBeNull();
	});
});
