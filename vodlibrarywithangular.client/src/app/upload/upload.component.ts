import { Component, OnInit } from '@angular/core';
import { Category } from '../models/category';
import { VideoService } from '../video.service';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { DataCosntans } from '../dataconstants';
import { Router } from '@angular/router';
import { AuthService } from '../auth.service';
import { VideoWindow } from '../models/video-window';
import { interval, switchMap } from 'rxjs';
import { VideoStatusEnum } from '../models/enumVideoStatus';



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
   currentVideoFileUrl : string | null = null;
   imageFile : File | null = null;
   imageFileName : string | null = null;
   currentImageUrl : string | null = null;
   dataConstants = DataCosntans;
   latestVideoAdded : boolean = false;
   latestVideoWindow : VideoWindow | undefined = undefined;

   pollingVideoStatusMessage : string | null = null;

   

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
    // this.videoService.getVideoWindow()//This is a HARDCODED API request to see visually how the poping element will look (Delete) if you want
    // .subscribe(
    //   {
    //     next : (data) =>
    //     {
    //       this.latestVideoWindow = data;
    //     }
    //   }
    // )
  }
  ngOnDestroy()
  {
    this.clearLocalUrls(this.currentVideoFileUrl);   //clean up the image from browser's memory manually before leaving the page
    this.clearLocalUrls(this.currentImageUrl);
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

      this.videoService.uploadVideoNew(formData).subscribe(
      {
          next : (result) =>
            {
              console.log(result.status);
              const uploadingQueue : string[] = JSON.parse(localStorage.getItem('uploadingVideos') || '[]');

              uploadingQueue.push(result.videoId.toString());

              localStorage.setItem('uploadingVideos', JSON.stringify(uploadingQueue));

              this.uploadForm.reset();
              this.currentImageUrl = null;
              this.currentVideoFileUrl = null;
              this.videFileName = null;
              this.imageFileName = null;
              this.justClearBothUrls()

              console.log(result.videoId)

              const sub = interval(3000).pipe(
                switchMap(() => this.videoService.getStatusForVideo(result.videoId))
              ).subscribe(
                {
                  next : (response) =>
                  {
                    const status = response.status;

                    if(status === VideoStatusEnum.Complete)
                    {
                      this.pollingVideoStatusMessage = "Video uploaded successfully"
                      this.latestVideoAdded = true;
                      this.latestVideoWindow = response.videWindowDto;
                      sub.unsubscribe();
                    }
                    else if(status === VideoStatusEnum.Failed)
                    {
                      this.pollingVideoStatusMessage = "Failed to upload video"
                      sub.unsubscribe();

                    }
                    else if(status === VideoStatusEnum.Processing)
                    {
                      this.pollingVideoStatusMessage = "Video is still processing"
                    }
                  }
                }
              )




            }
            ,
          error : (error) => console.error("Failed to upload a video", error.message, error.error, error.status) ,




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

            this.currentVideoFileUrl= this.clearLocalUrls(this.currentVideoFileUrl);//clear previous object
            this.currentVideoFileUrl = URL.createObjectURL(this.videoFile);
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

              this.currentImageUrl = this.clearLocalUrls(this.currentImageUrl)//clears the previous local Image In Browser if exists
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

  private clearLocalUrls(objectUrlToDelete : string | null) : null
  {
    if(objectUrlToDelete !== null)
    {
      URL.revokeObjectURL(objectUrlToDelete as string);
      return objectUrlToDelete = null;
    }

    return objectUrlToDelete
  }
  private justClearBothUrls()
  {
    this.clearLocalUrls(this.currentVideoFileUrl);
    this.clearLocalUrls(this.currentImageUrl);
  }


}
