import { ComponentFixture, TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { StorageService } from '@core/services/storage';

import { ErrorGroupsViewToggleComponent } from './error-groups-view-toggle.component';

describe('ErrorGroupsViewToggleComponent', () => {
	let fixture: ComponentFixture<ErrorGroupsViewToggleComponent>;
	let component: ErrorGroupsViewToggleComponent;

	beforeEach(() => {
		localStorage.clear();
		TestBed.configureTestingModule({
			imports: [ErrorGroupsViewToggleComponent],
			providers: [StorageService],
		});
	});

	afterEach(() => {
		localStorage.clear();
	});

	function build(): void {
		fixture = TestBed.createComponent(ErrorGroupsViewToggleComponent);
		component = fixture.componentInstance;
		fixture.detectChanges(); // dispara ngOnInit
	}

	it('inicializa con kanban cuando localStorage está vacío y emite el modo', () => {
		const spy = vi.fn();
		fixture = TestBed.createComponent(ErrorGroupsViewToggleComponent);
		component = fixture.componentInstance;
		component.modeChange.subscribe(spy);
		fixture.detectChanges();

		expect(component.viewMode()).toBe('kanban');
		expect(spy).toHaveBeenCalledWith('kanban');
	});

	it('inicializa con table cuando localStorage tiene table', () => {
		const prefs = TestBed.inject(StorageService);
		prefs.setErrorGroupsViewMode('table');

		build();
		expect(component.viewMode()).toBe('table');
	});

	it('al cambiar modo emite y persiste en localStorage', () => {
		const spy = vi.fn();
		fixture = TestBed.createComponent(ErrorGroupsViewToggleComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
		component.modeChange.subscribe(spy);

		component.onModeChange('table');

		expect(component.viewMode()).toBe('table');
		expect(spy).toHaveBeenCalledWith('table');
		const prefs = TestBed.inject(StorageService);
		expect(prefs.getErrorGroupsViewMode()).toBe('table');
	});

	it('inicializa con heatmap cuando localStorage tiene heatmap', () => {
		const prefs = TestBed.inject(StorageService);
		prefs.setErrorGroupsViewMode('heatmap');

		build();
		expect(component.viewMode()).toBe('heatmap');
	});

	it('inicializa con pareto cuando localStorage tiene pareto', () => {
		const prefs = TestBed.inject(StorageService);
		prefs.setErrorGroupsViewMode('pareto');

		build();
		expect(component.viewMode()).toBe('pareto');
	});

	it('incluye las 5 opciones de vista, con pareto al final', () => {
		build();
		expect(component.options.map((o) => o.value)).toEqual(['kanban', 'table', 'events', 'heatmap', 'pareto']);
	});

	it('ignora null al cambiar modo (no emite, no persiste)', () => {
		const prefs = TestBed.inject(StorageService);
		prefs.setErrorGroupsViewMode('table');
		build();

		const spy = vi.fn();
		component.modeChange.subscribe(spy);
		component.onModeChange(null);

		expect(component.viewMode()).toBe('table');
		expect(spy).not.toHaveBeenCalled();
	});

	// #region Sync visual (drill-down del heatmap, brief 432 P68 F8.2)
	it('activeMode sincroniza el signal visual sin persistir en localStorage', () => {
		build();
		expect(component.viewMode()).toBe('kanban');

		fixture.componentRef.setInput('activeMode', 'table');
		fixture.detectChanges();

		expect(component.viewMode()).toBe('table');
		const prefs = TestBed.inject(StorageService);
		expect(prefs.getErrorGroupsViewMode()).toBe('kanban');
	});
	// #endregion
});
