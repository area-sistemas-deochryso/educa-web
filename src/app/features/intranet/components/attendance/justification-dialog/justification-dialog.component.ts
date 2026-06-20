import { ChangeDetectionStrategy, Component, input, model, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { Textarea } from 'primeng/textarea';

export interface JustificationContext {
	personId: number;
	personName: string;
	personDni: string;
	date: Date;
	isJustified: boolean;
	observacion?: string;
}

export interface JustificationResult {
	personId: number;
	date: Date;
	observacion: string;
	quitar: boolean;
}

@Component({
	selector: 'app-justification-dialog',
	standalone: true,
	imports: [FormsModule, DialogModule, ButtonModule, Textarea],
	templateUrl: './justification-dialog.component.html',
	styleUrl: './justification-dialog.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class JustificationDialogComponent {
	readonly saving = input<boolean>(false);
	readonly visible = model<boolean>(false);
	readonly justify = output<JustificationResult>();

	readonly context = signal<JustificationContext | null>(null);
	readonly observacionText = signal('');

	open(ctx: JustificationContext): void {
		this.context.set(ctx);
		this.observacionText.set(ctx.observacion ?? '');
		this.visible.set(true);
	}

	close(): void {
		this.visible.set(false);
		this.context.set(null);
		this.observacionText.set('');
	}

	onVisibleChange(val: boolean): void {
		if (!val) this.close();
	}

	guardar(): void {
		const ctx = this.context();
		const obs = this.observacionText().trim();
		if (!ctx || !obs) return;
		this.justify.emit({ personId: ctx.personId, date: ctx.date, observacion: obs, quitar: false });
		this.close();
	}

	quitar(): void {
		const ctx = this.context();
		if (!ctx) return;
		this.justify.emit({ personId: ctx.personId, date: ctx.date, observacion: '', quitar: true });
		this.close();
	}

	formatDate(date: Date): string {
		return new Intl.DateTimeFormat('es-PE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(date);
	}
}
