import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import type { CuentaCargo, CuentaPago, EstadoCuenta } from '@data/models';
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

function crear(estudianteId: string | null = '280') {
	const navigate = vi.fn(() => Promise.resolve(true));
	const estadoCuenta = vi.fn(() => of(cuenta));
	TestBed.configureTestingModule({
		imports: [EstadoCuentaComponent],
		providers: [
			{ provide: ActivatedRoute, useValue: { paramMap: of(convertToParamMap(estudianteId ? { estudianteId } : {})) } },
			{ provide: Router, useValue: { navigate } },
			{ provide: PagosApiService, useValue: { estadoCuenta, buscarEstudiantes: () => of([]) } },
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
});
