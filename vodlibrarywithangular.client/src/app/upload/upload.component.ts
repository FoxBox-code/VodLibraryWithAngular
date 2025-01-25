import { Component, OnInit } from '@angular/core';
import { Category } from '../models/category';
import { VideoService } from '../video.service';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { DataCosntans } from '../dataconstants';




@Component({
  selector: 'app-upload',
  standalone: false,

  templateUrl: './upload.component.html',
  styleUrl: './upload.component.css'
})
export class UploadComponent implements OnInit
{
   categories? : Category[];
   selectedCategory : Category | undefined;
   uploadForm : FormGroup;
   videoFile : File | null = null;
   imageFile : File | null = null;

      constructor(private videoService : VideoService, formBuilder : FormBuilder)
      {
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

          error : (error) => console.error("Failed to upload a video", error.message, error.error, error.status)


      });


  }
  onFileSelect(event : Event , fileName : string) : void
  {
        const file = (event.target as HTMLInputElement)?.files?.[0] ?? null;

        if(fileName === 'videoFile')
        {
            this.videoFile = file;
        }
        else
        {
          this.imageFile = file;
        }
  }


}
