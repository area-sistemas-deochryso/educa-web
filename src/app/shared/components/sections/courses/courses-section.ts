// #region Imports
import { Component } from '@angular/core';
import { Tooltip } from 'primeng/tooltip';

// #endregion
// #region Implementation
interface Course {
	id: number;
	title: string;
	duration: string;
	subject: string;
	logo: string;
	link: string;
}

@Component({
	selector: 'app-courses-section',
	standalone: true,
	imports: [Tooltip],
	templateUrl: './courses-section.html',
	styleUrl: './courses-section.scss',
})
export class CoursesSectionComponent {
	// * Static list of featured courses/links.
	courses: Course[] = [
		{
			id: 1,
			title: 'Tema 01',
			duration: '30 minutos',
			subject: 'Matemáticas',
			logo: 'images/logos/google.webp',
			link: 'https://www.tiktok.com/@educa.com/video/7301428896308759814',
		},
		{
			id: 2,
			title: 'Tema 02',
			duration: '30 minutos',
			subject: 'Comunicación',
			logo: 'images/logos/apple.webp',
			link: 'https://www.tiktok.com/@educa.com/video/7385670015594302725',
		},
		{
			id: 3,
			title: 'Tema 03',
			duration: '30 minutos',
			subject: 'C.T.A',
			logo: 'images/logos/meta.webp',
			link: 'https://www.tiktok.com/@educa.com/video/7357100697281629445',
		},
		{
			id: 4,
			title: 'Tema 04',
			duration: '20 minutos',
			subject: 'Personal Social',
			logo: 'images/logos/slack.webp',
			link: 'https://www.tiktok.com/@educa.com/video/7345115007236967686',
		},
		{
			id: 5,
			title: 'Tema 05',
			duration: '30 minutos',
			subject: 'Arte',
			logo: 'images/logos/creative-market.webp',
			link: 'https://www.tiktok.com/@educa.com/video/7350417755209862405',
		},
	];

	currentPage = 1;
	pages = [1, 2, 3, 4, 5];

	onPageChange(event: Event, page: number): void {
		// * Client-side pagination state.
		event.preventDefault();
		if (page >= 1 && page <= this.pages.length) {
			this.currentPage = page;
		}
	}
}
// #endregion
