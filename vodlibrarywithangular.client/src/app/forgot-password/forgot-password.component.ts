import { Component } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { AuthService } from '../auth.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-forgot-password',
  standalone: false,

  templateUrl: './forgot-password.component.html',
  styleUrl: './forgot-password.component.scss'
})
export class ForgotPasswordComponent
{
  emailForm : FormGroup;
  emailValid : boolean = false;
  theValidEmail : string | null = null;

  emailErrorMessage : string | null = null;
  passwordErrorMessage : string | null = null;

  passWordForm : FormGroup | undefined = undefined;

  constructor(private formBuilder : FormBuilder, private authService : AuthService, private router : Router)
  {
    this.emailForm = formBuilder.group(
      {
        Email : ['', [Validators.email, Validators.required]]
      }
    )

    console.log(`is email valid state currently this ${this.emailValid}`);
  }

  requestChange()
  {
      const givenEmail = this.emailForm.get('Email')?.value as string;

      console.log(givenEmail);

      this.authService.confirmValidEmail(givenEmail).subscribe(
        {
          next : (answer) =>
          {
             this.emailValid = answer.confirmed;
             this.theValidEmail = answer.email;
             this.emailForm.get('Email')?.disable();

             this.passWordForm = this.formBuilder.group(
              {
                 password : ['', [Validators.required, Validators.minLength(6)]],
                confirmPassword : ['', [Validators.required, Validators.minLength(6)]]
              }
             )
          },
          error : (err) =>
          {
            this.emailErrorMessage = err.message;
            this.emailForm.reset();
          }
        }
      )
  }

  changePassword()
  {
      if(this.passWordForm)
      {
          const newPassWord = this.passWordForm.get('password')?.value as string;
          const confirmPassword = this.passWordForm.get('confirmPassword')?.value as string;

        if(confirmPassword !== newPassWord)
        {
          this.passwordErrorMessage = "passwords don t match";
          this.passWordForm.reset();

          return;
        }

        if(this.theValidEmail)
        {
            this.authService.changePassword(this.theValidEmail, newPassWord , confirmPassword)
            .subscribe(
              {
                next : (data) =>
                {
                  console.log('we made it');
                  this.router.navigate(['login']);
                },
                error : (err) =>
                {
                  console.error(`failed to change passwrod ${err}`);
                }
              }
            );
        }

      }


  }
}



