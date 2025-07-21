import { Component, inject } from '@angular/core';
import { AuthService } from '../auth.service';
import { Register } from '../models/register';
import {FormBuilder, Validators, FormGroup} from '@angular/forms';
import {  Router } from '@angular/router';



@Component({
  selector: 'app-register',
  standalone: false,

  templateUrl: './register.component.html',
  styleUrl: './register.component.scss'
})
export class RegisterComponent
{
  user : Register =
  {
    UserName : "",
    Email : "",
    Password : "",
    ConfirmPassword : ''
  };

  registerForm : FormGroup
  router = inject(Router);
  showPassword : boolean = false;

  serverError : string | null = null;


  constructor(private authService : AuthService, private formBuilder : FormBuilder)
  {
    this.registerForm = formBuilder.group(
      {
        UserName : ['', [Validators.required, Validators.minLength(3), Validators.maxLength(22)]],
        Email : ['', [Validators.required, Validators.email]],
        Password : ['', [Validators.required]],
        ConfirmPassword : ['', [Validators.required]]
      })
  }

  onSubmit()
  {
    if(this.registerForm.valid)
      {
        this.user = this.registerForm.value
          this.registerUser();



      }
  }

  private registerUser()
  {
    this.authService.register(this.user)
    .subscribe(
      {
        next : (result) => console.log("Registered successful", result),
        error : (error) =>
          {
            console.error("Registration failed", error);
            this.serverError = error.error;
          },
        complete : () =>
          {
            console.log("Registration  completed")

            this.router.navigate(['/login'], {state : {message : "You've completed the register process. Please log in to proceed."}});
          }


      })
  }

  public ShowPassword()
  {
      this.showPassword = !this.showPassword
  }




}





