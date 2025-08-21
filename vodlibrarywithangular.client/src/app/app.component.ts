import { HttpClient } from '@angular/common/http';
import { Component, OnInit, Query } from '@angular/core';
import { UploadComponent } from './upload/upload.component';
import { AuthService } from './auth.service';
import { Observable } from 'rxjs';
import { NavigationEnd, NavigationStart, Router } from '@angular/router';
import { FormControl } from '@angular/forms';
import { VideoService } from './video.service';
import { Category } from './models/category';
import { ProfilesFollowingDTO } from './models/profiles-followingDTO';
import { DataCosntans } from './dataconstants';



@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  standalone: false,
  styleUrl: './app.component.scss'
})
export class AppComponent implements OnInit {
  constructor(private http: HttpClient, private authService : AuthService, private router : Router, private videoService : VideoService)
  {
    this.userNameDynamic$ = this.authService.getUserNameAsOservable();
    this.userId$ = this.authService.getUserIdAsObservable();

    authService.checkTokenExpiration()


  }
  historyIconUrl = DataCosntans.historyIcon;
  personIconUrl = DataCosntans.personIcon;
  homeIcon = DataCosntans.homeIcon;
  subscriptionIcon = DataCosntans.subscriptionsIcon;
  menuIcon = DataCosntans.menuIcon;
  likeIcon = DataCosntans.likeIcon;
  playListIcon = DataCosntans.playListIcon;

  musicIcon = DataCosntans.musicIcon;
  gamingIcon = DataCosntans.gamingIcon;
  educationIcon = DataCosntans.educationIcon;
  entertainmentIcon = DataCosntans.entertainmentIcon;
  sportsIcon = DataCosntans.sportsIcon;


  genreIconsArray = [this.sportsIcon , this.gamingIcon , this.entertainmentIcon , this.musicIcon, this.educationIcon]


  userAuth = false; //cheks if user is loged in
  userAuth$ : Observable<boolean> | null = null;
  userName : string | null = '';
  userNameDynamic$ : Observable<string | null>
  userId$ : Observable<string | null>
  title = 'vodlibrarywithangular.client';
  mainMenu : boolean = true; //Check's whether it has to render the videos section or different component
  searchBar : FormControl = new FormControl<string>('');
  searchBarFocused : boolean = false;

  dashBoardExpanded : boolean = false;
  categories : Observable<Category[]> | null = null;
  userFollowing$ : Observable<ProfilesFollowingDTO[] | null> | null = null;
  userFollowing : ProfilesFollowingDTO[] = []

  ngOnInit()
  {
    this.userAuth$ = this.authService.getAuthStatus()
    this.authService.getAuthStatus().subscribe((authStatus)=>
      {
        this.userAuth = authStatus;

        if(this.userAuth)
        {
        this.getUserSubscribers();

         if(!this.getUserSubscribers())
          if(!this.getUserSubscribersFromSessionStorage())
            this.getUserSubscribersFromServer();
        }
      });





    this.router.events.subscribe((event) =>
    {
        this.mainMenu = this.router.url === '/';

        if(event instanceof NavigationStart)
        {
          const currentURL = this.router.url;
          const scrolly = window.scrollY.toString();
          sessionStorage.setItem(currentURL, scrolly)
        }

        if(event instanceof NavigationEnd)
        {
          const currentURL = this.router.url;
          const scrollYValueFromSession = sessionStorage[this.router.url]
          if(scrollYValueFromSession > 0)
          {
            requestAnimationFrame(() =>
            {
                setTimeout(() =>
                  {
                    console.log('Restoring scroll to:', scrollYValueFromSession, 'on', currentURL);

                  window.scrollTo(0, parseInt(sessionStorage[currentURL], 10));
                  }, 100);//100seems to work for the scroll to apply I don t understand when the DOM element are finished rendering
            })

          }
          else
            window.scrollTo(0,0);
        }
    })

    this.categories = this.videoService.getCategorys()

    this.categories.subscribe(next =>
      {
        next.forEach(element => {
            console.log(`Show me category ${element.name}`)
        });
      }
      )


  }

  logOutUser()
  {
    this.authService.clearLocalStorageToken();
    this.authService.userTodayWatchHistorySubject.next([]);
    this.router.navigate(['/'])

  }

  performASearch()
  {
    const userInput = this.searchBar.value.trim();

    if(userInput)//redundant  dnant check probably
    {
        this.router.navigate(['/search-page'], {
          queryParams: { query: userInput }
        });
    }
  }



  private getUserSubscribers() : boolean
  {
      this.userFollowing$ = this.authService.userFollowing$;

      this.userFollowing$.subscribe(following => this.userFollowing = following ?? [])

      return this.userFollowing.length > 0;


  }
  private getUserSubscribersFromSessionStorage() : boolean
  {
      const currentSubList = JSON.parse(sessionStorage.getItem('userFollowing') ?? '[]');


      if(currentSubList.length !== 0)
      {
        this.authService.updateSubjectForUserFollowing(currentSubList);
        return true;
      }

      return false
  }
  private getUserSubscribersFromServer()
  {
    this.authService.getUserFollowing()
    .subscribe(
      {
        next : (following) =>
        {


          this.authService.updateSubjectForUserFollowing(following);




        }
      }
    )

  }

  getUserIdFromAuthService()
  {
    return this.authService.getUserIdFromToken();
  }

  ExpandDashBaord()
  {
    this.dashBoardExpanded = !this.dashBoardExpanded;
  }







}







