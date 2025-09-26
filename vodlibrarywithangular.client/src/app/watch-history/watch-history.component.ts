import { Component } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { WatchHistoryVideoInfo } from '../models/watch-history-video-info';
import { concat, concatMap, filter, map, Observable, Subject, switchMap, takeUntil } from 'rxjs';
import { DataCosntans } from '../dataconstants';
import { NavigationService } from '../services/navigation.service';
import { Router } from '@angular/router';
import { HistoryService } from '../services/history.service';

@Component({
  selector: 'app-watch-history',
  standalone: false,

  templateUrl: './watch-history.component.html',
  styleUrl: './watch-history.component.scss'
})
export class WatchHistoryComponent
{
    public userTodayWatchHistory$! : Observable<WatchHistoryVideoInfo[]>;
    public userTodayWatchHistory : WatchHistoryVideoInfo[] = [];
    public userPastWatchHistory : WatchHistoryVideoInfo[][] = [];
    public today : Date = new Date();
    public userId$ : Observable<string | null>;
    public currentUserId : string | null = null;
    public historyIconUrl = DataCosntans.historyIcon;


    private destroy$ = new Subject<void>();

    constructor(private authService : AuthService, private navigationService : NavigationService, private router : Router, private historyService : HistoryService)
    {
        const datete = new Date();

        const something = datete.getDate();

        console.log(something)

        this.userId$ = authService.getUserIdAsObservable();
    }


    ngOnInit()
    {

      // this.authService.getUserPastTodaysWatchHistory()
      // .subscribe(
      //   {
      //     next : (data) =>
      //     {
      //       this.userPastWatchHistory = data;
      //     }
      //   }
      // )

      // if(0 === 0)//????????????????????????????????????????????????????????????????????????
      // {
      //   this.authService.getUserTodaysWatchHistory()
      //     .subscribe({
      //           next: (data) => {
      //       const converted : WatchHistoryVideoInfo[] = data.map(item => ({
      //     videoId : item.videoId,
      //     watchedOn : new Date(item.watchedOn),
      //     video : item.video,
      //     primaryKeyId : item.primaryKeyId
      //   }));
      //   this.authService.userTodayWatchHistorySubject.next(converted);
      //   this.userTodayWatchHistory$ = this.authService.userTodayWatchHistory$
      //       }
      //     });

      // }


      this.userId$.pipe(
        filter((userId)=> userId !== null),

        switchMap((userId) =>
          this.historyService.getUserWatchHistoryForToday()
        .pipe(
          concatMap((todayHistory)=>
            this.historyService.getUserWatchHistoryPastToday()
          .pipe(
            map(pastHistory => ({userId , todayHistory, pastHistory}))
          )
           )
        )

        ),
        takeUntil(this.destroy$)


      )
      .subscribe({
          next: ({ userId, todayHistory, pastHistory }) => {
            this.currentUserId = userId;
            this.userTodayWatchHistory = todayHistory;
            this.userPastWatchHistory = pastHistory;
          },
          error: (err) => {
            console.error('stream error', err);
          },

        });







}

  ngOnDestroy()
  {
    this.destroy$.next();
    this.destroy$.complete();
  }

    deleteUserWatchHistory()
    {
        this.historyService.deleteUserWatchHistoryAll()
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

    public GetDayFromWatchedHistory(today : Date)
    {
        const newDate = new Date(today); //today is not actually a real TS/JS object what we give from the data base is something called ISO 8601 date string a format Date object can natively convert to real date

        const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

        const videoDay = days[newDate.getDay()];
        console.log(`Print me the current day of the vidoes watched history ---${videoDay}`)



        // console.log(wasAt.getDay());
        return videoDay;
    }

    deleteIndividuaVideoRecordFromHistoryTODAY(primaryKeyId : number)
    {
        this.historyService.deleteIndividualVideoRecord(primaryKeyId)
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
        this.historyService.deleteIndividualVideoRecord(primaryKeyId)
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

      navigateToLogIn()
      {



          const route =
          {
            path : ['watch-history'],

          }


          this.navigationService.updateAdress(route);


          this.router.navigate(['login']);
      }
}







