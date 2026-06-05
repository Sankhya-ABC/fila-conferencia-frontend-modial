import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'duracao', standalone: true })
export class DuracaoPipe implements PipeTransform {
  transform(segundos: number): string {
    if (!segundos) return '—';
    const h = Math.floor(segundos / 3600);
    const m = Math.floor((segundos % 3600) / 60);
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  }
}
