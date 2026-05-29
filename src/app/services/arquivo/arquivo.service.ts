import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class ArquivoService {
  constructor(private http: HttpClient) {}

  downloadEtiqueta(numeroConferencia: number) {
    return this.http.get(`/arquivos/etiqueta/download`, {
      params: { numeroConferencia },
      responseType: 'blob',
    });
  }

  getProdutoImagem(idProduto: number): Observable<{ imagem: string }> {
    return this.http.get<{ imagem: string }>(`/produto/${idProduto}/imagem`);
  }
}
