// #region Imports
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@config/environment';
import { Grado } from './cursos.models';

// #endregion
// #region Implementation
@Injectable({ providedIn: 'root' })
export class GradosService {
	private http = inject(HttpClient);
	private apiUrl = `${environment.apiUrl}/api/sistema/grados`;

	getGrados(): Observable<Grado[]> {
		return this.http.get<Grado[]>(this.apiUrl);
	}
}
// #endregion
