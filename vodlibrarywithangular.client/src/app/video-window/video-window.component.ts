import { Component, Input } from '@angular/core';
import { VideoWindow } from '../models/video-window';
import { concatWith, Observable } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { Router } from '@angular/router';
import { VideoService } from '../services/video.service';


@Component({
  selector: 'app-video-window',
  standalone: false,

  templateUrl: './video-window.component.html',
  styleUrl: './video-window.component.scss'
})
export class VideoWindowComponent
{
  @Input() video : VideoWindow | undefined = undefined;
  videoTimeSpanToString! : string;
  userId$ : Observable<string | null>;
  videoWindowScrollPosition : string = 'videoWindowScrollPosition';
  @Input() wasClickedFromAPlayList? : boolean = false;

  constructor(private auth : AuthService , private router : Router, private videoService : VideoService)
  {
      this.userId$ = auth.getUserIdAsObservable();

      console.log(this.wasClickedFromAPlayList);


  }

  ngOnInit()
  {
    if(this.video)
    {
      this.videoTimeSpanToString = this.convertVideoTimeSpanToString(this.video);

      console.log(`SHOW ME THE IMAGE URL ${this.video?.imagePath}`);
    }
  }




  private convertVideoTimeSpanToString(video : VideoWindow) : string
  {
    const h = video?.hours === 0 ? '' : this.video?.hours + ':';

    let m : string;
    if(video.minutes === 0)
      m = '';
    else
        m = video?.minutes < 10 && h === '' ? '0' + video.minutes + ':' : video.minutes + ':' ;



    let s : string;
    if(m === '')
    {
      s = video.seconds + 'sec';
    }
    else
      s = video.seconds < 10 ? '0' + video.seconds : video.seconds.toString();


    return `${h}${m}${s}`;
  }

  navigateToEdit(video : VideoWindow)
  {
      this.videoService.saveVideoSelectedInMemory(video);

      this.router.navigate(['/edit-page/', video.id])
  }


}

