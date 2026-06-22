import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ForceLogoutSignal {
	readonly logout$ = new Subject<void>();

	emit(): void {
		this.logout$.next();
	}
}
