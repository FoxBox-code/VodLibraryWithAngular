import { Component } from '@angular/core';
import { VideoService } from '../services/video.service';
import { VideoWindow } from '../models/video-window';
import { Observable } from 'rxjs';
import { ActivatedRoute, Router, } from '@angular/router';

@Component({
  selector: 'app-search-page',
  standalone: false,

  templateUrl: './search-page.component.html',
  styleUrl: './search-page.component.scss'
})
export class SearchPageComponent
{
    videos : Observable<VideoWindow[]> | undefined;
    currentQueryValue : string | null | undefined= "";//JESUS

    constructor(private activeRouter : ActivatedRoute, private videoService : VideoService, private router : Router)
    {

    }

    ngOnInit()
    {
        this.activeRouter.queryParams.subscribe(
          {
            next :(param)=>
            {
              const query = param['query'];
              this.videos = this.videoService.getVideoSearched(query);
            }
          }
        )



    }


}
