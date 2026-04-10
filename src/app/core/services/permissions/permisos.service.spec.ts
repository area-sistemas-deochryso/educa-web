// * Tests for PermissionsService — validates API gateway methods.
// #region Imports
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { PermissionsService } from './permisos.service';
import { Vista, PermisoRol } from './permisos.models';

// #endregion

// #region Tests
describe('PermissionsService', () => {
	let service: PermissionsService;
	let httpMock: HttpTestingController;

	beforeEach(() => {
		TestBed.configureTestingModule({
			providers: [
				PermissionsService,
				provideHttpClient(),
				provideHttpClientTesting(),
			],
		});
		service = TestBed.inject(PermissionsService);
		httpMock = TestBed.inject(HttpTestingController);
	});

	// #region Vistas
	describe('vistas', () => {
		it('should get vistas list', () => {
			const mockVistas: Vista[] = [
				{ id: 1, ruta: 'intranet/admin', nombre: 'Admin', estado: 1 },
			];

			service.getVistas().subscribe((vistas) => {
				expect(vistas).toEqual(mockVistas);
			});

			const req = httpMock.expectOne((r) => r.url.includes('/vistas/listar'));
			expect(req.request.method).toBe('GET');
			req.flush(mockVistas);
		});

		it('should return empty array on getVistas error', () => {
			service.getVistas().subscribe((vistas) => {
				expect(vistas).toEqual([]);
			});

			const req = httpMock.expectOne((r) => r.url.includes('/vistas/listar'));
			req.error(new ProgressEvent('error'));
		});

		it('should get paginated vistas with params', () => {
			service.getVistasPaginated(2, 20, 'admin', 'admin', 1).subscribe();

			const req = httpMock.expectOne((r) => r.url.includes('/vistas/listar'));
			expect(req.request.params.get('page')).toBe('2');
			expect(req.request.params.get('pageSize')).toBe('20');
			expect(req.request.params.get('search')).toBe('admin');
			expect(req.request.params.get('modulo')).toBe('admin');
			expect(req.request.params.get('estado')).toBe('1');
			req.flush({ data: [], page: 2, pageSize: 20, total: 0 });
		});

		it('should get vistas estadisticas', () => {
			service.getVistasEstadisticas().subscribe((stats) => {
				expect(stats.totalVistas).toBe(10);
			});

			const req = httpMock.expectOne((r) => r.url.includes('/estadisticas'));
			req.flush({ totalVistas: 10, vistasActivas: 8, vistasInactivas: 2, totalModulos: 3, modulos: [] });
		});

		it('should create vista', () => {
			service.crearVista({ ruta: 'test', nombre: 'Test' }).subscribe((res) => {
				expect(res.mensaje).toBe('ok');
			});

			const req = httpMock.expectOne((r) => r.url.includes('/vistas/crear'));
			expect(req.request.method).toBe('POST');
			expect(req.request.body).toEqual({ ruta: 'test', nombre: 'Test' });
			req.flush({ mensaje: 'ok' });
		});

		it('should update vista', () => {
			service.actualizarVista(1, { ruta: 'test', nombre: 'Updated', estado: 1 }).subscribe();

			const req = httpMock.expectOne((r) => r.url.includes('/vistas/1/actualizar'));
			expect(req.request.method).toBe('PUT');
			req.flush({ mensaje: 'ok' });
		});

		it('should delete vista', () => {
			service.eliminarVista(1).subscribe();

			const req = httpMock.expectOne((r) => r.url.includes('/vistas/1/eliminar'));
			expect(req.request.method).toBe('DELETE');
			req.flush({ mensaje: 'ok' });
		});
	});
	// #endregion

	// #region Permisos por rol
	describe('permisos por rol', () => {
		it('should get permisos rol list', () => {
			const mockPermisos: PermisoRol[] = [
				{ id: 1, rol: 'Director', vistas: ['intranet/admin'] },
			];

			service.getPermisosRol().subscribe((permisos) => {
				expect(permisos).toEqual(mockPermisos);
			});

			const req = httpMock.expectOne((r) => r.url.includes('/rol/listar'));
			req.flush(mockPermisos);
		});

		it('should return empty on error', () => {
			service.getPermisosRol().subscribe((permisos) => {
				expect(permisos).toEqual([]);
			});

			httpMock.expectOne((r) => r.url.includes('/rol/listar')).error(new ProgressEvent('error'));
		});

		it('should create permiso rol', () => {
			service.crearPermisoRol({ rol: 'Profesor', vistas: ['a'] }).subscribe();

			const req = httpMock.expectOne((r) => r.url.includes('/rol/crear'));
			expect(req.request.method).toBe('POST');
			req.flush({ mensaje: 'ok' });
		});

		it('should delete permiso rol', () => {
			service.eliminarPermisoRol(1).subscribe();

			const req = httpMock.expectOne((r) => r.url.includes('/rol/1/eliminar'));
			expect(req.request.method).toBe('DELETE');
			req.flush({ mensaje: 'ok' });
		});
	});
	// #endregion

	// #region Permisos por usuario
	describe('permisos por usuario', () => {
		it('should get permisos usuario list', () => {
			service.getPermisosUsuario().subscribe((permisos) => {
				expect(permisos).toHaveLength(0);
			});

			httpMock.expectOne((r) => r.url.includes('/usuario/listar')).flush([]);
		});

		it('should get mis permisos', () => {
			service.getMisPermisos().subscribe((result) => {
				expect(result?.rol).toBe('Director');
			});

			const req = httpMock.expectOne((r) => r.url.includes('/mis-permisos'));
			req.flush({ usuarioId: 1, rol: 'Director', vistasPermitidas: [], tienePermisosPersonalizados: false });
		});

		it('should return null on getMisPermisos error', () => {
			service.getMisPermisos().subscribe((result) => {
				expect(result).toBeNull();
			});

			httpMock.expectOne((r) => r.url.includes('/mis-permisos')).error(new ProgressEvent('error'));
		});
	});
	// #endregion

	// #region User search
	describe('buscarUsuarios', () => {
		it('should search with params', () => {
			service.buscarUsuarios('juan', 'Profesor').subscribe();

			const req = httpMock.expectOne((r) => r.url.includes('/buscar-usuarios'));
			expect(req.request.params.get('termino')).toBe('juan');
			expect(req.request.params.get('rol')).toBe('Profesor');
			req.flush({ usuarios: [], total: 0 });
		});

		it('should return empty on error', () => {
			service.buscarUsuarios('test').subscribe((result) => {
				expect(result.usuarios).toEqual([]);
				expect(result.total).toBe(0);
			});

			httpMock.expectOne((r) => r.url.includes('/buscar-usuarios')).error(new ProgressEvent('error'));
		});
	});
	// #endregion
});
// #endregion
