import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';

interface ContactForm {
  name: string;
  phone: string;
}

@Component({
  selector: 'app-hero-section',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './hero-section.html',
  styleUrl: './hero-section.scss',
})
export class HeroSectionComponent {
  formData: ContactForm = {
    name: '',
    phone: ''
  };

  isSubmitting = false;

  onSubmit(): void {
    if (this.formData.name && this.formData.phone) {
      this.isSubmitting = true;

      // Simular envío a Formspree o backend
      const formspreeUrl = 'https://formspree.io/f/mzzprebk';

      fetch(formspreeUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(this.formData),
      })
        .then(() => {
          alert('¡Gracias por contactarnos! Nos comunicaremos contigo pronto.');
          this.formData = { name: '', phone: '' };
        })
        .catch(() => {
          alert('Hubo un error al enviar el formulario. Por favor, intenta de nuevo.');
        })
        .finally(() => {
          this.isSubmitting = false;
        });
    }
  }

  scrollToSection(event: Event, sectionId: string): void {
    event.preventDefault();
    const element = document.getElementById(sectionId);
    if (element) {
      const navbarHeight = document.querySelector('.navbar')?.clientHeight || 0;
      const offsetTop = element.offsetTop - navbarHeight;
      window.scrollTo({ top: offsetTop, behavior: 'smooth' });
    }
  }
}
