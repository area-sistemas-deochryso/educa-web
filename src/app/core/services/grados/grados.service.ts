import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@config/environment';

export interface Grado {
	id: number;
	nombre: string;
}

@Injectable({ providedIn: 'root' })
export class GradosService {
	// * Fetches grados catalog from API.
	private http = inject(HttpClient);
	private apiUrl = `${environment.apiUrl}/api/sistema/grados`;

	getGrados(): Observable<Grado[]> {
		return this.http.get<Grado[]>(this.apiUrl);
	}
}
