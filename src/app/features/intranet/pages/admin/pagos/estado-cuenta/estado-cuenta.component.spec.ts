import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { of, throwError } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import type { CuentaAjuste, CuentaCargo, CuentaPago, EstadoCuenta } from '@data/models';
import { PagosApiService } from '../services/pagos-api.service';
import { EstadoCuentaComponent } from './estado-cuenta.component';

function cargo(parcial: Partial<CuentaCargo>): CuentaCargo {
	return {
		cargoId: 1,
		concepto: 'Pensión',
		cuota: 'Marzo',
		anio: 2026,
		vencimiento: '2026-03-31T00:00:00',
		fueraDeFechaDesde: null,
		montoBase: 500,
		ajuste: 0,
		pagadoBase: 0,
		pagadoRecargo: 0,
		recargo: 0,
		recargoCongelado: false,
		recargoOrigen: 'Ninguno',
		saldo: 500,
		estado: 'Pendiente',
		datoConfirmado: true,
		anioSinParametros: false,
		...parcial,
	};
}

function pago(parcial: Partial<CuentaPago>): CuentaPago {
	return {
		pagoId: 11,
		fechaPago: '2026-11-03T00:00:00',
		horaPago: '09:30:00',
		monto: 500,
		montoAplicadoAlumno: 500,
		medio: 'EFECTIVO',
		bancoOrigen: null,
		numeroOperacion: null,
		comprobante: 'S/N',
		observaciones: null,
		vigente: true,
		motivoAnulacion: null,
		usuarioAnulacion: null,
		fechaAnulacion: null,
		usuarioReg: '::TEST',
		fechaReg: '2026-11-03T09:30:00',
		aplicaciones: [],
		...parcial,
	};
}

const cuenta: EstadoCuenta = {
	estudianteId: 280,
	estudiante: 'REVISION, ESTUDIANTE-PRUEBA',
	fecha: '2026-11-09T00:00:00',
	categoria: 'ConDeuda',
	tieneDatosSinConfirmar: true,
	cargosSinDato: 1,
	deudaVencida: 500,
	pendienteTotal: 1000,
	cargos: [
		cargo({ cargoId: 1, cuota: 'Marzo', montoBase: 500, estado: 'Vencida', saldo: 500, recargo: 20 }),
		cargo({ cargoId: 2, cuota: 'Abril', montoBase: 300, estado: 'SinDato', datoConfirmado: false, saldo: 0, recargo: 0 }),
	],
	pagos: [
		pago({ pagoId: 11, monto: 500 }),
		pago({
			pagoId: 12,
			monto: 800,
			montoAplicadoAlumno: 800,
			vigente: false,
			motivoAnulacion: 'Pago duplicado',
			usuarioAnulacion: 'admin',
			fechaAnulacion: '2026-11-08T10:00:00',
		}),
	],
	ajustes: [],
	salonId: null,
	salon: null,
};

const ajusteVigente: CuentaAjuste = {
	ajusteId: 31,
	cargoId: 1,
	tipo: 'DESCUENTO',
	monto: 50,
	motivo: 'Hermano en el colegio',
	vigente: true,
	motivoAnulacion: null,
	usuarioAnulacion: null,
	fechaAnulacion: null,
	usuarioReg: '::TEST',
	fechaReg: '2026-11-04T10:00:00',
};

type ApiAcciones = Partial<Record<'anularPago' | 'registrarAjuste' | 'anularAjuste', unknown>>;

function crear(estudianteId: string | null = '280', api: ApiAcciones = {}, datos: EstadoCuenta = cuenta) {
	const navigate = vi.fn(() => Promise.resolve(true));
	const estadoCuenta = vi.fn(() => of(datos));
	TestBed.configureTestingModule({
		imports: [EstadoCuentaComponent],
		providers: [
			{ provide: ActivatedRoute, useValue: { paramMap: of(convertToParamMap(estudianteId ? { estudianteId } : {})) } },
			{ provide: Router, useValue: { navigate } },
			{ provide: PagosApiService, useValue: { estadoCuenta, buscarEstudiantes: () => of([]), ...api } },
		],
	});
	const fixture = TestBed.createComponent(EstadoCuentaComponent);
	fixture.detectChanges();
	return { fixture, navigate, estadoCuenta, texto: () => (fixture.nativeElement as HTMLElement).textContent ?? '' };
}

function celdasDeConcepto(root: HTMLElement): string[] {
	const tabla = root.querySelector('table[aria-label], table') as HTMLTableElement;
	return Array.from(tabla.querySelectorAll('tbody tr')).map((tr) => tr.querySelector('td')?.textContent?.trim() ?? '');
}

describe('EstadoCuentaComponent', () => {
	it('carga la cuenta del alumno de la ruta y muestra su categoría y sin matrícula', () => {
		const { texto, estadoCuenta } = crear('280');

		expect(estadoCuenta).toHaveBeenCalledWith(280);
		expect(texto()).toContain('REVISION, ESTUDIANTE-PRUEBA');
		expect(texto()).toContain('Con deuda');
		expect(texto()).toContain('Sin matrícula activa');
	});

	it('un cargo sin dato no muestra saldo ni recargo y la cuenta avisa de los datos sin confirmar', () => {
		const { fixture, texto } = crear();
		const filas = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('tbody tr'));
		const sinDato = filas.find((tr) => tr.textContent?.includes('Abril')) as HTMLElement;

		expect(sinDato.textContent).toContain('Sin dato');
		expect(sinDato.textContent).not.toContain('S/ 0.00');
		expect(texto()).toContain('1 cargo(s) sin dato confirmado');
	});

	it('el pago anulado sigue en la lista con quién, cuándo y por qué', () => {
		const { texto } = crear();

		expect(texto()).toContain('Anulado');
		expect(texto()).toContain('por admin');
		expect(texto()).toContain('Pago duplicado');
	});

	it('ordenar por una columna reordena las filas con un clic', () => {
		const { fixture } = crear();
		const root = fixture.nativeElement as HTMLElement;
		const antes = celdasDeConcepto(root);
		expect(antes[0]).toContain('Marzo');

		const botonMonto = Array.from(root.querySelectorAll('thead button')).find((b) => b.textContent?.includes('Monto')) as HTMLElement;
		botonMonto.click();
		fixture.detectChanges();

		expect(celdasDeConcepto(root)[0]).toContain('Abril');
	});

	it('sin alumno en la ruta no consulta nada y pide buscar uno', () => {
		const { estadoCuenta, texto } = crear(null);

		expect(estadoCuenta).not.toHaveBeenCalled();
		expect(texto()).toContain('Busca al alumno');
	});

	describe('acciones sobre la cuenta', () => {
		const botones = (root: ParentNode, etiqueta: string): HTMLButtonElement[] =>
			Array.from(root.querySelectorAll('button')).filter((b) => b.textContent?.trim().startsWith(etiqueta));

		const escribirMotivo = (fixture: { detectChanges(): void }, texto: string): void => {
			const area = document.body.querySelector('textarea') as HTMLTextAreaElement;
			area.value = texto;
			area.dispatchEvent(new Event('input'));
			fixture.detectChanges();
		};

		it('un cargo sin dato no ofrece ajuste y uno con saldo sí', () => {
			const { fixture } = crear();
			const filas = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('tbody tr'));
			const marzo = filas.find((tr) => tr.textContent?.includes('Marzo')) as HTMLElement;
			const abril = filas.find((tr) => tr.textContent?.includes('Abril')) as HTMLElement;

			expect(botones(marzo, 'Ajustar')).toHaveLength(1);
			expect(botones(abril, 'Ajustar')).toHaveLength(0);
		});

		it('solo un pago vigente se puede anular', () => {
			const { fixture } = crear();
			const filas = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('tbody tr'));
			const vigente = filas.find((tr) => tr.textContent?.includes('Vigente')) as HTMLElement;
			const anulado = filas.find((tr) => tr.classList.contains('anulada')) as HTMLElement;

			expect(botones(vigente, 'Anular')).toHaveLength(1);
			expect(botones(anulado, 'Anular')).toHaveLength(0);
		});

		it('anular un pago: pide motivo, llama al servidor y recarga la cuenta completa', () => {
			const anularPago = vi.fn(() => of({}));
			const { fixture, estadoCuenta } = crear('280', { anularPago });
			const root = fixture.nativeElement as HTMLElement;

			botones(root, 'Anular')[0].click();
			fixture.detectChanges();
			const confirmar = botones(document.body, 'Anular').find((b) => b.className.includes('edu-button') && b.closest('[role="dialog"]')) as HTMLButtonElement;
			expect(confirmar.disabled).toBe(true);

			escribirMotivo(fixture, 'Pago duplicado');
			expect(confirmar.disabled).toBe(false);
			confirmar.click();
			fixture.detectChanges();

			expect(anularPago).toHaveBeenCalledWith(11, 'Pago duplicado');
			expect(estadoCuenta).toHaveBeenCalledTimes(2);
		});

		it('un rechazo del servidor se muestra con su regla y la cuenta se recarga si quedó vieja', () => {
			const anularPago = vi.fn(() => throwError(() => ({ status: 400, error: { errorCode: 'PAGO_YA_ANULADO' } })));
			const { fixture, estadoCuenta } = crear('280', { anularPago });

			botones(fixture.nativeElement as HTMLElement, 'Anular')[0].click();
			fixture.detectChanges();
			escribirMotivo(fixture, 'x');
			(botones(document.body, 'Anular').find((b) => b.closest('[role="dialog"]')) as HTMLButtonElement).click();
			fixture.detectChanges();

			expect(document.body.textContent).toContain('El pago ya estaba anulado');
			expect(estadoCuenta).toHaveBeenCalledTimes(2);
		});

		it('anular un ajuste vigente llama al servidor con su motivo', () => {
			const anularAjuste = vi.fn(() => of({}));
			const { fixture, estadoCuenta } = crear('280', { anularAjuste }, { ...cuenta, ajustes: [ajusteVigente] });
			const tablaAjustes = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('tbody tr')).find((tr) =>
				tr.textContent?.includes('Hermano en el colegio'),
			) as HTMLElement;

			botones(tablaAjustes, 'Anular')[0].click();
			fixture.detectChanges();
			escribirMotivo(fixture, 'Error de digitación');
			(botones(document.body, 'Anular').find((b) => b.closest('[role="dialog"]')) as HTMLButtonElement).click();
			fixture.detectChanges();

			expect(anularAjuste).toHaveBeenCalledWith(31, 'Error de digitación');
			expect(estadoCuenta).toHaveBeenCalledTimes(2);
		});

		it('registrar un ajuste: un descuento exige motivo y envía el cuerpo del contrato', () => {
			const registrarAjuste = vi.fn(() => of({ id: 40 }));
			const { fixture, estadoCuenta } = crear('280', { registrarAjuste });
			const marzo = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('tbody tr')).find((tr) =>
				tr.textContent?.includes('Marzo'),
			) as HTMLElement;

			botones(marzo, 'Ajustar')[0].click();
			fixture.detectChanges();
			const monto = document.body.querySelector('edu-input-number input') as HTMLInputElement;
			monto.value = '25.50';
			monto.dispatchEvent(new Event('input'));
			monto.dispatchEvent(new Event('blur'));
			fixture.detectChanges();
			const guardar = botones(document.body, 'Registrar ajuste').find((b) => b.closest('[role="dialog"]')) as HTMLButtonElement;
			expect(guardar.disabled).toBe(true);

			escribirMotivo(fixture, 'Hermano');
			expect(guardar.disabled).toBe(false);
			guardar.click();
			fixture.detectChanges();

			expect(registrarAjuste).toHaveBeenCalledWith({ cargoId: 1, tipo: 'DESCUENTO', monto: 25.5, motivo: 'Hermano' });
			expect(estadoCuenta).toHaveBeenCalledTimes(2);
		});
	});
});
