import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'formatTime', standalone: true, pure: true })
export class FormatTimePipe implements PipeTransform {
	transform(isoString: string | null): string {
		if (!isoString) return '-';
		const match = isoString.match(/T(\d{2}:\d{2})/);
		return match ? match[1] : isoString;
	}
}
