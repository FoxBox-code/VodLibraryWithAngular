import { Component, inject } from '@angular/core';
import { AuthService } from '../auth.service';
import { Login } from '../models/login';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';

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
    router = inject(Router);

    loginForm : FormGroup;


    constructor(private authService : AuthService, formBuilder : FormBuilder)
    {
      this.loginForm = formBuilder.group(
        {
          Email : ['', [Validators.email, Validators.required]],
          Password : ['', [Validators.required]],
          RememberMe : [false]
        })
    }

    onSubmit()
    {
        if(this.loginForm.valid)
        {
            this.user = this.loginForm.value;

            this.loginUser();

            this.router.navigate(['/']);
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
            },
          error : (error) => console.log("Login failed", { messgae : error.message, status : error.status ,error : error.error }),

          complete : () => console.log("Login completed welcome")

        })





    }

}
