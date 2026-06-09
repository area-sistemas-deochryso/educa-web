import { Injectable, PLATFORM_ID, inject, signal, effect } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '@config/environment';
import { type Rol, registerRolLookup } from '@data/models';
import { AuthService } from '@core/services/auth';
import { SignalRService } from '@core/services/signalr';
import { logger } from '@core/helpers';

@Injectable({ providedIn: 'root' })
export class RolService {
	private readonly http = inject(HttpClient);
	private readonly auth = inject(AuthService);
	private readonly signalr = inject(SignalRService);
	private readonly platformId = inject(PLATFORM_ID);
	private readonly apiUrl = `${environment.apiUrl}/api/roles`;

	private readonly _roles = signal<Rol[]>([]);
	private initialized = false;
	readonly roles = this._roles.asReadonly();

	constructor() {
		registerRolLookup(this);
		if (!isPlatformBrowser(this.platformId)) return;

		effect(() => {
			const authenticated = this.auth.isAuthenticated;
			if (authenticated && this._roles().length === 0) {
				this.refresh();
			}
			if (!authenticated) {
				this._roles.set([]);
			}
		});
	}

	async refresh(): Promise<void> {
		try {
			const response = await firstValueFrom(
				this.http.get<{ data: Rol[] }>(this.apiUrl),
			);
			this._roles.set(response.data);
			if (!this.initialized) {
				this.initialized = true;
				this.listenForChanges();
			}
		} catch (err) {
			logger.error('RolService: failed to load roles', err);
		}
	}

	byNombre(nombre: string | undefined): Rol | undefined {
		if (!nombre) return undefined;
		return this._roles().find((r) => r.nombre === nombre);
	}

	byCodigo(codigo: string | undefined): Rol | undefined {
		if (!codigo) return undefined;
		return this._roles().find((r) => r.codigo === codigo);
	}

	byId(id: number | undefined): Rol | undefined {
		if (id == null) return undefined;
		return this._roles().find((r) => r.id === id);
	}

	all(): Rol[] {
		return this._roles();
	}

	private listenForChanges(): void {
		this.signalr.onEvent('RolesChanged', () => {
			logger.log('RolService: RolesChanged event received, refreshing');
			this.refresh();
		});
	}
}
