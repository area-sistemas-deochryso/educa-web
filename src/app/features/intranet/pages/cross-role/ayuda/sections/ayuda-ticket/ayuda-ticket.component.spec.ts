// #region Imports
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { environment } from '@env/environment';
import { AyudaTicketComponent } from './ayuda-ticket.component';
// #endregion

const TIPOS_API = `${environment.apiUrl}/api/tickets/tipos`;
const MIOS_API = `${environment.apiUrl}/api/tickets/mios`;

describe('AyudaTicketComponent — validación de formulario', () => {
	let fixture: ComponentFixture<AyudaTicketComponent>;
	let component: AyudaTicketComponent;
	let httpMock: HttpTestingController;

	beforeEach(() => {
		TestBed.configureTestingModule({
			imports: [AyudaTicketComponent],
			providers: [provideHttpClient(), provideHttpClientTesting()],
		});

		fixture = TestBed.createComponent(AyudaTicketComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();

		httpMock = TestBed.inject(HttpTestingController);
		httpMock.expectOne(TIPOS_API).flush([{ id: 1, nombre: 'Error técnico' }]);
		httpMock.expectOne(MIOS_API).flush([]);
	});

	it('rechaza descripciones de menos de 20 caracteres', () => {
		component.onTipoChange(1);
		component.onDescripcionChange('muy corta');

		expect(component.descripcionValid()).toBe(false);
		expect(component.canSubmit()).toBe(false);
	});

	it('rechaza descripciones de más de 2000 caracteres', () => {
		component.onTipoChange(1);
		component.onDescripcionChange('x'.repeat(2001));

		expect(component.descripcionValid()).toBe(false);
		expect(component.canSubmit()).toBe(false);
	});

	it('acepta una descripción dentro del rango 20-2000 y habilita el submit', () => {
		component.onTipoChange(1);
		component.onDescripcionChange('x'.repeat(25));

		expect(component.descripcionValid()).toBe(true);
		expect(component.canSubmit()).toBe(true);
	});

	it('sin tipo seleccionado no habilita el submit aunque la descripción sea válida', () => {
		component.onDescripcionChange('x'.repeat(25));

		expect(component.canSubmit()).toBe(false);
	});

	it('la propuesta de mejora es opcional — no afecta canSubmit()', () => {
		component.onTipoChange(1);
		component.onDescripcionChange('x'.repeat(25));

		expect(component.canSubmit()).toBe(true);
	});
});
