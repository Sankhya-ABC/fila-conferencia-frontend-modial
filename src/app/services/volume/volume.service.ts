import { HttpClient, HttpContext } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { SKIP_LOADING } from '../../core/interceptors/skip-loading.token';
import {
  DeletarVolumesLoteParams,
  GerarVolumesLoteParams,
  PostAtualizarDimensoesVolumeDetalhadoParams,
  PostAtualizarDimensoesVolumeNaoDetalhadoLoteParams,
  PostAtualizarDimensoesVolumeParams,
  PostSalvarGrupoSimplificadoParams,
  VolumeDTO,
} from './volume.model';

@Injectable({
  providedIn: 'root',
})
export class VolumeService {
  constructor(private http: HttpClient) {}

  getVolumes(numeroConferencia: number): Observable<VolumeDTO[]> {
    return this.http.get<VolumeDTO[]>('/volumes', {
      params: { numeroConferencia },
    });
  }

  gerarVolumesLote(body: GerarVolumesLoteParams): Observable<null> {
    return this.http.post<null>('/volumes/gerar-volumes-lote', body);
  }

  deletarVolumesLote(body: DeletarVolumesLoteParams): Observable<null> {
    return this.http.post<null>('/volumes/deletar-volumes-lote', body);
  }

  postAtualizarDimensoesVolume(
    body: PostAtualizarDimensoesVolumeParams,
  ): Observable<null> {
    return this.http.post<null>('/volumes/dimensoes-volume', body, {
      context: new HttpContext().set(SKIP_LOADING, true),
    });
  }

  postSalvarGrupoSimplificado(body: PostSalvarGrupoSimplificadoParams): Observable<null> {
    return this.http.post<null>('/volumes/grupo-simplificado', body);
  }
}
