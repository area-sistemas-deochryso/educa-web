import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { of } from 'rxjs';

import { ConnectivityService } from '@core/services/connectivity';
import type { PagoAdjunto } from '@data/models';
import { PagoAdjuntosApiService } from '../services/pago-adjuntos-api.service';
import { PagoAdjuntosComponent } from './pago-adjuntos.component';

const downloadBlob = vi.hoisted(() => vi.fn());
vi.mock('@core/helpers', async (importOriginal) => ({
	...(await importOriginal<typeof import('@core/helpers')>()),
	downloadBlob,
}));

function adjunto(id: number, activo = true): PagoAdjunto {
	return {
		id,
		pagoId: 7,
		nombreOriginal: `voucher-${id}.pdf`,
		tipoContenido: 'application/pdf',
		tamanoBytes: 2048,
		activo,
		usuarioReg: 'caja',
		fechaReg: '2026-11-26T10:00:00',
		motivoBaja: activo ? null : 'duplicado',
		usuarioBaja: activo ? null : 'caja',
		fechaBaja: activo ? null : '2026-11-26T11:00:00',
	};
}

describe('PagoAdjuntosComponent', () => {
	let fixture: ComponentFixture<PagoAdjuntosComponent>;
	const online = signal(true);
	const api = { listar: vi.fn(), subir: vi.fn(), descargar: vi.fn(), darDeBaja: vi.fn() };

	function crear(vigente = true): HTMLElement {
		fixture = TestBed.createComponent(PagoAdjuntosComponent);
		fixture.componentRef.setInput('pagoId', 7);
		fixture.componentRef.setInput('vigente', vigente);
		fixture.detectChanges();
		return fixture.nativeElement as HTMLElement;
	}

	const q = (el: HTMLElement, id: string) => el.querySelector(`[data-testid="${id}"]`) as HTMLElement | null;

	beforeEach(() => {
		online.set(true);
		downloadBlob.mockReset();
		api.listar.mockReset().mockReturnValue(of([]));
		api.subir.mockReset().mockReturnValue(of(adjunto(5)));
		api.descargar.mockReset().mockReturnValue(of({ blob: new Blob(['x']), fileName: 'voucher-1.pdf' }));
		api.darDeBaja.mockReset().mockReturnValue(of({}));
		TestBed.configureTestingModule({
			providers: [
				{ provide: PagoAdjuntosApiService, useValue: api },
				{ provide: ConnectivityService, useValue: { isOnline: online } },
			],
		});
	});

	it('lee los vouchers del pago y avisa cuando no hay ninguno', () => {
		const el = crear();
		expect(api.listar).toHaveBeenCalledWith(7);
		expect(q(el, 'adjuntos-vacio')).not.toBeNull();
		expect(q(el, 'elegir-archivo')).not.toBeNull();
	});

	it('lista los vouchers activos y los dados de baja aparte', () => {
		api.listar.mockReturnValue(of([adjunto(1), adjunto(2, false)]));
		const el = crear();
		expect(el.querySelectorAll('[data-testid="adjunto"]')).toHaveLength(1);
		expect(el.querySelectorAll('[data-testid="adjunto-baja"]')).toHaveLength(1);
		expect(el.textContent).toContain('duplicado');
	});

	it('un pago anulado muestra sus vouchers pero no ofrece agregar ni dar de baja (INV-PG01)', () => {
		api.listar.mockReturnValue(of([adjunto(1)]));
		const el = crear(false);
		expect(q(el, 'adjuntos-anulado')).not.toBeNull();
		expect(q(el, 'elegir-archivo')).toBeNull();
		expect(q(el, 'pedir-baja')).toBeNull();
		expect(q(el, 'ver-adjunto')).not.toBeNull();
	});

	it('sin conexión muestra el aviso y deshabilita elegir y subir', () => {
		online.set(false);
		const el = crear();
		expect(q(el, 'adjuntos-sin-conexion')).not.toBeNull();
		expect(q(el, 'elegir-archivo')?.querySelector('button')?.disabled).toBe(true);
	});

	it('con 3 activos no ofrece agregar otro', () => {
		api.listar.mockReturnValue(of([adjunto(1), adjunto(2), adjunto(3)]));
		const el = crear();
		expect(q(el, 'elegir-archivo')).toBeNull();
		expect(q(el, 'adjuntos-limite')).not.toBeNull();
	});

	it('dar de baja pide motivo en línea y recién entonces llama al servidor', () => {
		api.listar.mockReturnValue(of([adjunto(1)]));
		const el = crear();
		q(el, 'pedir-baja')?.querySelector('button')?.click();
		fixture.detectChanges();
		const confirmar = q(el, 'confirmar-baja')?.querySelector('button') as HTMLButtonElement;
		expect(confirmar.disabled).toBe(true);
		expect(api.darDeBaja).not.toHaveBeenCalled();

		const motivo = q(el, 'motivo-baja') as HTMLTextAreaElement;
		motivo.value = 'subí el equivocado';
		motivo.dispatchEvent(new Event('input'));
		fixture.detectChanges();
		confirmar.click();
		expect(api.darDeBaja).toHaveBeenCalledWith(7, 1, 'subí el equivocado');
	});

	it('elegir un archivo inválido muestra el motivo y no deja subirlo', () => {
		const el = crear();
		const entrada = el.querySelector('input[type="file"]') as HTMLInputElement;
		const gif = new File(['x'], 'v.gif', { type: 'image/gif' });
		Object.defineProperty(entrada, 'files', { value: [gif], configurable: true });
		entrada.dispatchEvent(new Event('change'));
		fixture.detectChanges();
		expect(q(el, 'adjuntos-error')?.textContent).toContain('PDF, JPG o PNG');
		expect(q(el, 'subir-adjunto')).toBeNull();
	});

	it('elegir un PDF válido muestra la vista previa y lo sube al confirmar', () => {
		const el = crear();
		const entrada = el.querySelector('input[type="file"]') as HTMLInputElement;
		const pdf = new File(['%PDF'], 'v.pdf', { type: 'application/pdf' });
		Object.defineProperty(entrada, 'files', { value: [pdf], configurable: true });
		entrada.dispatchEvent(new Event('change'));
		fixture.detectChanges();
		expect(q(el, 'adjunto-previa')?.textContent).toContain('v.pdf');
		(q(el, 'subir-adjunto')?.querySelector('button') as HTMLButtonElement).click();
		fixture.detectChanges();
		expect(api.subir).toHaveBeenCalledWith(7, pdf);
		expect(q(el, 'adjunto-previa')).toBeNull();
	});
});
