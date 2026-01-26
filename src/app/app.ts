import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SwService } from '@core/services';
import { ToastContainerComponent } from '@shared/components/toast-container';

@Component({
	selector: 'app-root',
	standalone: true,
	imports: [RouterOutlet, ToastContainerComponent],
	templateUrl: './app.html',
	styleUrl: './app.scss',
})
export class AppComponent {
	private swService = inject(SwService);
	title = 'Educa.com.pe';
}
