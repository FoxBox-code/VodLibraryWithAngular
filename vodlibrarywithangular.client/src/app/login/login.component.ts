import { Component, inject , AfterViewInit, ChangeDetectorRef} from '@angular/core';
import { AuthService } from '../auth.service';
import { Login } from '../models/login';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { NavigationExtras, Params, Router } from '@angular/router';
import { NavigationService } from '../navigation.service';

@Component({
  selector: 'app-login',
  standalone: false,

  templateUrl: './login.component.html',
  styleUrl: './login.component.scss'
})
export class LoginComponent
{
    user : Login =
    {
      Email : '',
      Password : '',
      RememberMe : false
    }
    navigationAdress : {path : any[], querryParams? : Params} = {path : ['/']};
    router = inject(Router);

    loginForm : FormGroup;

    registerMessage : string | null = null;//if user register with success display a message
    showPassword : boolean = false;
    focusPassWordButton : boolean = false;

    emailOrPasswordWrongError : string | null = null;
    failedLogInAttempt : boolean = false;

    constructor(private authService : AuthService, formBuilder : FormBuilder, navigationService : NavigationService)
    {
      this.loginForm = formBuilder.group(
        {
          Email : ['', [Validators.email, Validators.required]],
          Password : ['', [Validators.required]],
          RememberMe : [false]
        })

        navigationService.getAdress()
        .subscribe(
          result =>
            this.navigationAdress = result)
    }

    get showPasswordButton() : boolean
    {
      const pass = this.loginForm.get('Password')?.value as string;
      const verdict = (this.focusPassWordButton && pass.length > 0);
      return verdict;
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



    onPasswordWrapperFocus()
    {
      this.focusPassWordButton = true;
    }

    onPasswordWrapperBlur()
    {

      this.focusPassWordButton = false;
      this.showPassword = false;
    }


    onSubmit()
    {
        if(this.loginForm.valid)
        {
            this.user = this.loginForm.value;

            this.loginUser();


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

              //to nested subscriptions this needs a rewrite
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
                    sessionStorage.setItem('userFollowing', JSON.stringify(following))
                    this.authService.updateSubjectForUserFollowing(following);
                    console.log("We recieved user's followers");
                  }

              })
            },
          error : (error) =>
            {
              console.log("Login failed", { messgae : error.message, status : error.status ,error : error.error });
              this.emailOrPasswordWrongError = error.error;
              this.failedLogInAttempt = true;
              this.loginForm.reset();
            }
            ,

          complete : () =>
            {
              console.log("Login completed welcome");


              const queryParams = this.navigationAdress.querryParams;

              // const navigationExtra : NavigationExtras = {};

              this.router.navigate(this.navigationAdress.path , {queryParams, replaceUrl : true});
              
            }


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
