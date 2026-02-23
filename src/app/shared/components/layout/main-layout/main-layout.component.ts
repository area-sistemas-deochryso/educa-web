// #region Imports
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HeaderComponent } from '../header';
import { FooterComponent } from '../footer';

// #endregion
// #region Implementation
@Component({
	selector: 'app-main-layout',
	changeDetection: ChangeDetectionStrategy.OnPush,
	imports: [RouterOutlet, HeaderComponent, FooterComponent],
	templateUrl: './main-layout.component.html',
	styleUrl: './main-layout.component.scss',
})
export class MainLayoutComponent {
	// * Shell layout for public pages (header + footer + routed content).
}
// #endregion
