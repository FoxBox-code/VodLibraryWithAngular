import { HttpClient } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { UploadComponent } from './upload/upload.component';
import { AuthService } from './auth.service';

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
  public forecasts: WeatherForecast[] = [];
  userAuth = false; //cheks if user is loged in 

  constructor(private http: HttpClient, private authService : AuthService) {}

  ngOnInit()
  {
    this.authService.getAuthStatus().subscribe((authStatus)=>
      {
        this.userAuth = authStatus;
      });
  }





  logOutUser()
  {
    this.authService.clearLocalStorageToken();

  }

  title = 'vodlibrarywithangular.client';
}
