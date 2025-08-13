import { Component, ElementRef, Input, ViewChild} from '@angular/core';
import { VideoWindow } from '../../models/video-window';

@Component({
  selector: 'app-you-page-side-scroll-window',
  standalone: false,

  templateUrl: './you-page-side-scroll-window.component.html',
  styleUrl: './you-page-side-scroll-window.component.css'
})
export class YouPageSideScrollWindowComponent
{
    @Input() video : VideoWindow[] | undefined = undefined;

    index : number = 0;
    maxIndex : number = 10;
    elementGap = 12;
    cardWidth = 480;
    firstClick : boolean = true;

    @ViewChild('sideScrollContainer') sideScrollContainer! : ElementRef<HTMLElement>
    @ViewChild('videosWrapper') videosWrapper! : ElementRef<HTMLElement>

    constructor()
    {

    }


    moveRight()
    {
      if(this.firstClick)
      {
        this.calculateMaxIndex();
        this.firstClick = false;
      }

      if(this.maxIndex > this.index)
      {
                this.index++;

            const transformOff = this.index * 1440 + 12;
            const width = this.videosWrapper.nativeElement.clientWidth;

            if(transformOff < width)
            {
                const element = this.videosWrapper.nativeElement;

                element.style.transform = `translateX(-${transformOff}px)`;
            }


      }

    }


    moveLeft()
    {

      if(this.index != 0)
      {
        this.index--;

        const transformOff = this.index * 1440 + 12;
        const element = this.videosWrapper.nativeElement;

        element.style.transform = `translateX(-${0}px)`;
      }

    }

     convertVideoTimeSpanToString(video : VideoWindow) : string
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

    calculateMaxIndex()
    {
      const fullWidth  = this.sideScrollContainer.nativeElement.scrollWidth;
      const perClick = 480 * 3;
      this.maxIndex = Math.floor( fullWidth / perClick );

    }
}
