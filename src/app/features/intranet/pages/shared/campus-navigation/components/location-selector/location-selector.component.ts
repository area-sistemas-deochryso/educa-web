// #region Imports
import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';

// #endregion

interface SelectOption {
	label: string;
	value: string;
	floor: number;
}

type SelectionMode = 'start' | 'destination';

@Component({
	selector: 'app-location-selector',
	standalone: true,
	imports: [FormsModule, ButtonModule, InputTextModule, IconFieldModule, InputIconModule],
	changeDetection: ChangeDetectionStrategy.OnPush,
	template: `
		<div class="location-selector">
			<!-- Toggle de modo -->
			<div class="mode-toggle">
				<button type="button" class="mode-btn"
					[class.active]="selectionMode() === 'start'"
					[class.has-value]="!!startNodeId()"
					(click)="selectionMode.set('start')">
					<span class="mode-icon">📍</span>
					<span class="mode-info">
						<span class="mode-label">Inicio</span>
						<span class="mode-value">{{ startLabel() }}</span>
					</span>
					@if (startNodeId()) {
						<button type="button" class="mode-clear" (click)="clearStart($event)"
							aria-label="Quitar inicio">✕</button>
					}
				</button>

				<button type="button" class="mode-btn"
					[class.active]="selectionMode() === 'destination'"
					[class.has-value]="!!destinationNodeId()"
					(click)="selectionMode.set('destination')">
					<span class="mode-icon">🎯</span>
					<span class="mode-info">
						<span class="mode-label">Destino</span>
						<span class="mode-value">{{ destLabel() }}</span>
					</span>
					@if (destinationNodeId()) {
						<button type="button" class="mode-clear" (click)="clearDest($event)"
							aria-label="Quitar destino">✕</button>
					}
				</button>
			</div>

			<!-- Buscador -->
			<div class="search-box">
				<p-iconfield>
					<p-inputicon styleClass="pi pi-search" />
					<input type="text" pInputText
						[ngModel]="searchQuery()"
						(ngModelChange)="searchQuery.set($event)"
						[placeholder]="selectionMode() === 'start' ? 'Buscar punto de inicio...' : 'Buscar destino...'"
					/>
				</p-iconfield>

				<!-- Resultados -->
				@if (searchQuery().length > 0) {
					<div class="search-results">
						@for (item of filteredOptions(); track item.value) {
							<button type="button" class="search-item" (click)="selectItem(item)">
								<span class="search-item-name">{{ item.label }}</span>
								<span class="search-item-floor">Piso {{ item.floor }}</span>
							</button>
						} @empty {
							<div class="search-empty">Sin resultados</div>
						}
					</div>
				}
			</div>

			<!-- Limpiar ruta -->
			@if (hasPath()) {
				<button pButton icon="pi pi-times"
					class="p-button-sm p-button-outlined p-button-secondary"
					label="Limpiar"
					(click)="clear.emit()"
					[pt]="{ root: { 'aria-label': 'Limpiar ruta' } }"
				></button>
			}
		</div>
	`,
	styles: `
		.location-selector {
			display: flex;
			align-items: flex-start;
			gap: 0.75rem;
			flex-wrap: wrap;
		}

		// #region Toggle de modo
		.mode-toggle {
			display: flex;
			gap: 0.5rem;
		}

		.mode-btn {
			display: flex;
			align-items: center;
			gap: 0.5rem;
			padding: 0.5rem 0.75rem;
			border: 2px solid var(--surface-300);
			border-radius: 10px;
			background: var(--surface-0);
			cursor: pointer;
			transition: all 0.15s;
			min-width: 140px;
			position: relative;

			&.active {
				border-color: var(--primary-color);
				background: var(--primary-50, rgba(79,70,229,0.06));
				box-shadow: 0 0 0 2px rgba(79,70,229,0.15);
			}

			&.has-value .mode-value {
				color: var(--text-color);
				font-weight: 600;
			}

			&:hover:not(.active) {
				border-color: var(--surface-400);
			}
		}

		.mode-icon { font-size: 1.1rem; }

		.mode-info {
			display: flex;
			flex-direction: column;
			align-items: flex-start;
			gap: 1px;
		}

		.mode-label {
			font-size: 0.65rem;
			font-weight: 700;
			text-transform: uppercase;
			letter-spacing: 0.5px;
			color: var(--text-color-secondary);
		}

		.mode-value {
			font-size: 0.8rem;
			color: var(--text-color-secondary);
			max-width: 120px;
			overflow: hidden;
			text-overflow: ellipsis;
			white-space: nowrap;
		}

		.mode-clear {
			position: absolute;
			top: 2px;
			right: 2px;
			width: 18px;
			height: 18px;
			border-radius: 50%;
			border: none;
			background: var(--surface-300);
			color: var(--text-color);
			font-size: 10px;
			cursor: pointer;
			display: flex;
			align-items: center;
			justify-content: center;
			line-height: 1;

			&:hover { background: #ef4444; color: #fff; }
		}
		// #endregion

		// #region Buscador
		.search-box {
			position: relative;
			min-width: 220px;
			flex: 1;
		}

		.search-results {
			position: absolute;
			top: 100%;
			left: 0;
			right: 0;
			z-index: 100;
			background: var(--surface-0);
			border: 1px solid var(--surface-300);
			border-radius: 8px;
			margin-top: 4px;
			max-height: 200px;
			overflow-y: auto;
			box-shadow: 0 4px 16px rgba(0,0,0,0.12);
		}

		.search-item {
			display: flex;
			align-items: center;
			justify-content: space-between;
			width: 100%;
			padding: 0.5rem 0.75rem;
			border: none;
			background: none;
			cursor: pointer;
			text-align: left;
			transition: background 0.1s;

			&:hover {
				background: var(--primary-50, rgba(79,70,229,0.06));
			}
		}

		.search-item-name {
			font-size: 0.85rem;
			font-weight: 500;
			color: var(--text-color);
		}

		.search-item-floor {
			font-size: 0.7rem;
			color: var(--text-color-secondary);
			background: var(--surface-100);
			padding: 2px 6px;
			border-radius: 4px;
		}

		.search-empty {
			padding: 0.75rem;
			text-align: center;
			color: var(--text-color-secondary);
			font-size: 0.85rem;
		}
		// #endregion
	`,
})
export class LocationSelectorComponent {
	// #region Inputs / Outputs
	readonly allOptions = input.required<SelectOption[]>();
	readonly startNodeId = input<string | null>(null);
	readonly destinationNodeId = input<string | null>(null);
	readonly hasPath = input(false);

	readonly startChange = output<string>();
	readonly destinationChange = output<string>();
	readonly clear = output<void>();

	/** Modo de selección actual — compartido con el mapa 2D */
	readonly selectionMode = signal<SelectionMode>('start');
	readonly selectionModeChange = output<SelectionMode>();
	// #endregion

	// #region Estado local
	readonly searchQuery = signal('');
	// #endregion

	// #region Computed
	readonly startLabel = computed(() => {
		const id = this.startNodeId();
		if (!id) return 'Seleccionar...';
		return this.allOptions().find((o) => o.value === id)?.label ?? 'Seleccionar...';
	});

	readonly destLabel = computed(() => {
		const id = this.destinationNodeId();
		if (!id) return 'Seleccionar...';
		return this.allOptions().find((o) => o.value === id)?.label ?? 'Seleccionar...';
	});

	readonly filteredOptions = computed(() => {
		const q = this.searchQuery().toLowerCase().trim();
		if (!q) return [];
		return this.allOptions().filter((o) =>
			o.label.toLowerCase().includes(q),
		);
	});
	// #endregion

	// #region Event handlers
	selectItem(item: SelectOption): void {
		if (this.selectionMode() === 'start') {
			this.startChange.emit(item.value);
			// Auto-switch a destino después de seleccionar inicio
			this.selectionMode.set('destination');
		} else {
			this.destinationChange.emit(item.value);
		}
		this.searchQuery.set('');
	}

	clearStart(e: Event): void {
		e.stopPropagation();
		this.startChange.emit('');
		this.selectionMode.set('start');
	}

	clearDest(e: Event): void {
		e.stopPropagation();
		this.destinationChange.emit('');
		this.selectionMode.set('destination');
	}
	// #endregion
}
