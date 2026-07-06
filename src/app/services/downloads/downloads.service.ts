import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { DownloadItem } from './downloads.model';

@Injectable({ providedIn: 'root' })
export class DownloadsService {
  constructor(private http: HttpClient) {}

  listar(): Observable<DownloadItem[]> {
    return this.http.get<DownloadItem[]>('/downloads');
  }
}
