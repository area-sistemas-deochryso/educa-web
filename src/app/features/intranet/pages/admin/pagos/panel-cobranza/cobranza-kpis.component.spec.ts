import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';

import type { PanelCobranza } from '@data/models';
import { CobranzaKpisComponent } from './cobranza-kpis.component';

const panelConNulos: PanelCobranza = {
	fecha: '2026-03-05',
	anio: 2026,
	matriculados: 0,
	conteos: { alDia: 0, pagoParcial: 0, conDeuda: 0, conDatosSinConfirmar: 0, sinCargos: 0 },
	porcentajeAlDia: null,
	porNivel: [],
	dinero: {
		exigible: 0,
		cobradoDeLoExigible: 0,
		cobradoTotal: 0,
		porcentaje: null,
		saldoVencido: 0,
		indiceMorosidad: null,
	},
	asistencia: { desde: '2026-03-01', hasta: '2026-03-05', universo: 0, asistieron: 0, porcentaje: null },
	aging: [],
	oportuna: { cuotasExigibles: 0, cuotasOportunas: 0, porcentaje: null },
	anioSinParametros: false,
};

describe('CobranzaKpisComponent', () => {
	it('muestra «—» y nunca «NaN» cuando los porcentajes son null (INV-PG10)', () => {
		const fixture = TestBed.createComponent(CobranzaKpisComponent);
		fixture.componentRef.setInput('panel', panelConNulos);
		fixture.detectChanges();
		const text = (fixture.nativeElement as HTMLElement).textContent ?? '';

		expect(text).toContain('—');
		expect(text).not.toContain('NaN');
		expect(text).toContain('2.º de Primaria');
	});

	it('explica qué mide la cobranza por dinero y qué mide el índice de morosidad', () => {
		const fixture = TestBed.createComponent(CobranzaKpisComponent);
		fixture.componentRef.setInput('panel', panelConNulos);
		fixture.detectChanges();
		const text = (fixture.nativeElement as HTMLElement).textContent?.replace(/\s+/g, ' ') ?? '';

		expect(text).toContain('lo que sí se cobró');
		expect(text).toContain('lo que sigue sin pagar');
		expect(text).toContain('complemento de la cobranza');
	});
});
