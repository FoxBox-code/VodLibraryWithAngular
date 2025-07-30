import { Component} from '@angular/core';
import { AuthService } from '../auth.service';
import { Observable } from 'rxjs';
import { VideoService } from '../video.service';
import { VideoWindow } from '../models/video-window';

@Component({
  selector: 'app-you-page',
  standalone: false,

  templateUrl: './you-page.component.html',
  styleUrl: './you-page.component.css'
})
export class YouPageComponent
{
    userId$ : Observable<string | null>;
    userId : string|null = null;
    watchHistoryVideoInfo : VideoWindow[] = [];
    likedVideosCollection : VideoWindow[] = [];







    constructor(private authService : AuthService, private videoService : VideoService)
    {
      this.userId$ = this.authService.getUserIdAsObservable();

       this.videoService.getUserHistoryForYouPage()
      .subscribe(
        {
          next : (history) =>
          {
            this.watchHistoryVideoInfo = history;
          },
          error : (err) => console.log(err)
        }
      )

      this.videoService.getUsersLikedVideosHistory(10)
      .subscribe(
        {
          next : (likedHistroy) =>
          {
            this.likedVideosCollection = likedHistroy;
          }
        }
      )


    }

    ngOnInit()
    {
      this.userId$.subscribe(data => this.userId == data)


      console.log(this.watchHistoryVideoInfo)

    }







}
