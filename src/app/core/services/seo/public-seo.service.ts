// #region Imports
import { DOCUMENT } from '@angular/common';
import { DestroyRef, Injectable, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Meta } from '@angular/platform-browser';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';
import { logger } from '@core/helpers';

import type { PublicSeoMeta } from './public-seo.model';

// #endregion
// #region Implementation
const SITE_URL = 'https://educa.com.pe';
const DEFAULT_OG_IMAGE = `${SITE_URL}/images/logo.avif`;

/**
 * Setea description/OG/canonical por ruta pública leyendo `route.data.seo`
 * (brief 681, F7). Único punto de entrada — evita repetir `Meta.updateTag`
 * en cada componente público.
 */
@Injectable({ providedIn: 'root' })
export class PublicSeoService {
	private readonly router = inject(Router);
	private readonly route = inject(ActivatedRoute);
	private readonly meta = inject(Meta);
	private readonly document = inject(DOCUMENT);
	private readonly destroyRef = inject(DestroyRef);

	constructor() {
		this.trackNavigation();
		this.applyForActiveRoute();
	}

	private trackNavigation(): void {
		this.router.events
			.pipe(
				filter((event): event is NavigationEnd => event instanceof NavigationEnd),
				takeUntilDestroyed(this.destroyRef),
			)
			.subscribe(() => this.applyForActiveRoute());
	}

	private applyForActiveRoute(): void {
		const seo = this.deepestRouteData();
		if (!seo) {
			logger.tagged('PublicSeoService', 'warn', `Ruta ${this.router.url} sin data.seo`);
			return;
		}

		this.meta.updateTag({ name: 'description', content: seo.description });
		this.meta.updateTag({ property: 'og:title', content: seo.ogTitle });
		this.meta.updateTag({
			property: 'og:description',
			content: seo.ogDescription ?? seo.description,
		});
		this.meta.updateTag({ property: 'og:image', content: seo.ogImage ?? DEFAULT_OG_IMAGE });
		this.updateCanonicalLink(`${SITE_URL}${seo.canonicalPath}`);
	}

	private deepestRouteData(): PublicSeoMeta | null {
		let current = this.route.root;
		while (current.firstChild) {
			current = current.firstChild;
		}
		return (current.snapshot.data['seo'] as PublicSeoMeta | undefined) ?? null;
	}

	private updateCanonicalLink(href: string): void {
		let link = this.document.head.querySelector<HTMLLinkElement>("link[rel='canonical']");
		if (!link) {
			link = this.document.createElement('link');
			link.setAttribute('rel', 'canonical');
			this.document.head.appendChild(link);
		}
		link.setAttribute('href', href);
	}
}
// #endregion
