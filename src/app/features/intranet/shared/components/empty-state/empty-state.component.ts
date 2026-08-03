// #region Imports
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { PageHeaderComponent } from '../page-header';

// #endregion

@Component({
	selector: 'app-empty-state',
	standalone: true,
	imports: [PageHeaderComponent],
	templateUrl: './empty-state.component.html',
	styleUrl: './empty-state.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmptyStateComponent {
	readonly icon = input.required<string>();
	readonly title = input.required<string>();
	readonly subtitle = input<string>();
	readonly message = input.required<string>();
}
