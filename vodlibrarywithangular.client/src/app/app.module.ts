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

@NgModule({
  declarations: [
    AppComponent,
    UploadComponent,
    RegisterComponent,
    LoginComponent,
    VideosSectionComponent,
    PlayVideoComponent,
    LikedVideosComponent
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
