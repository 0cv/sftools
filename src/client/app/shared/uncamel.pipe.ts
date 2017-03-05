import { Pipe, PipeTransform } from '@angular/core'

@Pipe({name: 'UncamelCase'})
export class UncamelCase implements PipeTransform {
  transform(val: string) {
    if (!val) return '';
    return val.replace(/([a-z])([A-Z])/g, '$1 $2');
  }
}
