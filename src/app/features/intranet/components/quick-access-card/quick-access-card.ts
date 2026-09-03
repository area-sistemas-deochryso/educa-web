// #region Imports
import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { PreviewLayout } from '@intranet-shared/config/intranet-menu.config';
import { QuickAccessSize } from '@data/models';

const SIZE_CYCLE: readonly QuickAccessSize[] = ['sm', 'md', 'lg'];

// #endregion
// #region Implementation
@Component({
	selector: 'app-quick-access-card',
	standalone: true,
	imports: [RouterLink],
	templateUrl: './quick-access-card.html',
	styleUrl: './quick-access-card.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuickAccessCardComponent {
	label = input.required<string>();
	path = input.required<string>();
	icon = input<string>('pi-link');
	description = input<string>('');
	preview = input<PreviewLayout>('admin-table');
	size = input<QuickAccessSize>('sm');
	editMode = input(false);

	readonly remove = output<void>();
	readonly rename = output<string>();
	readonly resizeItem = output<QuickAccessSize>();

	protected readonly renaming = signal(false);
	protected readonly draftLabel = signal('');

	onCardClick(event: Event): void {
		if (this.editMode()) event.preventDefault();
	}

	cycleSize(event: Event): void {
		event.preventDefault();
		event.stopPropagation();
		const nextIndex = (SIZE_CYCLE.indexOf(this.size()) + 1) % SIZE_CYCLE.length;
		this.resizeItem.emit(SIZE_CYCLE[nextIndex]);
	}

	startRename(event: Event): void {
		event.preventDefault();
		event.stopPropagation();
		this.draftLabel.set(this.label());
		this.renaming.set(true);
	}

	commitRename(): void {
		if (!this.renaming()) return;
		this.renaming.set(false);
		const value = this.draftLabel().trim();
		if (value && value !== this.label()) this.rename.emit(value);
	}

	onRemove(event: Event): void {
		event.preventDefault();
		event.stopPropagation();
		this.remove.emit();
	}
}
// #endregion
