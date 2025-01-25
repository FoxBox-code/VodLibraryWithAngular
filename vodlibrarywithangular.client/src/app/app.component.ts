import { HttpClient } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { UploadComponent } from './upload/upload.component';
import { AuthService } from './auth.service';
import { Observable } from 'rxjs';

interface WeatherForecast {
  date: string;
  temperatureC: number;
  temperatureF: number;
  summary: string;
}

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  standalone: false,
  styleUrl: './app.component.css'
})
export class AppComponent implements OnInit {
  constructor(private http: HttpClient, private authService : AuthService)
  {
    this.userNameDynamic$ = this.authService.getUserNameAsOservable();
  }

  public forecasts: WeatherForecast[] = [];
  userAuth = false; //cheks if user is loged in
  userName : string | null = '';
  userNameDynamic$ : Observable<string | null>
  title = 'vodlibrarywithangular.client';



  ngOnInit()
  {
    this.authService.getAuthStatus().subscribe((authStatus)=>
      {
        this.userAuth = authStatus;
      });

    this.getUserName();
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
