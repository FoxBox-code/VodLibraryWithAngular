import { Component, inject , AfterViewInit, ChangeDetectorRef} from '@angular/core';
import { AuthService } from '../auth.service';
import { Login } from '../models/login';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { NavigationService } from '../navigation.service';

@Component({
  selector: 'app-login',
  standalone: false,

  templateUrl: './login.component.html',
  styleUrl: './login.component.scss'
})
export class LoginComponent implements AfterViewInit
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

    registerMessage : string | null = null;//if user register with success display a message
    showPassword : boolean = false;
    focusPassWordButton : boolean = false;

    constructor(private authService : AuthService, formBuilder : FormBuilder, private navigationService : NavigationService, private cdr : ChangeDetectorRef)
    {
      this.loginForm = formBuilder.group(
        {
          Email : ['', [Validators.email, Validators.required]],
          Password : ['', [Validators.required]],
          RememberMe : [false]
        })

        navigationService.getAdress().subscribe(result => this.navigationAdress = result)
    }

    ngOnInit()
    {
      const nav = this.router.getCurrentNavigation();
      const state = nav?.extras.state as {message : string}

      if(state)
      {
        this.registerMessage = state.message;
      }
    }

    ngAfterViewInit()
    {
      setTimeout(() =>
      {
        this.focusPassWordButton = this.loginForm.get('Password')?.value?.length > 0
        this.cdr.detectChanges();
      }, 200);
    }

    onPasswordWrapperFocus()
    {
      this.focusPassWordButton = true;
    }

    onPasswordWrapperBlur()
    {
      if(!this.showPassword)
      {
        this.focusPassWordButton = false;
      }

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
                      video : item.video,
                      primaryKeyId : item.primaryKeyId
                    }))
                    this.authService.userTodayWatchHistorySubject.next(convertedData);

                  },
                  error : (err) =>
                  {
                    console.error(`Failed to load the users watch history for today`);
                  }
                }
              )

              this.authService.getUserFollowing().subscribe({
                next : (following) =>
                  {
                    this.authService.updateSubectForUserFollowing(following);
                    console.log("We recieved user's followers");
                  }

              })
            },
          error : (error) => console.log("Login failed", { messgae : error.message, status : error.status ,error : error.error }),

          complete : () => console.log("Login completed welcome")

        })





    }

    public viewPassword()
    {
      this.showPassword = !this.showPassword
    }

    public passWordInput()
    {
      this.focusPassWordButton = this.loginForm.get('Password')?.value?.length > 0
    }



}
