import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HeaderComponent } from '../header';
import { FooterComponent } from '../footer';

@Component({
	selector: 'app-main-layout',
	imports: [RouterOutlet, HeaderComponent, FooterComponent],
	templateUrl: './main-layout.component.html',
	styleUrl: './main-layout.component.scss',
})
export class MainLayoutComponent {}
