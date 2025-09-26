import { Component } from '@angular/core';
import { VideoService } from '../services/video.service';
import { AuthService } from '../services/auth.service';
import { VideoWindow } from '../models/video-window';
import { PlaylistService } from '../services/playlist.service';
import { ChangeDetectionStrategy } from '@angular/core';
import { ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';


@Component({
  selector: 'app-liked-videos',
  standalone: false,
  changeDetection : ChangeDetectionStrategy.OnPush,//THIS FEATURE IS NOT WORKING

  templateUrl: './liked-videos.component.html',
  styleUrl: './liked-videos.component.scss'
})
export class LikedVideosComponent
{
    listOfLikedVideos : VideoWindow[] = [];
    firstVideoOnList : VideoWindow  | null=  null;
    userName : string | null;




    constructor(private videoService : VideoService , private authService: AuthService, private playListService : PlaylistService, private cd: ChangeDetectorRef, private router : Router)
    {
        this.userName = authService.getUserNameFromToken();

        this.playListService.getUserLikedVideos()
        .subscribe(
          {
            next : (data) =>
            {

              this.listOfLikedVideos = [...data];
              this.firstVideoOnList = this.listOfLikedVideos[0];
              this.playListService.playList = this.listOfLikedVideos;
              sessionStorage.setItem('likePlayList', JSON.stringify(data));
               this.cd.markForCheck();
            }
          }
        );
    }

    ngOnInit()
    {
        this.playListService.getUserLikedVideos().subscribe(data => this.listOfLikedVideos)
    }

    handleRemovedElement(emittedValue : VideoWindow[])
    {
      this.listOfLikedVideos = emittedValue;
      this.playListService.playList = this.listOfLikedVideos;
      sessionStorage.setItem('likePlayList', JSON.stringify(emittedValue))
    }

    public something(eventTarget : EventTarget | null)
    {
      const element = eventTarget as HTMLSelectElement
      const selectedGenre = element.value;

      this.router.navigate(['genre-video', selectedGenre]);
    }




}
