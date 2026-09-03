// #region Imports
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { EduPopover } from '@edu-ui';
import { ResolvedQuickAccessItem } from '@intranet-shared/services';
import { QuickAccessCardComponent } from '../quick-access-card/quick-access-card';

// #endregion
// #region Implementation
@Component({
	selector: 'app-quick-access-group-card',
	standalone: true,
	imports: [EduPopover, QuickAccessCardComponent],
	templateUrl: './quick-access-group-card.html',
	styleUrl: './quick-access-group-card.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuickAccessGroupCardComponent {
	label = input.required<string>();
	items = input.required<ResolvedQuickAccessItem[]>();

	/** Hasta 4 íconos representativos para la vista de carpeta colapsada. */
	readonly previewIcons = computed(() => this.items().slice(0, 4).map((item) => item.icon));
}
// #endregion