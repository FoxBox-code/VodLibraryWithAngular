import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { UploadComponent } from './upload/upload.component';
import { RegisterComponent } from './register/register.component';
import { LoginComponent } from './login/login.component';
import { authGuard } from './auth.guard';
import { AppComponent } from './app.component';
import { PlayVideoComponent } from './play-video/play-video.component';
import { LikedVideosComponent } from './liked-videos/liked-videos.component';
import { WatchHistoryComponent } from './watch-history/watch-history.component';
import { UserProfileComponent } from './user-profile/user-profile.component';
import { SearchPageComponent } from './search-page/search-page.component';
import { EditPageComponent } from './edit-page/edit-page.component';
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
  },
  {
    path : 'liked-videos',
    component : LikedVideosComponent,
    canActivate : [authGuard]
  },
  {
    path : 'watch-history',
    component : WatchHistoryComponent,
    canActivate : [authGuard]
  },
  {
    path : 'user-profile/:userId',
    component : UserProfileComponent,

  },
  {
    path : 'search-page',
    component : SearchPageComponent
  },
  {
    path : 'edit-page/:videoId',
    component : EditPageComponent,
    canActivate : [authGuard]
  }


];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
