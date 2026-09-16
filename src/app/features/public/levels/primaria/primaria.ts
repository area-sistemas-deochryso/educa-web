// #region Imports
import { Component, ChangeDetectionStrategy } from '@angular/core';

import { LevelPageComponent } from '../shared/level-page/level-page.component';
import { LevelPageData } from '../shared/level-page-data';

// #endregion
// #region Implementation
const DATA: LevelPageData = {
	level: 'primaria',
	title: 'Nivel Primaria',
	breadcrumbLabel: 'Primaria',
	blocks: [
		{
			textBlockClass: 'custom-text-block-3',
			imageFirst: false,
			heading: 'Creemos en el poder de la experimentación en la educación',
			body: 'Nuestros alumnos del nivel primaria experimentan día a día, vuelven realidad sus ideas y están en constante búsqueda de nuevos objetivos.',
		},
		{
			textBlockClass: 'custom-text-block-2',
			imageFirst: true,
			heading: 'La actividad física y pausas activas son claves para el desarrollo',
			body: 'Nos preocupamos por mantener a nuestros estudiantes con una buena salud física, manteniendo actividades física de manera constante y recreativa.',
		},
		{
			textBlockClass: 'custom-text-block-3',
			imageFirst: false,
			heading: 'Creamos orgullo e identidad con la institución',
			body: 'Los alumnos de Educa.com se sienten parte de la institución, representando así nuestros colores y emblemas en las distintas actividades extracurriculares de las que el colegio forma parte.',
		},
	],
};

@Component({
	selector: 'app-primaria',
	standalone: true,
	imports: [LevelPageComponent],
	template: `<app-level-page [data]="data" />`,
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PrimariaComponent {
	readonly data = DATA;
}
// #endregion
