import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'pluralize', standalone: true, pure: true })
export class PluralizePipe implements PipeTransform {
	transform(count: number | null | undefined, singular: string, plural?: string): string {
		const value = count ?? 0;
		const word = value === 1 ? singular : (plural ?? `${singular}s`);
		return `${value} ${word}`;
	}
}
