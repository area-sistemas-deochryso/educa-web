import { Pipe, PipeTransform } from '@angular/core';
import { formatFileSize } from '@core/helpers';

@Pipe({ name: 'formatFileSize', standalone: true, pure: true })
export class FormatFileSizePipe implements PipeTransform {
	transform(bytes: number | null | undefined): string {
		return formatFileSize(bytes);
	}
}
