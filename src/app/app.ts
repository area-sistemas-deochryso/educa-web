import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SwService } from '@app/services';

@Component({
	selector: 'app-root',
	standalone: true,
	imports: [RouterOutlet],
	templateUrl: './app.html',
	styleUrl: './app.scss',
})
export class App {
	private swService = inject(SwService);
	title = 'Educa.com.pe';
}
