import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
	selector: 'app-inicial',
	standalone: true,
	imports: [RouterLink],
	templateUrl: './inicial.html',
	styleUrl: './inicial.scss',
})
export class InicialComponent {}
