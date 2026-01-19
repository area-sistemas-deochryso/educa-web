import { Component, OnInit, OnDestroy } from '@angular/core';

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
  testimonials: Testimonial[] = [
    {
      id: 1,
      name: 'Diego Pérez',
      role: '4° de Secundaria',
      text: 'He estado en este colegio desde primaria y siempre he sentido que es como una segunda casa. Los profesores son muy dedicados y se preocupan por nuestro aprendizaje y bienestar. Además, las actividades extracurriculares me han ayudado a descubrir mis pasiones y talentos. Estoy muy agradecido por todas las oportunidades que he tenido aquí.',
      avatar: 'images/avatar/portrait-charming-middle-aged-attractive-woman-with-blonde-hair.jpg'
    },
    {
      id: 2,
      name: 'Valentina Ruiz',
      role: '3° de Primaria',
      text: 'Me encanta venir al colegio porque siempre aprendemos cosas nuevas y divertidas. Mis profesores son muy amables y siempre están dispuestos a ayudarme. Me gusta mucho participar en las actividades de arte y deportes. ¡Me siento muy feliz de estar en este colegio!',
      avatar: 'images/avatar/portrait-charming-middle-aged-attractive-woman-with-blonde-hair.jpg'
    },
    {
      id: 3,
      name: 'Jorge Martínez',
      role: 'Padre de Mateo (6° de Primaria)',
      text: 'Como padre, es muy importante para mí que mi hijo reciba una educación integral. En este colegio no solo se enfocan en lo académico, sino también en los valores y el desarrollo personal. Los maestros son muy profesionales y siempre están disponibles para discutir el progreso de los estudiantes. Estoy muy satisfecho con la calidad de la educación y el ambiente positivo que se fomenta aquí.',
      avatar: 'images/avatar/portrait-charming-middle-aged-attractive-woman-with-blonde-hair.jpg'
    },
    {
      id: 4,
      name: 'María Fernández',
      role: 'Madre de Camila, 2° de Secundaria',
      text: 'Desde que mi hija ingresó al colegio, he visto un crecimiento increíble en su confianza y habilidades sociales. Ella ha encontrado un espacio seguro para expresarse y aprender. Me encanta cómo el colegio fomenta la creatividad y el pensamiento crítico, y la comunidad es muy acogedora y solidaria. Definitivamente fue la mejor elección para su educación.',
      avatar: 'images/avatar/portrait-charming-middle-aged-attractive-woman-with-blonde-hair.jpg'
    },
    {
      id: 5,
      name: 'Lucía Gómez',
      role: '5 años, Nivel Inicial',
      text: 'Me gusta mucho mi colegio porque juego y aprendo con mis amigos. Mis profesoras son muy cariñosas y siempre nos enseñan cosas interesantes. Me gusta dibujar, cantar y escuchar cuentos. ¡Estoy muy feliz aquí!',
      avatar: 'images/avatar/portrait-charming-middle-aged-attractive-woman-with-blonde-hair.jpg'
    }
  ];

  currentSlide = 0;
  private autoplayInterval: ReturnType<typeof setInterval> | null = null;

  ngOnInit(): void {
    this.startAutoplay();
  }

  ngOnDestroy(): void {
    this.stopAutoplay();
  }

  getDots(): number[] {
    return Array(Math.ceil(this.testimonials.length / 2)).fill(0);
  }

  goToSlide(index: number): void {
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
