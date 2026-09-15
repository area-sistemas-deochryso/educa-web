// #region Imports
import { describe, it, expect, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { Component } from '@angular/core';
import { Meta } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { testProviders } from '@test';

import { PublicSeoService } from './public-seo.service';

// #endregion
// #region Implementation
@Component({ selector: 'app-test-seo-host', template: '' })
class TestSeoHostComponent {}

describe('PublicSeoService', () => {
	beforeEach(() => {
		TestBed.configureTestingModule({
			providers: [
				...testProviders,
				provideRouter([
					{
						path: 'con-seo',
						component: TestSeoHostComponent,
						data: {
							seo: {
								description: 'Descripción de prueba',
								ogTitle: 'OG de prueba',
								canonicalPath: '/con-seo',
							},
						},
					},
					{ path: 'sin-seo', component: TestSeoHostComponent },
				]),
			],
		});
	});

	it('no lanza y setea los meta tags al navegar a una ruta con data.seo', async () => {
		const harness = await RouterTestingHarness.create('/con-seo');

		expect(() => TestBed.inject(PublicSeoService)).not.toThrow();

		const meta = TestBed.inject(Meta);
		expect(meta.getTag('name="description"')?.content).toBe('Descripción de prueba');
		expect(meta.getTag('property="og:title"')?.content).toBe('OG de prueba');

		harness.detectChanges();
	});

	it('no lanza al navegar a una ruta sin data.seo', async () => {
		await RouterTestingHarness.create('/sin-seo');

		expect(() => TestBed.inject(PublicSeoService)).not.toThrow();
	});
});
// #endregion
