import { Component } from '@angular/core';
import { AuthService } from '../auth.service';
import { Register } from '../models/register';

@Component({
  selector: 'app-register',
  standalone: false,

  templateUrl: './register.component.html',
  styleUrl: './register.component.css'
})
export class RegisterComponent
{
  user : Register =
  {
    UserName : "",
    Email : "",
    Password : ""
  };

  constructor(private authService : AuthService)
  {

  }

  register()
  {
    this.authService.register(this.user)
    .subscribe(
      {
        next : (result) => console.log("Registered successful", result),
        error : (error) => console.log("Registration failed", error),
        complete : () => console.log("Registration  completed")


      })
  }




}
