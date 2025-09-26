import { Component} from '@angular/core';
import { AuthService } from '../services/auth.service';
import { filter, forkJoin, Observable, switchMap, of, Subject, takeUntil } from 'rxjs';
import { VideoService } from '../services/video.service';
import { VideoWindow } from '../models/video-window';
import { NavigationService } from '../services/navigation.service';
import { ActivatedRoute, Router } from '@angular/router';
import { DataCosntans } from '../dataconstants';
import { HistoryService } from '../services/history.service';

@Component({
  selector: 'app-you-page',
  standalone: false,

  templateUrl: './you-page.component.html',
  styleUrl: './you-page.component.scss'
})
export class YouPageComponent
{
    userId$ : Observable<string | null>;
    userId : string|null = null;
    watchHistoryVideoInfo : VideoWindow[] = [];
    likedVideosCollection : VideoWindow[] = [];
    //this will contain maximum of 10 items not the actual length of how many total videos has user liked

    likedVideoPlayListFrontVideo : VideoWindow | null = null;
    totalLikedVideosCount = 0;
    private destroySubcjet = new Subject<void>();







    constructor(private authService : AuthService, private videoService : VideoService, private navigationService : NavigationService, private router : Router, private historyService : HistoryService)
    {
      this.userId$ = this.authService.getUserIdAsObservable();
    }






    ngOnInit()
    {


      this.userId$.pipe(
        filter((usersId => usersId !== null)),

        switchMap(usersId =>
          forkJoin(
            {
              userId$ : of(usersId),
              history$ : this.historyService.getUserHistoryForYouPage(),
              likes$ : this.historyService.getUserLikedHistory(),
              totalLikedVideos$ : this.videoService.getLikedVideosCount()
            }
          )
        ),
        takeUntil(this.destroySubcjet)

      ).subscribe(({ userId$, history$, likes$ , totalLikedVideos$}) =>
        {
          this.userId = userId$,
          this.watchHistoryVideoInfo = history$,
          this.likedVideosCollection = likes$,
          this.likedVideoPlayListFrontVideo = this.likedVideosCollection[0];
          this.totalLikedVideosCount = totalLikedVideos$
        });



      console.log(this.watchHistoryVideoInfo)



    }

    ngOnDestroy()
    {
      this.destroySubcjet.next();
      this.destroySubcjet.complete();
    }

    navigateToLogIn()
    {



        const route =
        {
          path : ['you-page'],

        }


        this.navigationService.updateAdress(route);


        this.router.navigate(['login']);
    }











}
