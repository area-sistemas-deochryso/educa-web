// #region Imports
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, RouterOutlet, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { describe, expect, it, vi } from 'vitest';

import { CursoHubTabsComponent } from './curso-hub-tabs.component';
// #endregion

@Component({
	standalone: true,
	imports: [CursoHubTabsComponent, RouterOutlet],
	template: '<app-curso-hub-tabs /><router-outlet />',
})
class ShellStubComponent {}

@Component({ standalone: true, template: 'contenido' })
class ContenidoStubComponent {}

describe('CursoHubTabsComponent', () => {
	async function openShell(url: string) {
		TestBed.configureTestingModule({
			providers: [
				provideRouter([
					{
						path: 'hub/:cursoId/:salonId',
						component: ShellStubComponent,
						children: [
							{ path: '', pathMatch: 'full', redirectTo: 'contenido' },
							{ path: 'contenido', component: ContenidoStubComponent },
						],
					},
				]),
			],
		});
		const harness = await RouterTestingHarness.create();
		await harness.navigateByUrl(url, ShellStubComponent);
		harness.detectChanges();
		return harness;
	}

	const tabLink = (harness: RouterTestingHarness) =>
		harness.routeNativeElement?.querySelector<HTMLAnchorElement>('a.hub-tab');

	it('lists the Contenido tab and marks it active', async () => {
		const harness = await openShell('/hub/24/34/contenido');

		expect(tabLink(harness)?.textContent).toContain('Contenido');
		expect(tabLink(harness)?.classList.contains('is-active')).toBe(true);
		expect(tabLink(harness)?.getAttribute('aria-current')).toBe('page');
	});

	it('redirects the hub root to Contenido keeping the slot query', async () => {
		await openShell('/hub/24/34?horarioId=2');

		expect(TestBed.inject(Router).url).toBe('/hub/24/34/contenido?horarioId=2');
	});

	it('keeps the slot query in the tab link', async () => {
		const harness = await openShell('/hub/24/34/contenido?horarioId=2');

		expect(tabLink(harness)?.getAttribute('href')).toBe('/hub/24/34/contenido?horarioId=2');
	});

	it('navigates replacing the URL instead of stacking history', async () => {
		const harness = await openShell('/hub/24/34/contenido?horarioId=2');
		const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl');

		tabLink(harness)?.click();
		await harness.fixture.whenStable();

		expect(navigate).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ replaceUrl: true }));
	});
});
