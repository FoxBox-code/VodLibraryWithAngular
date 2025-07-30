import { HttpClientModule } from '@angular/common/http';
import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { CommonModule } from '@angular/common';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { UploadComponent } from './upload/upload.component';
import { RegisterComponent } from './register/register.component';
import { LoginComponent } from './login/login.component';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { VideosSectionComponent } from './videos-section/videos-section.component';
import { PlayVideoComponent } from './play-video/play-video.component';
import { LikedVideosComponent } from './liked-videos/liked-videos.component';
import { WatchHistoryComponent } from './watch-history/watch-history.component';
import { UserProfileComponent } from './user-profile/user-profile.component';
import { VideoWindowComponent } from './video-window/video-window.component';
import { SearchPageComponent } from './search-page/search-page.component';
import { EditPageComponent } from './edit-page/edit-page.component';
import { YouPageComponent } from './you-page/you-page.component';
import { YouPageSideScrollWindowComponent } from './you-page/you-page-side-scroll-window/you-page-side-scroll-window.component';

@NgModule({
  declarations: [
    AppComponent,
    UploadComponent,
    RegisterComponent,
    LoginComponent,
    VideosSectionComponent,
    PlayVideoComponent,
    LikedVideosComponent,
    WatchHistoryComponent,
    UserProfileComponent,
    VideoWindowComponent,
    SearchPageComponent,
    EditPageComponent,
    YouPageComponent,
    YouPageSideScrollWindowComponent
  ],
  imports: [
    BrowserModule, HttpClientModule,
    AppRoutingModule,
    ReactiveFormsModule,
    CommonModule,
    FormsModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
