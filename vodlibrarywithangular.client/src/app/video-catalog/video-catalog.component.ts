import { Component, Input } from '@angular/core';
import { VideoWindow } from '../models/video-window';

@Component({
  selector: 'app-video-catalog',
  standalone: false,

  templateUrl: './video-catalog.component.html',
  styleUrl: './video-catalog.component.scss'
})
export class VideoCatalogComponent
{

  @Input()  videosCatalog : VideoWindow[] = [];


  public convertVideoTimeSpanToString(video : VideoWindow) : string
  {
    const h = video?.hours === 0 ? '' : video?.hours + ':';

    let m : string;
    if(video.minutes === 0)
      m = '';
    else
        m = video?.minutes < 10 && h !== '' ? '0' + video.minutes + ':' : video.minutes + ':' ;



    let s : string;
    if(m === '')
    {
      s = video.seconds + 'sec';
    }
    else
      s = video.seconds < 10 ? '0' + video.seconds : video.seconds.toString();


    return `${h}${m}${s}`;
  }

}
