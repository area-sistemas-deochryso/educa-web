// #region Imports
import { Component, OnInit, OnDestroy } from '@angular/core';

// #endregion
// #region Implementation
interface Testimonial {
	id: number;
	name: string;
	role: string;
	text: string;
	avatar: string;
}

@Component({
	selector: 'app-testimonials-section',
	standalone: true,
	imports: [],
	templateUrl: './testimonials-section.html',
	styleUrl: './testimonials-section.scss',
})
export class TestimonialsSectionComponent implements OnInit, OnDestroy {
	// * Static testimonials data for the carousel.
	testimonials: Testimonial[] = [
		{
			id: 1,
			name: 'Diego PÃƒÂ©rez',
			role: '4Ã‚Â° de Secundaria',
			text: 'He estado en este colegio desde primaria y siempre he sentido que es como una segunda casa. Los profesores son muy dedicados y se preocupan por nuestro aprendizaje y bienestar. AdemÃƒÂ¡s, las actividades extracurriculares me han ayudado a descubrir mis pasiones y talentos. Estoy muy agradecido por todas las oportunidades que he tenido aquÃƒÂ­.',
			avatar: 'images/avatar/portrait-charming-middle-aged-attractive-woman-with-blonde-hair.webp',
		},
		{
			id: 2,
			name: 'Valentina Ruiz',
			role: '3Ã‚Â° de Primaria',
			text: 'Me encanta venir al colegio porque siempre aprendemos cosas nuevas y divertidas. Mis profesores son muy amables y siempre estÃƒÂ¡n dispuestos a ayudarme. Me gusta mucho participar en las actividades de arte y deportes. Ã‚Â¡Me siento muy feliz de estar en este colegio!',
			avatar: 'images/avatar/portrait-charming-middle-aged-attractive-woman-with-blonde-hair.webp',
		},
		{
			id: 3,
			name: 'Jorge MartÃƒÂ­nez',
			role: 'Padre de Mateo (6Ã‚Â° de Primaria)',
			text: 'Como padre, es muy importante para mÃƒÂ­ que mi hijo reciba una educaciÃƒÂ³n integral. En este colegio no solo se enfocan en lo acadÃƒÂ©mico, sino tambiÃƒÂ©n en los valores y el desarrollo personal. Los maestros son muy profesionales y siempre estÃƒÂ¡n disponibles para discutir el progreso de los estudiantes. Estoy muy satisfecho con la calidad de la educaciÃƒÂ³n y el ambiente positivo que se fomenta aquÃƒÂ­.',
			avatar: 'images/avatar/portrait-charming-middle-aged-attractive-woman-with-blonde-hair.webp',
		},
		{
			id: 4,
			name: 'MarÃƒÂ­a FernÃƒÂ¡ndez',
			role: 'Madre de Camila, 2Ã‚Â° de Secundaria',
			text: 'Desde que mi hija ingresÃƒÂ³ al colegio, he visto un crecimiento increÃƒÂ­ble en su confianza y habilidades sociales. Ella ha encontrado un espacio seguro para expresarse y aprender. Me encanta cÃƒÂ³mo el colegio fomenta la creatividad y el pensamiento crÃƒÂ­tico, y la comunidad es muy acogedora y solidaria. Definitivamente fue la mejor elecciÃƒÂ³n para su educaciÃƒÂ³n.',
			avatar: 'images/avatar/portrait-charming-middle-aged-attractive-woman-with-blonde-hair.webp',
		},
		{
			id: 5,
			name: 'LucÃƒÂ­a GÃƒÂ³mez',
			role: '5 aÃƒÂ±os, Nivel Inicial',
			text: 'Me gusta mucho mi colegio porque juego y aprendo con mis amigos. Mis profesoras son muy cariÃƒÂ±osas y siempre nos enseÃƒÂ±an cosas interesantes. Me gusta dibujar, cantar y escuchar cuentos. Ã‚Â¡Estoy muy feliz aquÃƒÂ­!',
			avatar: 'images/avatar/portrait-charming-middle-aged-attractive-woman-with-blonde-hair.webp',
		},
	];

	currentSlide = 0;
	private autoplayInterval: ReturnType<typeof setInterval> | null = null;

	ngOnInit(): void {
		// * Start autoplay on mount.
		this.startAutoplay();
	}

	ngOnDestroy(): void {
		// * Cleanup timer on destroy.
		this.stopAutoplay();
	}

	getDots(): number[] {
		return Array(Math.ceil(this.testimonials.length / 2)).fill(0);
	}

	goToSlide(index: number): void {
		// * Manual navigation resets autoplay.
		this.currentSlide = index;
		this.restartAutoplay();
	}

	private startAutoplay(): void {
		this.autoplayInterval = setInterval(() => {
			this.nextSlide();
		}, 5000);
	}

	private stopAutoplay(): void {
		if (this.autoplayInterval) {
			clearInterval(this.autoplayInterval);
		}
	}

	private restartAutoplay(): void {
		this.stopAutoplay();
		this.startAutoplay();
	}

	private nextSlide(): void {
		const maxSlide = Math.ceil(this.testimonials.length / 2) - 1;
		this.currentSlide = this.currentSlide >= maxSlide ? 0 : this.currentSlide + 1;
	}
}
// #endregion
