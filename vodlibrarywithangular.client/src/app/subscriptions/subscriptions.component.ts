import { Component } from '@angular/core';
import { VideoService } from '../video.service';
import { VideoWindow } from '../models/video-window';
import { every, filter, map, Observable, Subject, switchMap } from 'rxjs';
import { AuthService } from '../auth.service';
import { Router } from '@angular/router';
import { NavigationService } from '../navigation.service';
import { DataCosntans } from '../dataconstants';

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
  currentUserId : string | null = null;
  userId$: Observable<string | null>
  destroySubect = new Subject<void>();
  playTabIconUrl = DataCosntans.playTabIcon;



  constructor(private videoService : VideoService, private authService : AuthService, private router : Router , private navigationService : NavigationService  )
  {
    this.userId$ = this.authService.getUserIdAsObservable();
  }

  ngOnInit()
  {


    this.userId$.pipe(
      filter((userId) => userId !== null),

      switchMap((userId)=>
        this.videoService.getUserVideosFromSubscribers()
      .pipe(
        map(videos => ({userId , videos}))
      )
      )
    ).subscribe({
    next: ({ userId, videos }) => {
      this.currentUserId = userId;
      this.videosFromSubscribers = videos;

    },
    error: (err) => {
      console.error('stream error', err);
    },
    complete: () => {

    }
  });


  }

  navigateToLogIn()
    {
      const route =
      {
        path : ['subscriptions'],

      }


      this.navigationService.updateAdress(route);


      this.router.navigate(['login']);

    }



}







