import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'initials', standalone: true, pure: true })
export class InitialsPipe implements PipeTransform {
	transform(name: string | null | undefined): string {
		if (!name) return '';
		return name
			.split(' ')
			.slice(0, 2)
			.map((w) => w[0])
			.join('')
			.toUpperCase();
	}
}
