// #region Imports
import { Component, ChangeDetectionStrategy } from '@angular/core';

import { LevelPageComponent } from '../shared/level-page/level-page.component';
import { LevelPageData } from '../shared/level-page-data';

// #endregion
// #region Implementation
const DATA: LevelPageData = {
	level: 'secundaria',
	title: 'Nivel Secundaria',
	breadcrumbLabel: 'Secundaria',
	blocks: [
		{
			textBlockClass: 'custom-text-block',
			imageFirst: false,
			heading: 'Fortalecemos la identidad cultural y el orgullo por lo nuestro',
			body: 'En Educa.com la identidad cultural es fundamental, trabajamos para que nuestros estudiantes vivan orgullosos la diversidad cultural de nuestro país en cada nueva experiencia.',
		},
		{
			textBlockClass: 'custom-text-block-2',
			imageFirst: true,
			heading: 'Mantenemos un ambiente activo y de competencia sana',
			body: 'Un estilo de vida activo es importante en la vida de todos, mantenemos constantes actividades recreativas donde nuestros alumnos pueden divertirse, ejercitarse y competir sanamente.',
		},
		{
			textBlockClass: 'custom-text-block',
			imageFirst: false,
			heading: 'Formamos las futuras generaciones del país',
			body: 'Trabajamos día a día para que cada estudiante pueda seguir el futuro que le apasiona, apostamos por el nuevo talento y la diversidad de oportunidades a las que pueden acceder.',
		},
	],
};

@Component({
	selector: 'app-secundaria',
	standalone: true,
	imports: [LevelPageComponent],
	template: `<app-level-page [data]="data" />`,
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SecundariaComponent {
	readonly data = DATA;
}
// #endregion
