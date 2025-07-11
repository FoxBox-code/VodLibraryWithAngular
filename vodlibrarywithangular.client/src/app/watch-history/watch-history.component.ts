import { Component } from '@angular/core';
import { AuthService } from '../auth.service';
import { WatchHistoryVideoInfo } from '../models/watch-history-video-info';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-watch-history',
  standalone: false,

  templateUrl: './watch-history.component.html',
  styleUrl: './watch-history.component.css'
})
export class WatchHistoryComponent
{
    public userTodayWatchHistory$! : Observable<WatchHistoryVideoInfo[]>;
    constructor(private authService : AuthService)
    {

    }


    ngOnInit()
    {
      this.userTodayWatchHistory$ = this.authService.userTodayWatchHistory$;
    }
}
