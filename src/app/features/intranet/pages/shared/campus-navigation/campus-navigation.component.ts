import { ChangeDetectionStrategy, Component, inject, input, OnInit, signal, ViewChild } from '@angular/core';

import { CampusNavigationFacade } from './services/campus-navigation.facade';
import { CampusMapComponent } from './components/campus-map/campus-map.component';
import { Campus3dViewComponent } from './components/campus-3d-view/campus-3d-view.component';
import { FloorSelectorComponent } from './components/floor-selector/floor-selector.component';
import { LocationSelectorComponent } from './components/location-selector/location-selector.component';
import { NavigationStepsComponent } from './components/navigation-steps/navigation-steps.component';
import { SchedulePanelComponent } from './components/schedule-panel/schedule-panel.component';

@Component({
	selector: 'app-campus-navigation',
	standalone: true,
	imports: [
		CampusMapComponent,
		Campus3dViewComponent,
		FloorSelectorComponent,
		LocationSelectorComponent,
		NavigationStepsComponent,
		SchedulePanelComponent,
	],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: './campus-navigation.component.html',
	styleUrl: './campus-navigation.component.scss',
})
export class CampusNavigationComponent implements OnInit {
	private facade = inject(CampusNavigationFacade);

	@ViewChild('locationSelector') locationSelector!: LocationSelectorComponent;

	/** Oculta sidebar de horario y ajusta layout para embeber en diálogos */
	readonly embedded = input(false);
	/** Salón destino al que auto-navegar (solo en modo embedded) */
	readonly targetSalonId = input<number | null>(null);

	readonly vm      = this.facade.vm;
	readonly show3d  = signal(false);

	// #region Lifecycle

	ngOnInit(): void {
		const targetId = this.targetSalonId();
		this.facade.loadData(targetId ?? undefined);
	}

	// #endregion
	// #region Event handlers

	onFloorChange(floor: number): void {
		this.facade.selectFloor(floor);
	}

	onStartChange(nodeId: string): void {
		if (!nodeId) {
			this.facade.clearStart();
			return;
		}
		this.facade.setStartNode(nodeId);
	}

	onDestinationChange(nodeId: string): void {
		if (!nodeId) {
			this.facade.clearPath();
			return;
		}
		this.facade.setDestination(nodeId);
	}

	onMapNodeClick(nodeId: string): void {
		const mode = this.locationSelector?.selectionMode() ?? 'start';
		if (mode === 'start') {
			this.facade.setStartNode(nodeId);
			this.locationSelector?.selectionMode.set('destination');
		} else {
			this.facade.setDestination(nodeId);
		}
	}

	onNavigateToSalon(salonId: number): void {
		this.facade.navigateToSalon(salonId);
	}

	onClearPath(): void {
		this.facade.clearPath();
	}

	on3dPositionChange(nodeId: string): void {
		this.facade.setStartNode(nodeId);
	}

	// #endregion
}
