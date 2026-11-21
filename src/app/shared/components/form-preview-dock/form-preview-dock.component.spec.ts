import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, describe, expect, it } from 'vitest';

import { FormPreviewDockComponent } from './form-preview-dock.component';

@Component({
	standalone: true,
	imports: [FormPreviewDockComponent],
	template: `
		<app-form-preview-dock [visible]="visible()" heading="Vista previa" hint="Así se verá." [rightOffset]="480">
			<span class="projected">contenido</span>
		</app-form-preview-dock>
	`,
})
class HostComponent {
	readonly visible = signal(false);
}

describe('FormPreviewDockComponent', () => {
	afterEach(() => {
		document.querySelectorAll('.cdk-overlay-container').forEach((el) => (el.innerHTML = ''));
	});

	async function settle(fixture: ReturnType<typeof TestBed.createComponent<HostComponent>>) {
		fixture.detectChanges();
		await fixture.whenStable();
		await Promise.resolve();
		fixture.detectChanges();
	}

	const dock = () => document.querySelector<HTMLElement>('.fpd');

	it('no abre nada mientras no es visible', async () => {
		const fixture = TestBed.createComponent(HostComponent);
		await settle(fixture);

		expect(dock()).toBeNull();
	});

	it('se abre en una capa propia con el contenido proyectado, el título y la ayuda', async () => {
		const fixture = TestBed.createComponent(HostComponent);
		fixture.componentInstance.visible.set(true);
		await settle(fixture);

		expect(dock()).not.toBeNull();
		expect(dock()?.querySelector('.projected')?.textContent).toBe('contenido');
		expect(dock()?.querySelector('.fpd__label')?.textContent).toBe('Vista previa');
		expect(dock()?.querySelector('.fpd__hint')?.textContent).toBe('Así se verá.');
		expect(dock()?.closest('.cdk-overlay-container')).not.toBeNull();
	});

	it('se expone como región accesible', async () => {
		const fixture = TestBed.createComponent(HostComponent);
		fixture.componentInstance.visible.set(true);
		await settle(fixture);

		expect(dock()?.getAttribute('role')).toBe('region');
		expect(dock()?.getAttribute('aria-label')).toBe('Vista previa');
	});

	it('reserva a la derecha el ancho del panel lateral', async () => {
		const fixture = TestBed.createComponent(HostComponent);
		fixture.componentInstance.visible.set(true);
		await settle(fixture);

		const pane = dock()?.closest<HTMLElement>('.fpd-pane');
		expect(pane?.style.width).toBe('calc(100% - 480px)');
	});

	it('se cierra al dejar de ser visible', async () => {
		const fixture = TestBed.createComponent(HostComponent);
		fixture.componentInstance.visible.set(true);
		await settle(fixture);
		fixture.componentInstance.visible.set(false);
		await settle(fixture);

		expect(dock()).toBeNull();
	});

	it('se cierra al destruir el componente', async () => {
		const fixture = TestBed.createComponent(HostComponent);
		fixture.componentInstance.visible.set(true);
		await settle(fixture);
		fixture.destroy();

		expect(dock()).toBeNull();
	});
});
