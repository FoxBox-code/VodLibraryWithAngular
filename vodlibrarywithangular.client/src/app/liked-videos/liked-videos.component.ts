import { Component } from '@angular/core';
import { VideoService } from '../video.service';
import { AuthService } from '../auth.service';
import { VideoWindow } from '../models/video-window';

@Component({
  selector: 'app-liked-videos',
  standalone: false,

  templateUrl: './liked-videos.component.html',
  styleUrl: './liked-videos.component.css'
})
export class LikedVideosComponent
{
    listOfLikedVideos : VideoWindow[] = [];
    dictionaryOfLikedVideos : {[videoId : number] : VideoWindow} = {};
    constructor(private videoService : VideoService , private authService: AuthService)
    {

    }

    ngOnInit()
    {
        this.videoService.getUsersLikedVideosHistory()
        .subscribe(
          {
            next : (data) =>
            {

              this.listOfLikedVideos = data;
            }
          }
        );
    }

    deleteLikedVideoFromHistroy(videoId : number)
    {
        this.videoService.deleteLikedVideoFromHistory(videoId)
        .subscribe(
          {
            next : (data) =>
            {
              console.log(data.message);
              this.listOfLikedVideos = this.listOfLikedVideos.filter(x => x.id !== videoId);

            },
            error : (err) =>
            {
              console.error(err.message);
            }
          }
        );
    }


}
