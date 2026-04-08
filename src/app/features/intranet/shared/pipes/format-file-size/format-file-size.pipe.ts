import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'formatFileSize', standalone: true, pure: true })
export class FormatFileSizePipe implements PipeTransform {
	transform(bytes: number | null | undefined): string {
		if (bytes == null || bytes === 0) return '0 B';
		const k = 1024;
		const sizes = ['B', 'KB', 'MB', 'GB'];
		const i = Math.floor(Math.log(bytes) / Math.log(k));
		return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
	}
}
