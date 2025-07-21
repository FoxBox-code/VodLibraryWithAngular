import { Component, OnInit } from '@angular/core';
import { Category } from '../models/category';
import { VideoService } from '../video.service';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { DataCosntans } from '../dataconstants';
import { Router } from '@angular/router';
import { AuthService } from '../auth.service';



@Component({
  selector: 'app-upload',
  standalone: false,

  templateUrl: './upload.component.html',
  styleUrl: './upload.component.scss'
})
export class UploadComponent implements OnInit
{
   categories? : Category[];
   selectedCategory : Category | undefined;
   uploadForm : FormGroup;
   videoFile : File | null = null;
   imageFile : File | null = null;

      constructor(private videoService : VideoService, formBuilder : FormBuilder, private router: Router, private authService: AuthService)
      {
        authService.getAuthStatus().subscribe((result)=>
        {
            if(!result)
            {
              this.router.navigate(['/']);
            }
        })

        videoService.getCategorys().subscribe(
          {
              next : (result) => (this.categories = result) ,
              error : (error) => console.error("Failed to load the categories", error)

          });

          this.uploadForm = formBuilder.group(
          {
              Title : ['', [Validators.required, Validators.maxLength(DataCosntans.TitleMaxLength), Validators.minLength(DataCosntans.TitleMinLength)]],
              Description : ['', [Validators.maxLength(DataCosntans.DescriptionMaxLength)]],
              CategoryId : ['', [Validators.required]],

          });
      }



  ngOnInit(): void
  {

  }
  onSubmit()
  {
      if(this.uploadForm.invalid || !this.videoFile || !this.imageFile)
      {
          console.error("Invalid form fill the requirements");
        return;
      }

      const formData = new FormData();
      formData.append('Title', this.uploadForm.value.Title),
      formData.append('Description', this.uploadForm.value.Description),
      formData.append('CategoryId', this.uploadForm.value.CategoryId);
      formData.append('VideoFile', this.videoFile);
      formData.append('ImageFile', this.imageFile);

      console.log('Form Data ', formData);

      this.videoService.uploadVideo(formData).subscribe(
      {
          next : (result) => console.log(result),

          error : (error) => console.error("Failed to upload a video", error.message, error.error, error.status) ,

          complete : () =>
          {
              this.router.navigate(['/']);
          }


      });


  }
  onFileSelect(event : Event , fileName : string) : void
  {
        const file = (event.target as HTMLInputElement)?.files?.[0] ?? null;

        if(!file)
        {
            console.error('NO file was selected');
            return;

        }

        const videoFormatAllowed = ['mp4', 'avi'];
        const imageFormatAllowed = ['jpg', 'jpeg', 'png', 'gif'];
        const fileFormat = file?.name.split('.').pop()?.toLocaleLowerCase();

        if(fileName === 'videoFile')
        {

          if(videoFormatAllowed.includes(fileFormat as string) && fileFormat)
          {
            this.videoFile = file
            console.log(`Video file selected ${file.name}`);

          }
          else
          {
              console.error(`The slected video was of extension ${fileFormat} which is invalid`);
              window.alert(`Video format only supports these extensions ${videoFormatAllowed.join(', ')}`);
          }


        }
        else
        {
          if(imageFormatAllowed.includes(fileFormat as string) && fileFormat)
          {
              console.log(`Image file selected ${file.name}`);
              this.imageFile = file;

          }
          else
          {
              console.error(`The slected image was of extension ${fileFormat} which is invalid`);
              window.alert(`Image format only supports these extensions ${imageFormatAllowed.join(', ')}`);
          }

        }
  }


}
