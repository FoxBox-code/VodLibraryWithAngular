import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { UploadComponent } from './upload/upload.component';
import { RegisterComponent } from './register/register.component';
import { LoginComponent } from './login/login.component';
import { authGuard } from './auth.guard';
import { AppComponent } from './app.component';
import { PlayVideoComponent } from './play-video/play-video.component';
const routes: Routes = [
  // {
  //   path : '',
  //   component : AppComponent,
  //   title : "HomeScreen"
  // }, //this will make the nav reprint it self
  {
    path : 'upload',
    component : UploadComponent,
    title : "Upload Video",
    canActivate : [authGuard]
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
  {
    path : 'playing/:id',
    component : PlayVideoComponent,
    title : 'Playing video'
  }

];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
