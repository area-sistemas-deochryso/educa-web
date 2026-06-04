import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { ButtonModule } from 'primeng/button';

@Component({
	selector: 'app-student-gap-profile',
	standalone: true,
	imports: [ButtonModule],
	templateUrl: './student-gap-profile.component.html',
	styleUrl: './student-gap-profile.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StudentGapProfileComponent {
	private route = inject(ActivatedRoute);
	private router = inject(Router);

	private params = toSignal(this.route.paramMap.pipe(map((p) => p.get('id'))));
	readonly estudianteId = computed(() => {
		const raw = this.params();
		return raw ? Number(raw) : null;
	});

	goBack(): void {
		this.router.navigate(['/intranet/admin/monitoreo/correos/dashboard']);
	}
}
