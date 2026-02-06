import { ChangeDetectionStrategy, Component, inject, OnInit } from '@angular/core';

import { CampusNavigationFacade } from './services/campus-navigation.facade';
import { CampusMapComponent } from './components/campus-map/campus-map.component';
import { FloorSelectorComponent } from './components/floor-selector/floor-selector.component';
import { LocationSelectorComponent } from './components/location-selector/location-selector.component';
import { NavigationStepsComponent } from './components/navigation-steps/navigation-steps.component';
import { SchedulePanelComponent } from './components/schedule-panel/schedule-panel.component';

@Component({
	selector: 'app-campus-navigation',
	standalone: true,
	imports: [
		CampusMapComponent,
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

	readonly vm = this.facade.vm;

	// ============ Lifecycle ============

	ngOnInit(): void {
		this.facade.loadSchedule();
	}

	// ============ Event handlers ============

	onFloorChange(floor: number): void {
		this.facade.selectFloor(floor);
	}

	onStartChange(nodeId: string): void {
		this.facade.setStartNode(nodeId);
	}

	onDestinationChange(nodeId: string): void {
		this.facade.setDestination(nodeId);
	}

	onMapNodeClick(nodeId: string): void {
		this.facade.onMapNodeClick(nodeId);
	}

	onNavigateToSalon(salonId: number): void {
		this.facade.navigateToSalon(salonId);
	}

	onClearPath(): void {
		this.facade.clearPath();
	}
}
