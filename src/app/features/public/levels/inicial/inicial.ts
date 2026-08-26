// #region Imports
import { Component, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';

// #endregion
// #region Implementation
@Component({
	selector: 'app-inicial',
	standalone: true,
	imports: [RouterLink],
	templateUrl: './inicial.html',
	changeDetection: ChangeDetectionStrategy.OnPush,
	styleUrl: './inicial.scss',
})
export class InicialComponent {
	// * Inicial level page content.
}
// #endregion
