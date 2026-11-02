import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { of } from 'rxjs';

import type { QuienesDeben } from '@data/models';
import { PagosApiService } from '../services/pagos-api.service';
import { QuienesDebenComponent } from './quienes-deben.component';

const RESPONSE: QuienesDeben = {
	fecha: '2026-11-02',
	anioSinParametros: false,
	totales: { alumnos: 0, cuotas: 0, deuda: 0 },
	salones: [],
	filas: { data: [], total: 0, page: 1, pageSize: 10 },
};

/**
 * Prueba de cableado en el DOM: el facade ya se prueba aparte, pero un `(onClick)` en `edu-button`
 * (que no tiene esa salida) dejaba el botón mudo sin que ningún test del facade lo notara.
 */
describe('QuienesDebenComponent — exportar a Excel', () => {
	const api = { deben: vi.fn(), debenExcel: vi.fn() };

	beforeEach(() => {
		api.deben.mockReset().mockReturnValue(of(RESPONSE));
		api.debenExcel.mockReset().mockReturnValue(of({ blob: new Blob(['x']), fileName: 'deben.xlsx' }));
		vi.spyOn(window.URL, 'createObjectURL').mockReturnValue('blob:test');
		vi.spyOn(window.URL, 'revokeObjectURL').mockImplementation(() => undefined);
		vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
		TestBed.configureTestingModule({ providers: [{ provide: PagosApiService, useValue: api }] });
	});

	it('al hacer clic en «Exportar a Excel» pide el archivo sin paginar', async () => {
		const fixture = TestBed.createComponent(QuienesDebenComponent);
		fixture.componentRef.setInput('fecha', null);
		fixture.detectChanges();
		await fixture.whenStable();

		const button = fixture.nativeElement.querySelector('edu-button') as HTMLElement;
		expect(button.textContent).toContain('Exportar a Excel');
		button.click();

		expect(api.debenExcel).toHaveBeenCalledTimes(1);
		const filtros = api.debenExcel.mock.calls[0][0];
		expect(filtros.page).toBeUndefined();
		expect(filtros.pageSize).toBeUndefined();
	});
});
