// #region Imports
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { beforeEach, describe, expect, it } from 'vitest';

import { EstadoSaludSedeDto } from './models/salud-sede.models';
import { AyudaSaludSedeComponent } from './ayuda-salud-sede.component';
import { AyudaSaludSedeFacade } from './services/ayuda-salud-sede.facade';
// #endregion

describe('AyudaSaludSedeComponent', () => {
	let component: AyudaSaludSedeComponent;
	let estado: ReturnType<typeof signal<EstadoSaludSedeDto[]>>;

	function setup(initialEstado: EstadoSaludSedeDto[]): void {
		estado = signal(initialEstado);

		const facadeMock = {
			estado: estado.asReadonly(),
			loadingEstado: signal(false).asReadonly(),
			errorEstado: signal(false).asReadonly(),
			submitting: signal(false).asReadonly(),
			submitError: signal(false).asReadonly(),
			submitSuccess: signal(false).asReadonly(),
			init: () => {},
			reportar: () => {},
		};

		// El componente declara `providers: [AyudaSaludSedeFacade]` a nivel de
		// decorator (scoped al componente, mismo patrón que `AyudaQaComponent`) —
		// eso crea su propia instancia sin importar overrides a nivel TestBed
		// root, así que hay que reemplazar el provider del componente mismo.
		TestBed.overrideComponent(AyudaSaludSedeComponent, {
			set: { providers: [{ provide: AyudaSaludSedeFacade, useValue: facadeMock }] },
		});

		TestBed.configureTestingModule({
			providers: [provideHttpClient(), provideHttpClientTesting()],
		});

		const fixture = TestBed.createComponent(AyudaSaludSedeComponent);
		component = fixture.componentInstance;
	}

	beforeEach(() => {
		TestBed.resetTestingModule();
	});

	it('sin reportes conocidos (estado vacío) colapsa al mensaje genérico "todo bien"', () => {
		setup([]);
		expect(component.todoBien()).toBe(true);
	});

	it('con todas las dimensiones en Bien colapsa al mensaje genérico', () => {
		setup([
			{ dimension: 'Infraestructura', rating: 'Bien', fechaCalculo: '2026-07-20T10:00:00Z' },
			{ dimension: 'Profesorado', rating: 'Bien', fechaCalculo: '2026-07-20T10:00:00Z' },
		]);
		expect(component.todoBien()).toBe(true);
	});

	it('con al menos una dimensión en mal estado, muestra el detalle real por dimensión', () => {
		setup([{ dimension: 'Infraestructura', rating: 'Critico', fechaCalculo: '2026-07-20T10:00:00Z' }]);

		expect(component.todoBien()).toBe(false);
		const infraestructura = component.estadoPorDimension().find((e) => e.dimension === 'Infraestructura');
		expect(infraestructura?.rating).toBe('Critico');
		// Dimensiones sin reporte conocido caen a Bien por default.
		const profesorado = component.estadoPorDimension().find((e) => e.dimension === 'Profesorado');
		expect(profesorado?.rating).toBe('Bien');
	});
});
