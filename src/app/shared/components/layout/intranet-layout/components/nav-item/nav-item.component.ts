import { Component, Input, booleanAttribute } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
	selector: 'app-nav-item',
	standalone: true,
	imports: [RouterLink, RouterLinkActive],
	templateUrl: './nav-item.component.html',
	styleUrl: './nav-item.component.scss',
})
export class NavItemComponent {
	@Input({ required: true }) route!: string;
	@Input({ required: true }) label!: string;
	@Input({ required: true }) icon!: string;
	@Input({ transform: booleanAttribute }) exact = false;
}
