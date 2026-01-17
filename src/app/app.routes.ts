import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./features/home/home').then(m => m.HomeComponent),
    title: 'Educa.com.pe - Inicio'
  },
  {
    path: 'nosotros',
    loadComponent: () => import('./features/home/home').then(m => m.HomeComponent),
    title: 'Educa.com.pe - Nosotros'
  },
  {
    path: 'contacto',
    loadComponent: () => import('./features/home/home').then(m => m.HomeComponent),
    title: 'Educa.com.pe - Contacto'
  },
  {
    path: 'preguntas-frecuentes',
    loadComponent: () => import('./features/home/home').then(m => m.HomeComponent),
    title: 'Educa.com.pe - Preguntas Frecuentes'
  },
  {
    path: 'niveles/inicial',
    loadComponent: () => import('./features/home/home').then(m => m.HomeComponent),
    title: 'Educa.com.pe - Nivel Inicial'
  },
  {
    path: 'niveles/primaria',
    loadComponent: () => import('./features/home/home').then(m => m.HomeComponent),
    title: 'Educa.com.pe - Nivel Primaria'
  },
  {
    path: 'niveles/secundaria',
    loadComponent: () => import('./features/home/home').then(m => m.HomeComponent),
    title: 'Educa.com.pe - Nivel Secundaria'
  },
  {
    path: '**',
    redirectTo: '',
    pathMatch: 'full'
  }
];
