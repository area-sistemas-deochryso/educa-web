// #region Imports
import { Component } from '@angular/core';
import { Tooltip } from 'primeng/tooltip';

// #endregion
// #region Implementation
@Component({
	selector: 'app-cta-section',
	standalone: true,
	imports: [Tooltip],
	templateUrl: './cta-section.html',
	styleUrl: './cta-section.scss',
})
export class CtaSectionComponent {
	// * Simple CTA section (static content).
}
// #endregion
