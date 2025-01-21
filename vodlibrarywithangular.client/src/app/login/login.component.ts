import { Component } from '@angular/core';
import { AuthService } from '../auth.service';
import { Login } from '../models/login';

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


    constructor(private authService : AuthService){}

    login()
    {
      this.authService.login(this.user)
      .subscribe(
        {
          next : (result) => console.log("Login successful", result),
          error : (error) => console.log("Login failed", error),
          complete : () => console.log("Login completed welcome")

        })


    }

}
