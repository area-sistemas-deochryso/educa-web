import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { IdentityValueDto } from '../../models/diagnostico-db.models';
import { EduButton, EduProgressBar } from '@edu-ui';

@Component({
	selector: 'app-identity-values-progress',
	standalone: true,
	imports: [EduButton, EduProgressBar],
	templateUrl: './identity-values-progress.component.html',
	styleUrl: './identity-values-progress.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IdentityValuesProgressComponent {
	readonly columns = input<IdentityValueDto[]>([]);
	readonly loading = input(false);
	readonly error = input<string | null>(null);

	readonly refresh = output<void>();

	onRefresh(): void {
		this.refresh.emit();
	}

	// * currentValue/maxValue llegan como `long` del BE; el parseo JSON en JS pierde
	// * precisión exacta más allá de 2^53. Se formatean redondeados, nunca crudos.
	formatValue(value: number): string {
		return value.toLocaleString('es-AR');
	}
}
