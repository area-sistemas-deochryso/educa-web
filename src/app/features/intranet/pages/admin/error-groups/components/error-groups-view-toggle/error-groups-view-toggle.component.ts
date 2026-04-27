import {
	ChangeDetectionStrategy,
	Component,
	OnInit,
	inject,
	output,
	signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { SelectButtonModule } from 'primeng/selectbutton';

import { ErrorGroupsViewMode, StorageService } from '@core/services/storage';

interface ToggleOption {
	label: string;
	value: ErrorGroupsViewMode;
	icon: string;
}

/**
 * Toggle segmented (Kanban / Tabla) que persiste la preferencia en
 * `PreferencesStorageService`. Default Kanban primera vez.
 */
@Component({
	selector: 'app-error-groups-view-toggle',
	standalone: true,
	changeDetection: ChangeDetectionStrategy.OnPush,
	imports: [CommonModule, FormsModule, SelectButtonModule],
	templateUrl: './error-groups-view-toggle.component.html',
	styleUrl: './error-groups-view-toggle.component.scss',
})
export class ErrorGroupsViewToggleComponent implements OnInit {
	private readonly storage = inject(StorageService);

	readonly modeChange = output<ErrorGroupsViewMode>();

	readonly viewMode = signal<ErrorGroupsViewMode>('kanban');

	readonly options: ToggleOption[] = [
		{ label: 'Kanban', value: 'kanban', icon: 'pi pi-th-large' },
		{ label: 'Tabla', value: 'table', icon: 'pi pi-list' },
	];

	ngOnInit(): void {
		const persisted = this.storage.getErrorGroupsViewMode();
		this.viewMode.set(persisted);
		this.modeChange.emit(persisted);
	}

	onModeChange(mode: ErrorGroupsViewMode | null): void {
		// p-selectButton sin allowEmpty puede emitir null momentáneamente al
		// reseleccionar el ya-activo. Filtramos para mantener la persistencia.
		if (!mode) return;
		this.viewMode.set(mode);
		this.storage.setErrorGroupsViewMode(mode);
		this.modeChange.emit(mode);
	}
}
