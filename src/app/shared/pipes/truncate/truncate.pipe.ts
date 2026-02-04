import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
	name: 'truncate',
	standalone: true,
})
export class TruncatePipe implements PipeTransform {
	transform(value: string, limit = 100, trail = '...'): string {
		if (!value) return '';
		// Character-based truncation; does not attempt word boundaries.
		if (value.length <= limit) return value;
		return value.substring(0, limit) + trail;
	}
}
