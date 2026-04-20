import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./components/routes/routes.component').then(
        (m) => m.RoutesComponent
      ),
  },
  {
    path: 'routes',
    loadComponent: () =>
      import('./components/routes/routes.component').then(
        (m) => m.RoutesComponent
      ),
  },
];
