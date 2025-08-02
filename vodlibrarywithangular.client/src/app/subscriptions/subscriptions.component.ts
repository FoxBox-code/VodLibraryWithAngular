import { Component } from '@angular/core';
import { VideoService } from '../video.service';
import { VideoWindow } from '../models/video-window';

@Component({
  selector: 'app-subscriptions',
  standalone: false,

  templateUrl: './subscriptions.component.html',
  styleUrl: './subscriptions.component.scss'
})
export class SubscriptionsComponent
{
  videosFromSubscribers : VideoWindow[] = [];
  isUserLogedIn : boolean = true;


  constructor(private videoService : VideoService)
  {

  }

  ngOnInit()
  {
    this.videoService.getUserVideosFromSubscribers()
    .subscribe(
      {
        next : (videos) =>
        {
          this.videosFromSubscribers = videos;
        },

        error : (err) =>
        {
          console.log(err);
          if(err.status === 401)
            this.isUserLogedIn = false;
        }
      }
    )



  }
}
