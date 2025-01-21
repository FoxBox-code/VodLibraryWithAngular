import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { UploadComponent } from './upload/upload.component';
import { RegisterComponent } from './register/register.component';
import { LoginComponent } from './login/login.component';

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
  },
  {
    path : 'register',
    component : RegisterComponent,
    title : "Registration"
  },
  {
    path : 'login',
    component : LoginComponent,
    title : "Login"
  },

];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
