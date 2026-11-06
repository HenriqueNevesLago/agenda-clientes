import { Routes } from '@angular/router';
import { SchedulingPageComponent } from './features/scheduling/scheduling-page.component';

export const routes: Routes = [
	{
		path: '',
		component: SchedulingPageComponent
	},
	{
		path: 'historico',
		loadComponent: () =>
			import('./features/scheduling/appointment-history-page.component').then(
				(module) => module.AppointmentHistoryPageComponent
			)
	}
];
