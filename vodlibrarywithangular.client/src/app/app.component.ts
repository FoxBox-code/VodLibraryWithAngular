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
  userAuth = false;

  constructor(private http: HttpClient, private authService : AuthService) {}

  ngOnInit() {
    this.getForecasts();

    this.userAuth = this.authService.isAuthenticated();
  }

  getForecasts() {
    this.http.get<WeatherForecast[]>('/weatherforecast').subscribe(
      (result) => {
        this.forecasts = result;
      },
      (error) => {
        console.error(error);
      }
    );
  }

  logOutUser(){}

  title = 'vodlibrarywithangular.client';
}
