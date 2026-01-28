import { AppComponent } from './app/app';
import { appConfig } from './app/app.config';
import { bootstrapApplication } from '@angular/platform-browser';

bootstrapApplication(AppComponent, appConfig)
	.then(() => {
		document.getElementById('boot-loader')?.remove();
	})
	.catch((err) => console.error(err));
