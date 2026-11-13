// #region Imports
import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { createClientPaging } from '@shared/utils/client-paging.utils';

import { CardRowComponent } from './card-row.component';
import { MobileCardListComponent } from './mobile-card-list.component';
// #endregion

@Component({
	standalone: true,
	imports: [MobileCardListComponent, CardRowComponent],
	template: `
		<app-mobile-card-list [items]="items()" [pageSize]="2">
			<ng-template let-item>
				<app-card-row label="Nombre">{{ item }}</app-card-row>
			</ng-template>
		</app-mobile-card-list>
	`,
})
class HostComponent {
	items = signal(['uno', 'dos', 'tres', 'cuatro', 'cinco']);
}

@Component({
	standalone: true,
	imports: [MobileCardListComponent, CardRowComponent],
	template: `
		<app-mobile-card-list [paging]="paging" [pageSize]="2">
			<ng-template let-item>
				<app-card-row label="Nombre">{{ item }}</app-card-row>
			</ng-template>
		</app-mobile-card-list>
	`,
})
class PagingHostComponent {
	readonly source = signal(['uno', 'dos', 'tres', 'cuatro', 'cinco']);
	readonly paging = createClientPaging(this.source, 10);
}

describe('MobileCardListComponent con paginación compartida', () => {
	it('toma el tamaño de página, comparte el estado con la tabla y lo restaura al destruirse', () => {
		const fixture = TestBed.createComponent(PagingHostComponent);
		fixture.detectChanges();
		const host = fixture.componentInstance;
		const root = fixture.nativeElement as HTMLElement;
		const values = (): string[] =>
			[...root.querySelectorAll('.mcl__card .card-row__value')].map((c) => (c.textContent ?? '').trim());

		expect(host.paging.rows()).toBe(2);
		expect(values()).toEqual(['uno', 'dos']);

		root.querySelector<HTMLButtonElement>('button[aria-label="Página siguiente"]')!.click();
		fixture.detectChanges();
		expect(host.paging.first()).toBe(2);
		expect(values()).toEqual(['tres', 'cuatro']);

		fixture.destroy();
		expect(host.paging.rows()).toBe(10);
		expect(host.paging.first()).toBe(0);
	});
});

describe('MobileCardListComponent', () => {
	let fixture: ComponentFixture<HostComponent>;

	const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
	/** Valor de cada card (la etiqueta «Nombre» es fija y no aporta). */
	const cards = (): string[] =>
		[...root().querySelectorAll('.mcl__card .card-row__value')].map((c) => (c.textContent ?? '').trim());
	const status = (): string => (root().querySelector('.mcl__status')?.textContent ?? '').trim();
	const click = (label: string): void => {
		root().querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`)!.click();
		fixture.detectChanges();
	};

	beforeEach(() => {
		fixture = TestBed.createComponent(HostComponent);
		fixture.detectChanges();
	});

	it('muestra solo la primera página y el indicador «1 de 3»', () => {
		expect(cards()).toEqual(['uno', 'dos']);
		expect(status()).toBe('1 de 3');
	});

	it('«Anterior» está deshabilitado en la primera página', () => {
		const prev = root().querySelector<HTMLButtonElement>('button[aria-label="Página anterior"]')!;
		expect(prev.disabled).toBe(true);
	});

	it('avanza y retrocede de página', () => {
		click('Página siguiente');
		expect(cards()).toEqual(['tres', 'cuatro']);
		expect(status()).toBe('2 de 3');
		click('Página anterior');
		expect(status()).toBe('1 de 3');
	});

	it('en la última página «Siguiente» queda deshabilitado y muestra el resto', () => {
		click('Página siguiente');
		click('Página siguiente');
		expect(cards()).toEqual(['cinco']);
		const next = root().querySelector<HTMLButtonElement>('button[aria-label="Página siguiente"]')!;
		expect(next.disabled).toBe(true);
	});

	it('si la lista se acorta, no queda en una página inexistente', () => {
		click('Página siguiente');
		click('Página siguiente');
		fixture.componentInstance.items.set(['uno', 'dos']);
		fixture.detectChanges();
		expect(cards()).toEqual(['uno', 'dos']);
		expect(root().querySelector('.mcl__pager')).toBeNull();
	});
});
