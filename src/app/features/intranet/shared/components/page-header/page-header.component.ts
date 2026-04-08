// #region Imports
import { ChangeDetectionStrategy, Component, input } from '@angular/core';

// #endregion

@Component({
	selector: 'app-page-header',
	standalone: true,
	templateUrl: './page-header.component.html',
	styleUrl: './page-header.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PageHeaderComponent {
	readonly icon = input.required<string>();
	readonly title = input.required<string>();
	readonly subtitle = input<string>();
}
