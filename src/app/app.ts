import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HeaderComponent } from './components/layout/header';
import { FooterComponent } from './components/layout/footer';

@Component({
	selector: 'app-root',
	standalone: true,
	imports: [RouterOutlet, HeaderComponent, FooterComponent],
	templateUrl: './app.html',
	styleUrl: './app.scss',
})
export class App {
	title = 'Educa.com.pe';
}
