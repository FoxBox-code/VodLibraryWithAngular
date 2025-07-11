import { Component, inject } from '@angular/core';
import { AuthService } from '../auth.service';
import { Login } from '../models/login';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { NavigationService } from '../navigation.service';

@Component({
  selector: 'app-login',
  standalone: false,

  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent
{
    user : Login =
    {
      Email : '',
      Password : '',
      RememberMe : false
    }
    navigationAdress : string = '/';
    router = inject(Router);

    loginForm : FormGroup;


    constructor(private authService : AuthService, formBuilder : FormBuilder, private navigationService : NavigationService)
    {
      this.loginForm = formBuilder.group(
        {
          Email : ['', [Validators.email, Validators.required]],
          Password : ['', [Validators.required]],
          RememberMe : [false]
        })

        navigationService.getAdress().subscribe(result => this.navigationAdress = result)
    }

    onSubmit()
    {
        if(this.loginForm.valid)
        {
            this.user = this.loginForm.value;

            this.loginUser();

            this.router.navigate([this.navigationAdress]);
        }
    }
    private loginUser()
    {
      this.authService.login(this.user)
      .subscribe(
        {
          next : (result) =>
            {
              console.log("Login successful", result);
              this.authService.setLocalStorageToken(result.token);


              this.authService.getUserTodaysWatchHistory()
              .subscribe(
                {
                  next : (data) =>
                  {
                    const convertedData = data.map(item =>({
                      videoId : item.videoId,
                      watchedOn : new Date(item.watchedOn),
                      video : item.video
                    }))
                    this.authService.userTodayWatchHistorySubject.next(convertedData);

                  },
                  error : (err) =>
                  {
                    console.error(`Failed to load the users watch history for today`);
                  }
                }
              )
            },
          error : (error) => console.log("Login failed", { messgae : error.message, status : error.status ,error : error.error }),

          complete : () => console.log("Login completed welcome")

        })





    }

}
