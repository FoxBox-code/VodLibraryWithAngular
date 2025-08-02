import { Component, inject } from '@angular/core';
import { AuthService } from '../auth.service';
import { Register } from '../models/register';
import {FormBuilder, Validators, FormGroup} from '@angular/forms';
import {  Router } from '@angular/router';
import { BehaviorSubject, Observable } from 'rxjs';
import { DataCosntans } from '../dataconstants';



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
    ConfirmPassword : '',
    ProfilePic : null
  };

  registerForm : FormGroup
  router = inject(Router);
  showPassword : boolean = false;

  serverError : string | null = null;
  imageFileInvalidation : boolean = false;
  profilePicImageFile : File | null = null;
  errorResponseSubject = new BehaviorSubject<{[key : string] : string[]}>({});
  errorResponseSubject$ = this.errorResponseSubject.asObservable();
  defaultImageUrl = DataCosntans.defaultIconImage;

  userProfilePic : string | null = null;


  constructor(private authService : AuthService, private formBuilder : FormBuilder)
  {
    this.registerForm = formBuilder.group(
      {
        UserName : ['', [Validators.required, Validators.minLength(3), Validators.maxLength(22)]],
        Email : ['', [Validators.required, Validators.email]],
        Password : ['', [Validators.required]],
        ConfirmPassword : ['', [Validators.required]],
        ProfilePic : ['']
      })
  }

  onSubmit()
  {
    if(this.registerForm.valid)
      {
        const form = new FormData();

        form.append('UserName', this.registerForm.get('UserName')?.value);
        form.append('Email', this.registerForm.get('Email')?.value);
        form.append('Password', this.registerForm.get('Password')?.value);
        form.append('ConfirmPassword', this.registerForm.get('ConfirmPassword')?.value);

        if(this.profilePicImageFile)
          form.append('ProfilePic', this.profilePicImageFile);



        this.registerUser(form);







      }
  }

  onFileSelect(event : Event)
  {
    const element = event.target as HTMLInputElement;
    const file = element.files?.item(0)
    console.log(file)



    if(file instanceof File)
    {
      const read = new FileReader();
      read.onload = (ev : ProgressEvent<FileReader>) =>
    {
        const result = ev.target?.result

        if(result instanceof ArrayBuffer)
        {
          const bytes = new Uint8Array(result);
          console.log("The bytes :", bytes.slice(0, 12));//Increase this to 12 because WEBP format requires a 12bytes length header

          this.imageFileInvalidation = !this.fileImageAllowed(bytes);

          if(!this.imageFileInvalidation)
          {
            this.profilePicImageFile = file;
             console.log(this.profilePicImageFile.name);

              this.userProfilePic = URL.createObjectURL(file); // ← creates temporary link
          }

        }
    }

      read.readAsArrayBuffer(file)
    }
    else
    {
      this.profilePicImageFile = null;
      if(this.userProfilePic)
        URL.revokeObjectURL(this.userProfilePic);
    }




  }

  private fileImageAllowed(bytes : Uint8Array)
  {
    // JPEG (FF D8 FF)
  if (bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF) {
    return true;
  }

  // PNG (89 50 4E 47 0D 0A 1A 0A)
  if (
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4E &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0D &&
    bytes[5] === 0x0A &&
    bytes[6] === 0x1A &&
    bytes[7] === 0x0A
  ) {
    return true;
  }

  // GIF87a or GIF89a (47 49 46 38 37|39 61)
  if (
    bytes[0] === 0x47 && // G
    bytes[1] === 0x49 && // I
    bytes[2] === 0x46 && // F
    bytes[3] === 0x38 && // 8
    (bytes[4] === 0x37 || bytes[4] === 0x39) && // 7 or 9
    bytes[5] === 0x61 // a
  ) {
    return true;
  }

  //some new popular page format called WEBP its provides better compression than JPEG for the same quality
  if(
    bytes[0] === 0x52 && // R
    bytes[1] === 0x49 && // I
    bytes[2] === 0x46 && // F
    bytes[3] === 0x46 && // F
    bytes[8] === 0x57 && // W
    bytes[9] === 0x45 && // E
    bytes[10] === 0x42 && // B
    bytes[11] === 0x50  // P
  )
  {
    return true;
  }


  return false;
  }

  private registerUser(form : FormData)
  {
    this.authService.register(form)
    .subscribe(
      {
        next : (result) =>
          {
            console.log("Registered successful", result)
            this.errorResponseSubject.next({});

            if(this.userProfilePic)
            URL.revokeObjectURL(this.userProfilePic);
          },
        error : (serverError) =>
          {

            if(serverError.status === 400)
            {
              console.log(`Registration failed ${serverError.message} , ${serverError.error}`)

              console.log(`This MF ${JSON.stringify(serverError.error)}`);
              this.errorResponseSubject.next(serverError.error.errors);//absolute hell

              this.errorResponseSubject$.subscribe(
                data => {
                  console.log(data)
                }
              )

            }


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

  Cock()
  {
    this.authService.Cock().subscribe();
  }


}





