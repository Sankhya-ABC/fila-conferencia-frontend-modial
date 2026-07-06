import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Component, Inject, OnInit, PLATFORM_ID } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { DownloadItem } from '../../services/downloads/downloads.model';
import { DownloadsService } from '../../services/downloads/downloads.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-downloads',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule],
  templateUrl: './downloads.component.html',
  styleUrl: './downloads.component.scss',
})
export class DownloadsComponent implements OnInit {
  constructor(
    private downloadsService: DownloadsService,
    @Inject(PLATFORM_ID) private platformId: object,
  ) {}

  downloads: DownloadItem[] = [];
  carregando = false;

  ngOnInit() {
    this.carregar();
  }

  carregar() {
    this.carregando = true;
    this.downloadsService.listar().subscribe({
      next: (lista) => { this.downloads = lista; this.carregando = false; },
      error: ()      => { this.carregando = false; },
    });
  }

  baixar(item: DownloadItem) {
    if (!isPlatformBrowser(this.platformId)) return;
    window.open(`${environment.API_GATEWAY}/api/downloads/${item.id}`, '_blank');
  }
}
