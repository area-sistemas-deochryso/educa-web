import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

@Component({
	selector: 'app-intranet-layout',
	imports: [RouterOutlet, RouterLink, RouterLinkActive],
	templateUrl: './intranet-layout.component.html',
	styleUrl: './intranet-layout.component.scss',
})
export class IntranetLayoutComponent {}
