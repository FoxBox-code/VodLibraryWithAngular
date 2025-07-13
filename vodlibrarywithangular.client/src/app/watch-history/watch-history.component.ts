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
    public userPastWatchHistory : WatchHistoryVideoInfo[][] = [];
    public today : Date = new Date();
    constructor(private authService : AuthService)
    {

    }


    ngOnInit()
    {

      this.authService.getUserPastTodaysWatchHistory()
      .subscribe(
        {
          next : (data) =>
          {
            this.userPastWatchHistory = data;
          }
        }
      )

      if(0 === 0)
      {
        this.authService.getUserTodaysWatchHistory()
          .subscribe({
                next: (data) => {
            const converted : WatchHistoryVideoInfo[] = data.map(item => ({
          videoId : item.videoId,
          watchedOn : new Date(item.watchedOn),
          video : item.video,
          primaryKeyId : item.primaryKeyId
        }));
        this.authService.userTodayWatchHistorySubject.next(converted);
        this.userTodayWatchHistory$ = this.authService.userTodayWatchHistory$
      }
    });


      }

}

    deleteUserWatchHistory()
    {
        this.authService.deleteUserWatchHistory()
        .subscribe(
          {
            next : (response) =>
            {
              console.log(response.message);
              this.authService.userTodayWatchHistorySubject.next([]);
              this.userPastWatchHistory = [];
            }
          }
        )
    }

    deleteIndividuaVideoRecordFromHistoryTODAY(primaryKeyId : number)
    {
        this.authService.deleteUserIndivudalVideoRecord(primaryKeyId)
        .subscribe(
          {
            next : (response) =>
            {
              console.log(response.message);

              const currentEmittedValue = this.authService.userTodayWatchHistorySubject.value;

              const updatedEmitter = currentEmittedValue.filter(x => x.primaryKeyId != primaryKeyId);
              this.authService.userTodayWatchHistorySubject.next(updatedEmitter);

            },
            error : (err) =>
            {
              console.error(err.error);
            }
          }
        )
    }

    deleteIndividuaVideoRecordFromHistoryPAST(primaryKeyId : number, dayIndex : number , videoIndex : number)//fuck typescript and its stupid overload apporach
    {
        this.authService.deleteUserIndivudalVideoRecord(primaryKeyId)
        .subscribe(
          {
            next : (response) =>
            {
              console.log(response.message);

              let videoFromThatDay = this.userPastWatchHistory[dayIndex];

              videoFromThatDay.splice(videoIndex, 1);



              if(this.userPastWatchHistory[dayIndex].length === 0)
              {
                this.userPastWatchHistory.splice(dayIndex, 1);
              }

              this.userPastWatchHistory = [...this.userPastWatchHistory];//make sure angular sees updates to this simple array



            }
          }
        )
    }
}







