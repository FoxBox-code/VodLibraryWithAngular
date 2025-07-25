import { Component, OnInit } from '@angular/core';
import { Category } from '../models/category';
import { VideoService } from '../video.service';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { DataCosntans } from '../dataconstants';
import { Router } from '@angular/router';
import { AuthService } from '../auth.service';
import { VideoWindow } from '../models/video-window';



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
   videFileName : string | null = null;
   imageFile : File | null = null;
   imageFileName : string | null = null;
   currentImageUrl : string | null = null;
   dataConstants = DataCosntans;
   latestVideoAdded : boolean = false;
   latestVideoWindow : VideoWindow | undefined = undefined;

   areaInputLimitHit : boolean = false;

      constructor(private videoService : VideoService, formBuilder : FormBuilder, private router: Router, private authService: AuthService)
      {
        authService.getAuthStatus().subscribe((result)=>
        {
            if(!result)//this check might be useless since we have authgurd placed in the app-routing module
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
              VideoFile : ['', [Validators.required]],
              ImageFile : ['', [Validators.required]]


          });
      }



  ngOnInit(): void
  {
    this.videoService.getVideoWindow()
    .subscribe(
      {
        next : (data) =>
        {
          this.latestVideoWindow = data;
        }
      }
    )
  }
  ngOnDestroy()
  {
    this.clearLocalImageUrl();   //clean up the image from browser's memory manually before leaving the page
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
          next : (result) =>
            {
              console.log(result.message);
              this.latestVideoWindow = result.videoWindowDTO;

              this.uploadForm.reset();
            }
            ,
          error : (error) => console.error("Failed to upload a video", error.message, error.error, error.status) ,

          complete : () =>
          {
              this.latestVideoAdded = true;
              // this.router.navigate(['/']);
          }


      });


  }
  onFileSelect(event : Event , fileName : string) : void
  {
        const inputElement = event.target as HTMLInputElement;
        const file = inputElement.files?.[0] ?? null;

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
            this.videFileName = this.videoFile.name;
            this.uploadForm.get('VideoFile')?.setValue(this.videoFile);

          }
          else
          {
              console.error(`The slected video was of extension ${fileFormat} which is invalid`);
              window.alert(`Video format only supports these extensions ${videoFormatAllowed.join(', ')}`);
              inputElement.value = "";
          }


        }
        else if (fileName === 'imageFile')
        {
          if(imageFormatAllowed.includes(fileFormat as string) && fileFormat)
          {
              console.log(`Image file selected ${file.name}`);
              this.imageFile = file;
              this.imageFileName = this.imageFile.name;
              this.uploadForm.get('ImageFile')?.setValue(this.imageFile);

              this.clearLocalImageUrl()//clears the previous local Image In Browser if exists
              this.currentImageUrl = URL.createObjectURL(this.imageFile);

          }
          else
          {
              console.error(`The slected image was of extension ${fileFormat} which is invalid`);
              window.alert(`Image format only supports these extensions ${imageFormatAllowed.join(', ')}`);
              inputElement.value = "";

          }

        }
  }

  areaAutoGrowth(event : Event) : void
  {
      const elementTextArea = event.target as HTMLAreaElement;

      elementTextArea.style.height = 'auto';
      elementTextArea.style.height = elementTextArea.scrollHeight + 'px'
  }
  maxUserInput(event : Event, field : string)
  {
      const elementTextArea = event.target as HTMLTextAreaElement;
      const value = elementTextArea.value;
      let limit = value.length;

      this.areaInputLimitHit = false;

      if(field === 'Title')
      {
        limit = this.dataConstants.TitleMaxLength;
      }
      else if(field === 'Description')
      {
        limit = this.dataConstants.DescriptionMaxLength;
      }

      if(value.length > limit)
         {
            this.areaInputLimitHit = true;
            elementTextArea.value = value.slice(0, limit);
            this.uploadForm.get(field)?.setValue(elementTextArea.value);

            this.areaAutoGrowth(event);
         }



  }

  private clearLocalImageUrl()
  {
    if(this.currentImageUrl !== null)
    {
      URL.revokeObjectURL(this.currentImageUrl as string);
      this.currentImageUrl = null;
    }

  }


}
