import { DestroyRef, inject, Injectable } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { EmailOutboxLista } from '@data/models/email-outbox.models';

import { EmailOutboxApiService } from './email-outbox.service';
import { EmailOutboxStore } from './email-outbox.store';

@Injectable({ providedIn: 'root' })
export class EmailOutboxUiFacade {
	// #region Dependencias
	private api = inject(EmailOutboxApiService);
	private store = inject(EmailOutboxStore);
	private destroyRef = inject(DestroyRef);
	// #endregion

	// #region Drawer
	openDetail(item: EmailOutboxLista): void {
		this.store.openDrawer(item);
		this.loadPreview(item.id);
	}

	closeDrawer(): void {
		this.store.closeDrawer();
	}

	private loadPreview(id: number): void {
		this.store.setPreviewLoading(true);
		this.api
			.obtenerHtml(id)
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: (html) => {
					this.store.setPreviewHtml(html);
					this.store.setPreviewLoading(false);
				},
				error: () => this.store.setPreviewLoading(false),
			});
	}
	// #endregion

	// #region Reintento
	reintentar(item: EmailOutboxLista): void {
		this.api
			.reintentar(item.id)
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe((ok) => {
				if (ok) {
					this.store.markAsRetrying(item.id);
				}
			});
	}
	// #endregion
}
