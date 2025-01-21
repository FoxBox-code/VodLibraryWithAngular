import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AppComponent } from './app.component';
import { UploadComponent } from './upload/upload.component';

const routes: Routes = [
  // {
  //   path : '',
  //   component : AppComponent,
  //   title : "HomeScreen"
  // },
  {
    path : 'upload',
    component : UploadComponent,
    title : "Upload Video"
  }];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
