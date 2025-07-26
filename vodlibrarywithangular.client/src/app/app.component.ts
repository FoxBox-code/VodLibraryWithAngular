import { HttpClient } from '@angular/common/http';
import { Component, OnInit, Query } from '@angular/core';
import { UploadComponent } from './upload/upload.component';
import { AuthService } from './auth.service';
import { Observable } from 'rxjs';
import { Router } from '@angular/router';
import { FormControl } from '@angular/forms';



@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  standalone: false,
  styleUrl: './app.component.scss'
})
export class AppComponent implements OnInit {
  constructor(private http: HttpClient, private authService : AuthService, private router : Router)
  {
    this.userNameDynamic$ = this.authService.getUserNameAsOservable();
    this.userId$ = this.authService.getUserIdAsObservable()

  }


  userAuth = false; //cheks if user is loged in
  userName : string | null = '';
  userNameDynamic$ : Observable<string | null>
  userId$ : Observable<string | null>
  title = 'vodlibrarywithangular.client';
  mainMenu : boolean = true; //Check's whether it has to render the videos section or different component
  searchBar : FormControl = new FormControl<string>('');
  searchBarFocused : boolean = false;



  ngOnInit()
  {
    this.authService.getAuthStatus().subscribe((authStatus)=>
      {
        this.userAuth = authStatus;
      });



    this.router.events.subscribe(() =>
    {
        this.mainMenu = this.router.url === '/';
    })
  }

  logOutUser()
  {
    this.authService.clearLocalStorageToken();
    this.authService.userTodayWatchHistorySubject.next([]);

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







}
