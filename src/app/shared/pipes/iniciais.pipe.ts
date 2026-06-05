import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'iniciais', standalone: true })
export class IniciaisPipe implements PipeTransform {
  transform(nome: string): string {
    return (nome || '').split(' ')
      .slice(0, 2).map(w => w[0]).join('').toUpperCase();
  }
}
