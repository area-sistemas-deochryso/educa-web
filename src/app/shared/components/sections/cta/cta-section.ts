import { Component } from '@angular/core';
import { Tooltip } from 'primeng/tooltip';

@Component({
	selector: 'app-cta-section',
	standalone: true,
	imports: [Tooltip],
	templateUrl: './cta-section.html',
	styleUrl: './cta-section.scss',
})
export class CtaSectionComponent {}
