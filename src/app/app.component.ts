import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { map, Observable } from 'rxjs';
import { RouteStateService } from './services/route-state/route-state.service';
import { LoadingOverlayComponent } from './shared/components/loading-overlay/loading-overlay.component';
import { SidebarComponent } from './shared/components/sidebar/sidebar.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    SidebarComponent,
    LoadingOverlayComponent,
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent {
  hideContainer$: Observable<boolean>;

  constructor(private routeState: RouteStateService) {
    this.hideContainer$ = this.routeState.hideContainer$.pipe(map(h => h));
  }
}
