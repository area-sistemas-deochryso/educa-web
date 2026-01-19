import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
	selector: 'app-faq',
	standalone: true,
	imports: [RouterLink],
	templateUrl: './faq.html',
	styleUrl: './faq.scss',
})
export class FaqComponent {}
