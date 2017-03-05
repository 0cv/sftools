import { Pipe, PipeTransform } from '@angular/core'

@Pipe({name: 'substr'})
export class SubstrPipe implements PipeTransform {
  transform(text: string, value: number): string {
    if(text && text.length) {
      if(Array.isArray(text)) {
        text = text.toString()
      }
      text = text.substring(0, value)
      text += text.length === value?'...':''
      return text
    } else {
      return null
    }
  }
}
