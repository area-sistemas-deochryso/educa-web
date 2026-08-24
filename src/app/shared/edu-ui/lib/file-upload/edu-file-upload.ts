import { ChangeDetectionStrategy, Component, ElementRef, input, output, signal, viewChild } from '@angular/core';

export interface EduFileUploadSelectEvent {
	files: File[];
}

@Component({
	selector: 'edu-file-upload',
	standalone: true,
	changeDetection: ChangeDetectionStrategy.OnPush,
	template: `
		<div class="edu-file-upload">
			<input
				#nativeInput
				type="file"
				class="edu-file-upload__native-input"
				hidden
				[attr.accept]="accept() ?? null"
				[attr.multiple]="multiple() ? '' : null"
				[disabled]="disabled()"
				(change)="onNativeChange($event)"
			/>
			<button type="button" class="edu-file-upload__choose" [disabled]="disabled()" (click)="nativeInput.click()">
				<i class="pi pi-upload"></i>
				<span>{{ chooseLabel() }}</span>
			</button>
			@if (selectedFiles().length > 0) {
				<div class="edu-file-upload__files">
					@for (file of selectedFiles(); track file.name + file.size) {
						<span class="edu-file-upload__file">{{ file.name }}</span>
					}
					<button type="button" class="edu-file-upload__clear" (click)="clear()" aria-label="Quitar archivo">
						<i class="pi pi-times"></i>
					</button>
				</div>
			}
			@if (errorMessage()) {
				<span class="edu-file-upload__error">{{ errorMessage() }}</span>
			}
		</div>
	`,
	styleUrl: './edu-file-upload.scss',
})
export class EduFileUpload {
	readonly multiple = input(false);
	readonly accept = input<string>();
	readonly maxFileSize = input<number>();
	readonly customUpload = input(false);
	readonly chooseLabel = input('Elegir archivo');
	readonly disabled = input(false);

	readonly onSelect = output<EduFileUploadSelectEvent>();
	readonly onClear = output<void>();
	readonly uploadHandler = output<EduFileUploadSelectEvent>();

	private readonly nativeInputRef = viewChild<ElementRef<HTMLInputElement>>('nativeInput');

	protected readonly selectedFiles = signal<File[]>([]);
	protected readonly errorMessage = signal<string | null>(null);

	protected onNativeChange(event: Event): void {
		const input = event.target as HTMLInputElement;
		const files = Array.from(input.files ?? []);
		input.value = '';
		if (files.length === 0) {
			return;
		}

		const maxSize = this.maxFileSize();
		const valid = maxSize ? files.filter((file) => file.size <= maxSize) : files;

		if (valid.length === 0) {
			this.errorMessage.set('El archivo supera el tamaño máximo permitido.');
			return;
		}
		this.errorMessage.set(valid.length < files.length ? 'Algunos archivos superan el tamaño máximo permitido.' : null);
		this.selectedFiles.set(valid);

		if (this.customUpload()) {
			this.uploadHandler.emit({ files: valid });
		} else {
			this.onSelect.emit({ files: valid });
		}
	}

	protected clear(): void {
		this.selectedFiles.set([]);
		this.errorMessage.set(null);
		const input = this.nativeInputRef()?.nativeElement;
		if (input) {
			input.value = '';
		}
		this.onClear.emit();
	}
}
