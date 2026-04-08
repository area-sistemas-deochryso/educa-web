import { Component, ChangeDetectionStrategy, input, output, signal } from '@angular/core';

import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';

@Component({
	selector: 'app-script-output',
	standalone: true,
	imports: [ButtonModule, TooltipModule],
	templateUrl: './script-output.component.html',
	styleUrl: './script-output.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ScriptOutputComponent {
	// #region Inputs/Outputs
	readonly script = input.required<string>();
	readonly copied = input(false);

	readonly copyScript = output<void>();
	readonly download = output<void>();
	// #endregion

	// #region Estado local
	readonly guideExpanded = signal(false);
	// #endregion

	// #region Event handlers
	onCopy(): void {
		this.copyScript.emit();
	}

	onDownload(): void {
		this.download.emit();
	}
	// #endregion
}
