// #region Imports
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { PreviewLayout } from '@features/intranet/pages/cross-role/home-component/quick-access.config';

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
}
// #endregion
