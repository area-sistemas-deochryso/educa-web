// #region Imports
import { Component, ChangeDetectionStrategy } from '@angular/core';

import { LevelPageComponent } from '../shared/level-page/level-page.component';
import { LevelPageData } from '../shared/level-page-data';

// #endregion
// #region Implementation
const DATA: LevelPageData = {
	level: 'inicial',
	title: 'Nivel Inicial',
	breadcrumbLabel: 'Inicial',
	blocks: [
		{
			textBlockClass: 'custom-text-block',
			imageFirst: false,
			heading: 'Desarrollamos la creatividad de cada alumno desde la edad más temprana',
			body: 'Trabajamos las habilidades desde el primer día, y nos centramos en formar un ambiente óptimo para el crecimiento integral de cada estudiante.',
		},
		{
			textBlockClass: 'custom-text-block-2',
			imageFirst: true,
			heading: 'La voz de nuestros alumnos es nuestro mayor tesoro',
			body: 'En Educa.com todos tienen una historia que contar, así que proveemos a cada niño las herramientas para escribir su propia historia.',
		},
		{
			textBlockClass: 'custom-text-block',
			imageFirst: false,
			heading: 'Una educación vivencial e integral',
			body: 'Cada aprendizaje es una nueva aventura, en nuestras visitas de estudio vivirás aventuras donde el conocimiento tomará una nueva dimensión.',
		},
	],
};

@Component({
	selector: 'app-inicial',
	standalone: true,
	imports: [LevelPageComponent],
	template: `<app-level-page [data]="data" />`,
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InicialComponent {
	readonly data = DATA;
}
// #endregion
