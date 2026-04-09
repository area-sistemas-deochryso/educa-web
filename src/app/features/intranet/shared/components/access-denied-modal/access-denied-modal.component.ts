import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { AccessDeniedService } from '@core/services';

@Component({
	selector: 'app-access-denied-modal',
	standalone: true,
	imports: [DialogModule, ButtonModule],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: './access-denied-modal.component.html',
	styleUrl: './access-denied-modal.component.scss',
})
export class AccessDeniedModalComponent {
	private accessDenied = inject(AccessDeniedService);
	private router = inject(Router);

	readonly visible = computed(() => this.accessDenied.deniedRoute() !== null);
	readonly deniedRoute = this.accessDenied.deniedRoute;

	onVisibleChange(visible: boolean): void {
		if (!visible) {
			this.goHome();
		}
	}

	goHome(): void {
		this.accessDenied.dismiss();
		this.router.navigate(['/intranet']);
	}
}
