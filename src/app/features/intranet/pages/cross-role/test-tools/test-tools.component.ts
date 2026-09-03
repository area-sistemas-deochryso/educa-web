// #region Imports
import { Component, ChangeDetectionStrategy } from '@angular/core';

import { PageHeaderComponent } from '@intranet-shared/components';

// #endregion
// #region Component
@Component({
	selector: 'app-test-tools',
	standalone: true,
	imports: [PageHeaderComponent],
	templateUrl: './test-tools.component.html',
	styleUrl: './test-tools.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TestToolsComponent {}
// #endregion
