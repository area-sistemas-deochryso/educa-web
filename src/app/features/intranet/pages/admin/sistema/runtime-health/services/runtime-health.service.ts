import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '@config/environment';

import { RuntimeHealthSnapshot } from '../models/runtime-health.models';

@Injectable({ providedIn: 'root' })
export class RuntimeHealthService {
	private readonly http = inject(HttpClient);
	private readonly endpoint = `${environment.apiUrl}/api/sistema/runtime-health`;

	getSnapshot(): Observable<RuntimeHealthSnapshot> {
		return this.http.get<RuntimeHealthSnapshot>(this.endpoint);
	}
}
