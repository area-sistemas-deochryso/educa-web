import { RouterLink, RouterLinkActive } from '@angular/router';
import { Component } from '@angular/core';
import { environment } from '@config/environment';

@Component({
	selector: 'app-header',
	standalone: true,
	imports: [RouterLink, RouterLinkActive],
	templateUrl: './header.html',
	styleUrl: './header.scss',
})
export class HeaderComponent {
	showIntranetLink = environment.showIntranetLink;
}
