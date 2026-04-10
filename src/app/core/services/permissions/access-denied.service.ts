import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class AccessDeniedService {
	private readonly _deniedRoute = signal<string | null>(null);
	readonly deniedRoute = this._deniedRoute.asReadonly();

	show(route: string): void {
		this._deniedRoute.set(route);
	}

	dismiss(): void {
		this._deniedRoute.set(null);
	}
}
