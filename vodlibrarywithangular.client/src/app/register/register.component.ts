import { Component, inject } from '@angular/core';
import { AuthService } from '../auth.service';
import { Register } from '../models/register';
import {FormBuilder, Validators, FormGroup} from '@angular/forms';
import {  Router } from '@angular/router';



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
    Password : "",
    ConfirmPassword : ''
  };

  registerForm : FormGroup
  router = inject(Router);

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


          this.router.navigate(['/login']);
      }
  }

  private registerUser()
  {
    this.authService.register(this.user)
    .subscribe(
      {
        next : (result) => console.log("Registered successful", result),
        error : (error) => console.error("Registration failed", error),
        complete : () => console.log("Registration  completed")


      })
  }




}





