import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { EduTable } from './edu-table';

interface Row {
	id: number;
	name: string;
}

@Component({
	standalone: true,
	imports: [EduTable],
	template: `
		<edu-table [value]="rows()" dataKey="id">
			<ng-template #body let-row>
				<tr>
					<td>{{ row.id }}</td>
					<td><span>{{ row.name }}</span></td>
				</tr>
			</ng-template>
		</edu-table>
	`,
})
class HostComponent {
	readonly rows = signal<Row[]>([]);
}

const initial = (): Row[] => [
	{ id: 1, name: 'a' },
	{ id: 2, name: 'b' },
	{ id: 3, name: 'c' },
	{ id: 4, name: 'd' },
];

/** jsdom no trae `AnimationEvent`; el handler solo lee `animationName`. */
function animationEnd(animationName: string): Event {
	return Object.assign(new Event('animationend'), { animationName });
}

async function setup() {
	const fixture = TestBed.createComponent(HostComponent);
	fixture.componentInstance.rows.set(initial());
	await fixture.whenStable();
	const trs = () => Array.from<HTMLElement>(fixture.nativeElement.querySelectorAll('tbody tr'));
	return { fixture, trs };
}

describe('EduTable row motion', () => {
	it('does not flash on initial load', async () => {
		const { trs } = await setup();
		expect(trs().some((tr) => tr.classList.contains('motion-flash'))).toBe(false);
	});

	it('flashes only the row whose rendered value changed', async () => {
		const { fixture, trs } = await setup();
		fixture.componentInstance.rows.update((rows) =>
			rows.map((r) => (r.id === 2 ? { ...r, name: 'B!' } : { ...r })),
		);
		await fixture.whenStable();
		expect(trs().map((tr) => tr.classList.contains('motion-flash'))).toEqual([false, true, false, false]);
		expect(trs()[1].querySelector('span')?.classList.contains('motion-value-bounce')).toBe(true);
	});

	it('does not flash when the same rows are reordered', async () => {
		const { fixture, trs } = await setup();
		fixture.componentInstance.rows.update((rows) => [...rows].reverse());
		await fixture.whenStable();
		expect(trs().some((tr) => tr.classList.contains('motion-flash'))).toBe(false);
	});

	it('keeps a removed row until its exit ends, then drops it from the DOM', async () => {
		const { fixture, trs } = await setup();
		fixture.componentInstance.rows.update((rows) => rows.filter((r) => r.id !== 2));
		await fixture.whenStable();
		expect(trs()).toHaveLength(4);
		const leaving = trs()[1];
		expect(leaving.classList.contains('edu-row--leaving')).toBe(true);

		leaving.dispatchEvent(animationEnd('edu-row-slide-out'));
		expect(leaving.classList.contains('edu-row--folding')).toBe(true);
		leaving.dispatchEvent(animationEnd('edu-row-fold'));
		await fixture.whenStable();
		expect(trs()).toHaveLength(3);
	});

	it('follows the exit through keyframe names prefixed by emulated encapsulation', async () => {
		const { fixture, trs } = await setup();
		fixture.componentInstance.rows.update((rows) => rows.filter((r) => r.id !== 2));
		await fixture.whenStable();
		const leaving = trs()[1];

		leaving.dispatchEvent(animationEnd('_ngcontent-ng-c123_edu-row-slide-out'));
		expect(leaving.classList.contains('edu-row--folding')).toBe(true);
		leaving.dispatchEvent(animationEnd('_ngcontent-ng-c123_edu-row-fold'));
		await fixture.whenStable();
		expect(trs()).toHaveLength(3);
	});
});
