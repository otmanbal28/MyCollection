// =============================================================
//  Routes — 3 routes + redirection. Lazy-loadées avec
//  loadComponent (composants standalone).
// =============================================================
import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  {
    path: 'dashboard',
    loadComponent: () =>
      import('./components/dashboard.component').then((m) => m.DashboardComponent),
  },
  {
    path: 'items',
    loadComponent: () =>
      import('./components/items-page.component').then((m) => m.ItemsPageComponent),
  },
  { path: '**', redirectTo: 'dashboard' },
];
