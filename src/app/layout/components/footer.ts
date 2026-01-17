import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [RouterLink, FormsModule],
  templateUrl: './footer.html',
  styleUrl: './footer.scss',
})
export class FooterComponent {
  newsletterEmail = '';

  onNewsletterSubmit(): void {
    if (this.newsletterEmail) {
      console.log('Newsletter subscription:', this.newsletterEmail);
      this.newsletterEmail = '';
    }
  }

  scrollToTop(): void {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}
