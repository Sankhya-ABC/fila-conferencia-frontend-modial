import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LoadingService } from '../../../services/loading/loading.service';
import { RoboLoaderComponent } from '../robo-loader/robo-loader.component';

@Component({
  selector: 'app-loading-overlay',
  standalone: true,
  imports: [CommonModule, RoboLoaderComponent],
  templateUrl: './loading-overlay.component.html',
  styleUrl: './loading-overlay.component.scss',
})
export class LoadingOverlayComponent {
  loading$ = this.loading.loading$;

  constructor(private loading: LoadingService) {}
}
