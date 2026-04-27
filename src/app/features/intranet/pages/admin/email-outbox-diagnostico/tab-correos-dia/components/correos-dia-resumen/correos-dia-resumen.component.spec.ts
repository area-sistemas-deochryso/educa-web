import { ComponentRef } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { DiagnosticoCorreosDiaResumen } from '../../models/correos-dia.models';

import { CorreosDiaResumenComponent } from './correos-dia-resumen.component';

function makeResumen(
	overrides: Partial<DiagnosticoCorreosDiaResumen> = {},
): DiagnosticoCorreosDiaResumen {
	return {
		entradasMarcadas: 60,
		estudiantesConEntrada: 60,
		estudiantesFueraDeAlcance: 0,
		estudiantesSinCorreoApoderado: 0,
		correosApoderadosBlacklisteados: 0,
		correosEnviados: 60,
		correosFallidos: 0,
		correosPendientes: 0,
		correosFaltantes: 0,
		...overrides,
	};
}

describe('CorreosDiaResumenComponent', () => {
	let fixture: ComponentFixture<CorreosDiaResumenComponent>;
	let component: CorreosDiaResumenComponent;
	let componentRef: ComponentRef<CorreosDiaResumenComponent>;

	beforeEach(() => {
		TestBed.configureTestingModule({ imports: [CorreosDiaResumenComponent] });
		fixture = TestBed.createComponent(CorreosDiaResumenComponent);
		component = fixture.componentInstance;
		componentRef = fixture.componentRef;
	});

	it('renderiza las 3 cards generales con los valores del resumen', () => {
		componentRef.setInput('resumen', makeResumen({ entradasMarcadas: 62, correosEnviados: 56 }));
		fixture.detectChanges();

		const text = fixture.nativeElement.textContent ?? '';
		expect(text).toContain('Entradas marcadas');
		expect(text).toContain('62');
		expect(text).toContain('Correos enviados');
		expect(text).toContain('56');
	});

	it('totalGap suma las 5 razones del descalce', () => {
		componentRef.setInput(
			'resumen',
			makeResumen({
				estudiantesSinCorreoApoderado: 2,
				correosApoderadosBlacklisteados: 1,
				correosFallidos: 3,
				correosPendientes: 4,
				correosFaltantes: 5,
			}),
		);
		fixture.detectChanges();

		expect(component.totalGap()).toBe(15);
	});

	it('cuando totalGap === 0 muestra mensaje "Sin gaps hoy"', () => {
		componentRef.setInput('resumen', makeResumen());
		fixture.detectChanges();

		const text = fixture.nativeElement.textContent ?? '';
		expect(text).toContain('Sin gaps hoy');
	});
});
