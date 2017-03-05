import { NgModule } from '@angular/core'
import { CommonModule } from '@angular/common'
import { FormsModule, ReactiveFormsModule } from '@angular/forms'
import { HttpModule } from '@angular/http'
import { FancytreeComponent } from './fancytree'
import { LoadingSpinnerComponent } from './loading-spinner'
import { MaterialModule } from '@angular/material'
import { SubstrPipe } from './substring.pipe'
import { BrowserAnimationsModule } from '@angular/platform-browser/animations'
import { UncamelCase } from './uncamel.pipe'

@NgModule({
  imports: [
    CommonModule,
    BrowserAnimationsModule,
    MaterialModule
  ],
  declarations: [
    FancytreeComponent,
    LoadingSpinnerComponent,
    SubstrPipe,
    UncamelCase
  ],
  providers: [],
  exports: [
    BrowserAnimationsModule,
    CommonModule,
    MaterialModule,
    HttpModule,
    FormsModule,
    ReactiveFormsModule,
    FancytreeComponent,
    LoadingSpinnerComponent,
    SubstrPipe,
    UncamelCase
  ]
})
export class SharedModule {}
