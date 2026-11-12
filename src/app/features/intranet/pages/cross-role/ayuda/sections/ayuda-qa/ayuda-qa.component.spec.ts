// #region Imports
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { DebugElement } from '@angular/core';
import { By } from '@angular/platform-browser';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { environment } from '@config/environment';
import { AuthService } from '@core/services';
import { FaqDto } from '@features/intranet/pages/cross-role/ayuda/models/faq.models';
import { AyudaQaComponent } from './ayuda-qa.component';
// #endregion

const FAQ_API = `${environment.apiUrl}/api/faq`;

const FAQS: FaqDto[] = [
	{ id: 1, pregunta: '¿Cómo cambio mi contraseña?', respuesta: 'Ve a tu perfil.', categoria: 'Común', wizard: null },
	{ id: 2, pregunta: '¿Cómo registro asistencia?', respuesta: 'Ve a Asistencias.', categoria: 'Profesor', wizard: null },
];

describe('AyudaQaComponent', () => {
	let harness: RouterTestingHarness;
	let httpMock: HttpTestingController;
	let router: Router;

	function root(): DebugElement {
		const el = harness.routeDebugElement;
		if (!el) throw new Error('La ruta no renderizó el componente');
		return el;
	}

	async function open(url: string): Promise<AyudaQaComponent> {
		const component = await harness.navigateByUrl(url, AyudaQaComponent);
		httpMock.expectOne(FAQ_API).flush(FAQS);
		harness.detectChanges();
		return component;
	}

	beforeEach(async () => {
		TestBed.configureTestingModule({
			providers: [
				provideRouter([
					{ path: 'ayuda/qa', component: AyudaQaComponent },
					{ path: 'ayuda/ticket', children: [] },
				]),
				provideHttpClient(),
				provideHttpClientTesting(),
				{ provide: AuthService, useValue: { currentUser: { rol: 'Profesor' } } },
			],
		});
		harness = await RouterTestingHarness.create();
		httpMock = TestBed.inject(HttpTestingController);
		router = TestBed.inject(Router);
	});

	it('abrir una pregunta no mueve la lista y muestra el detalle al lado', async () => {
		await open('/ayuda/qa');
		const antes = root().queryAll(By.css('.faq-item')).map((d) => d.nativeElement.textContent.trim());

		root().queryAll(By.css('.faq-item'))[1].nativeElement.click();
		await harness.fixture.whenStable();
		harness.detectChanges();

		const view = root();
		const despues = view.queryAll(By.css('.faq-item')).map((d) => d.nativeElement.textContent.trim());
		expect(despues).toEqual(antes);
		expect(view.query(By.css('.faq-detail__pregunta')).nativeElement.textContent).toContain('registro asistencia');
		expect(router.url).toBe('/ayuda/qa?faq=2');
	});

	it('un enlace directo abre esa misma pregunta', async () => {
		await open('/ayuda/qa?faq=1');

		const view = root();
		expect(view.query(By.css('.faq-detail__pregunta')).nativeElement.textContent).toContain('contraseña');
		expect(view.query(By.css('.qa--detail-open'))).not.toBeNull();
	});

	it('Esc vuelve a la lista (en móvil, cierra la pantalla de detalle)', async () => {
		await open('/ayuda/qa?faq=1');

		document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
		await harness.fixture.whenStable();
		harness.detectChanges();

		const view = root();
		expect(view.query(By.css('.faq-detail'))).toBeNull();
		expect(view.query(By.css('.qa--detail-open'))).toBeNull();
		expect(router.url).not.toContain('faq=');
	});

	it('«/» enfoca la búsqueda', async () => {
		await open('/ayuda/qa');

		document.body.dispatchEvent(new KeyboardEvent('keydown', { key: '/', bubbles: true }));

		const input = root().query(By.css('.faq-search__input')).nativeElement;
		expect(document.activeElement).toBe(input);
	});

	it('sin resultados muestra sugerencias y lleva la búsqueda al ticket', async () => {
		await open('/ayuda/qa');
		const input = root().query(By.css('.faq-search__input')).nativeElement as HTMLInputElement;

		input.value = 'zzz';
		input.dispatchEvent(new Event('input'));
		harness.detectChanges();

		const view = root();
		expect(view.query(By.css('.qa-empty')).nativeElement.textContent).toContain('«zzz»');

		const buttons = view.queryAll(By.css('.qa-empty edu-button button'));
		buttons[buttons.length - 1].nativeElement.click();
		await harness.fixture.whenStable();

		expect(router.url).toContain('/ayuda/ticket');
		expect(decodeURIComponent(router.url)).toContain('«zzz»');
	});

	it('«No útil» ofrece «Generar ticket» con la pregunta citada en el formulario', async () => {
		await open('/ayuda/qa?faq=1');
		const view = root();

		const feedbackButtons = view.queryAll(By.css('.faq-detail__feedback button'));
		feedbackButtons[feedbackButtons.length - 1].nativeElement.click();
		harness.detectChanges();
		view.query(By.css('.faq-detail__feedback button')).nativeElement.click();
		await harness.fixture.whenStable();

		expect(router.url).toContain('/ayuda/ticket');
		expect(decodeURIComponent(router.url)).toContain('«¿Cómo cambio mi contraseña?»');
	});
});
