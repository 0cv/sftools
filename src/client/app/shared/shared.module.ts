import { NgModule } from '@angular/core'
import { CommonModule } from '@angular/common'
import { FormsModule, ReactiveFormsModule } from '@angular/forms'
import { HttpModule } from '@angular/http'
import { FancytreeComponent } from './fancytree'
import { LoadingSpinnerComponent } from './loading-spinner'
import {
  MatButtonModule,
  MatCardModule,
  MatCheckboxModule,
  MatDialogModule,
  MatIconModule,
  MatInputModule,
  MatProgressBarModule,
  MatRadioModule,
  MatSelectModule,
  MatSnackBarModule,
  MatTabsModule,
  MatToolbarModule
} from '@angular/material'
import { SubstrPipe } from './substring.pipe'
import { BrowserAnimationsModule } from '@angular/platform-browser/animations'
import { UncamelCase } from './uncamel.pipe'

const MATERIAL_MODULES = [
  MatButtonModule,
  MatCardModule,
  MatCheckboxModule,
  MatDialogModule,
  MatIconModule,
  MatInputModule,
  MatProgressBarModule,
  MatRadioModule,
  MatSelectModule,
  MatSnackBarModule,
  MatTabsModule,
  MatToolbarModule
]

@NgModule({
  imports: [
    CommonModule,
    BrowserAnimationsModule,
    ...MATERIAL_MODULES
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
    ...MATERIAL_MODULES,
    HttpModule,
    FormsModule,
    ReactiveFormsModule,
    FancytreeComponent,
    LoadingSpinnerComponent,
    SubstrPipe,
    UncamelCase
  ]
})
export class SharedModule { }
