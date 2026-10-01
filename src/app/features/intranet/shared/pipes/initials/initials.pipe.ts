import { Pipe, PipeTransform } from '@angular/core';
import { getPersonInitials } from '@core/helpers';

@Pipe({ name: 'initials', standalone: true, pure: true })
export class InitialsPipe implements PipeTransform {
	transform(name: string | null | undefined): string {
		return getPersonInitials(name);
	}
}
