// #region Imports
import { Component, ChangeDetectionStrategy } from '@angular/core';
import { EduTooltip } from '@edu-ui';

// #endregion
// #region Implementation
@Component({
	selector: 'app-cta-section',
	standalone: true,
	imports: [EduTooltip],
	templateUrl: './cta-section.html',
	changeDetection: ChangeDetectionStrategy.OnPush,
	styleUrl: './cta-section.scss',
})
export class CtaSectionComponent {
	// * Simple CTA section (static content).
}
// #endregion
