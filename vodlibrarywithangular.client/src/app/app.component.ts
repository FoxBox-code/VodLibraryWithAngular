import { HttpClient } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { UploadComponent } from './upload/upload.component';
import { AuthService } from './auth.service';
import { Observable } from 'rxjs';
import { Router } from '@angular/router';



@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  standalone: false,
  styleUrl: './app.component.css'
})
export class AppComponent implements OnInit {
  constructor(private http: HttpClient, private authService : AuthService, private router : Router)
  {
    this.userNameDynamic$ = this.authService.getUserNameAsOservable();
  }


  userAuth = false; //cheks if user is loged in
  userName : string | null = '';
  userNameDynamic$ : Observable<string | null>
  title = 'vodlibrarywithangular.client';
  mainMenu : boolean = true; //Check's whether if has to render the videos section or different component



  ngOnInit()
  {
    this.authService.getAuthStatus().subscribe((authStatus)=>
      {
        this.userAuth = authStatus;
      });

    this.getUserName();

    this.router.events.subscribe(() =>
    {
        this.mainMenu = this.router.url === '/';
    })
  }

  logOutUser()
  {
    this.authService.clearLocalStorageToken();

  }
  getUserName()
  {
      // this.userName = this.authService.getUserNameFromToken(); old synchronous way
      this.userNameDynamic$ = this.authService.getUserNameAsOservable(); // better asynchronous
  }







}
