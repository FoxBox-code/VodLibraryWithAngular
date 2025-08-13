import { Component, ElementRef, ViewChild} from '@angular/core';
import { FormGroup, FormBuilder, Validators, FormControl } from '@angular/forms';
import { EditVideoDataDTO } from '../models/edit-Video-DataDTO';
import { VideoService } from '../video.service';
import { Observable, combineLatest, filter, of, switchMap, throwError } from 'rxjs';
import { VideoWindow } from '../models/video-window';
import { Category } from '../models/category';
import { ActivatedRoute, Router } from '@angular/router';
import { DataCosntans } from '../dataconstants';
import { EditVideoFormDTO } from '../models/EditVideoFormDTO';
import { EditVideoFormControls } from '../models/EditVideoFormControls';
import { AuthService } from '../auth.service';
@Component({
  selector: 'app-edit-page',
  standalone: false,

  templateUrl: './edit-page.component.html',
  styleUrl: './edit-page.component.scss'
})
export class EditPageComponent
{
    editVideoMetaDataForm : FormGroup<EditVideoFormControls> | undefined

    selectedVideo$ : Observable<VideoWindow | null>;
    selectedVideo : VideoWindow | undefined;
    categories$ : Observable<Category[] | null>;
    categories : Category[] = [];
    editField : string | null = null;
    textAreaHeightCal = 0;
     newImageFile : string | undefined;
    editFormOriginalValues : {[key:string]: string | number} = {}
    userMadeNoChanges : boolean = false;
    imageFileFormatIncorrect : boolean = false;
    imageFormatAllowed = ['jpg', 'jpeg', 'png', 'gif'];

    deleteVideoInputEnabled : boolean = false;
    deleteInputValue : string = "";
    deleteValidationConfirmed : boolean = false;






    @ViewChild('titleInput') titleInput! : ElementRef<HTMLInputElement>
    @ViewChild('descriptionArea') descriptionArea! : ElementRef<HTMLTextAreaElement>

    constructor(private formBuilder : FormBuilder, private videoService : VideoService, private activatedRoute : ActivatedRoute,
      private router : Router, private authService : AuthService)
    {


      this.selectedVideo$ = videoService.selectedVideo$;
      this.selectedVideo$.subscribe(video => console.log(video));
      console.log(this.selectedVideo);

      this.categories$ = videoService.categories$;

      //moster of a code , combineLatest times to the completion of two async observables , we need this because in order to laod the form this needs to be done
      // combineLatest([
      //   this.selectedVideo$.pipe(switchMap(video =>
      //   {
      //     if(video)
      //     {
      //       console.log('Video was saved in memory');
      //       return of(video);
      //     }
      //     const urlParam = activatedRoute.snapshot.paramMap.get('videoId');

      //     if(!urlParam)
      //       return throwError(() => new Error("Error, video id was not found in the URL's location HTTP request avoided"))

      //     console.log('Getting video from the server');
      //     return videoService.getEditVideoInfo(parseInt(urlParam,10));
      //   }
      //   ))

      // ,videoService.getCategorys().pipe(switchMap(categories =>
      // {
      //     if(categories.length > 0)
      //     {
      //         console.log('Categories loadel on server side')
      //          return of(categories);
      //     }

      //     console.log('getting categories from the server')
      //     return videoService.getCategorys();
      // }
      // ))]).subscribe(
      //   {
      //     next : ([video, categories]) =>
      //     {
      //       this.selectedVideo = video;
      //       this.categories = categories;
      //       this.buildForm(video);
      //     },
      //     error : err => console.error('Error loading data for edit form', err)
      //   }
      // );


        this.editVideoMetaDataForm = new FormGroup<EditVideoFormControls>({
          Title: new FormControl('', { nonNullable: true }),
          Description: new FormControl('', { nonNullable: true }),
          CategoryId: new FormControl(0, { nonNullable: true })
        });
              }

      ngOnInit()
      {
        const video = sessionStorage.getItem('selectedVideo');
        const categories = sessionStorage.getItem('videoCategories');

        if(video == null)
        {
          console.log('Edit Video was missing from memory , heading to the server for it')
          const urlParam = this.activatedRoute.snapshot.paramMap.get('videoId');

          if(!urlParam)
              return console.error('Unable to get video id from the page url ')

          this.videoService.getEditVideoInfo(parseInt(urlParam,10)).subscribe(
            {
              next : (data) =>
              {
                this.selectedVideo = data;

                this.videoService.saveVideoSelectedInMemory(data);

                this.buildForm(this.selectedVideo);
              },
              error : (err) =>
              {
                console.error('Response error from the server ,', err.JSON())
              }
            }
          );
        }

        if(!categories)
        {
          console.log('Categories are missing from memory , heading to the server for them')
          this.videoService.getCategorys()
          .subscribe(
            {
              next : (data) =>
              {
                this.categories = data;
                sessionStorage.setItem('videoCategories', JSON.stringify(categories));
                this.videoService.saveCategoriesInMemory(this.categories);
              }
            }
          )
        }


        if(categories)
        {
            this.videoService.saveCategoriesInMemory(JSON.parse(categories));
            console.log('Categories were loaded from meomry , http request avoided')
        }


        if(video)////DONT know why we need to check twice but its required to parse
          {

            // this.videoService.saveVideoSelectedInMemory(JSON.parse(video)); WTF IS THIS GARBAGE DELETE AFTER YOU FIX THE PAGE
            this.buildForm(JSON.parse(video))
            this.getOriginalFormValues();
            console.log('Videos were loaded from memory , httpRequest avoided')
          }

          this.preCalculateTextArea();
      }






    buildForm(video : VideoWindow)
    {
        this.editVideoMetaDataForm = this.formBuilder.group<EditVideoFormControls>({
          Title: this.formBuilder.nonNullable.control(video.title, [
            Validators.required,
            Validators.minLength(DataCosntans.TitleMinLength),
            Validators.maxLength(DataCosntans.TitleMaxLength)
          ]),
          Description: this.formBuilder.nonNullable.control(video.description, [
            Validators.maxLength(DataCosntans.DescriptionMaxLength)
          ]),
          CategoryId: this.formBuilder.nonNullable.control(video.categoryId, [
            Validators.required
          ])
        });

    }

    private getOriginalFormValues()
    {
      this.editFormOriginalValues = {... this.editVideoMetaDataForm?.value};
    }

    fieldToEdit(field : string | null)
    {
      if(field === null)
          this.editField = null;

      else if(field === 'title')
      {
          this.editField = field;
          setTimeout(() => {
            this.titleInput.nativeElement.focus()
          });
          //alternative to setTimout is  ngAfterViewChecked which runs a change detection on the DOM elements , its the better option here since it does not rely on stack and timing
      }
      else if(field === 'description')
      {
        this.editField = field;

        setTimeout(() => {
          this.descriptionArea.nativeElement.focus();
          this.textAreaAutoGrowth();
        });
      }


    }

    textAreaAutoGrowth()
    {
      const area = this.descriptionArea.nativeElement;

      area.style.height = 'auto';
      area.style.height = area.scrollHeight + 'px';
    }

    preCalculateTextArea()
    {
      const text = this.editVideoMetaDataForm?.get('Description')?.value || '';
      const temp = document.createElement('textarea');

      temp.style.visibility = 'hidden';
      temp.style.position = 'absolute';
      temp.style.height = 'auto';
      temp.style.width = '100%';
      temp.value = text;

      document.body.appendChild(temp);
      this.textAreaHeightCal = temp.scrollHeight;
      document.body.removeChild(temp);
    }

    upLoadImageFile(event : Event)
    {
      const element = event.target as HTMLInputElement
      console.log(element);

      const file = element.files?.[0] ?? null

      if(file == null)
        return console.log('no file inputed')

      const fileType = file.name.split('.').pop()?.toLocaleLowerCase();


      if(fileType && this.imageFormatAllowed.includes(fileType))
      {
        this.imageFileFormatIncorrect = false;
        const reader = new FileReader();

        reader.onload = () =>
        {
          this.newImageFile = reader.result as string
          console.log(`Lets see what a data url with base64 string looks like : ${this.newImageFile}`)
        }

        reader.readAsDataURL(file);
      }
      else
      {
        this.imageFileFormatIncorrect = true;
      }

    }






    cancelImageChanges()
    {
      this.newImageFile = undefined;
    }

    resetFormField(formAttribute : string)
    {
        const formField = this.editVideoMetaDataForm?.get(formAttribute)?.value;


        if(formField)
        {
            this.editVideoMetaDataForm?.get(formAttribute)?.setValue(this.editFormOriginalValues[formAttribute]);
        }
    }

    hasFormChanged()
    {
        const currFormString = JSON.stringify(this.editVideoMetaDataForm?.value);
        const originalFormString = JSON.stringify(this.editFormOriginalValues);

        return currFormString !== originalFormString || this.newImageFile !== undefined
    }

    submitEditForVideoData(event : Event)
    {
        if(this.hasFormChanged() === false)
        {
          this.userMadeNoChanges = true;
          setTimeout(() =>
          {
            this.userMadeNoChanges = false;

          }, 3000);
          event.preventDefault();
          return console.log('form was not changed to be edited');
        }


        const videoId = this.activatedRoute.snapshot.paramMap.get('videoId');
        if(this.editVideoMetaDataForm && videoId)
        {

            this.videoService.patchEditVideo(parseInt(videoId, 10),this.editVideoMetaDataForm, this.newImageFile)
            .subscribe(
              {
                next : (changedVideo) =>
                {
                  this.videoService.saveVideoSelectedInMemory(changedVideo);

                  this.buildForm(changedVideo);

                  this.newImageFile = undefined;

                  console.log('Video passed the edit process')

                },
                error : (err) => console.error(err)
              }
            );
        }


        else
          console.error('The form was undefined on submit , check if was ever pupulated correctly');

    }

    openUpDeleteForm()
    {
      this.deleteVideoInputEnabled = !this.deleteVideoInputEnabled;

    }



    deleteInputValidation(event : Event)
    {
        const element = event.target as HTMLInputElement;
        const currentInputElment = element.value

        if(currentInputElment === 'DELETE')
          this.deleteValidationConfirmed = true;
        else
          this.deleteValidationConfirmed = false;

    }

    deleteVideo(videoId : number)
    {
      window.alert("deleting video button activated");

      this.videoService.deleteVideo(videoId)
      .subscribe
      (
        {
          next : () =>
          {
              sessionStorage.removeItem('selectedVideo');
              this.editVideoMetaDataForm = undefined;
              this.videoService.clearSelectedVIdeo();
              console.log('Server returned succesfully')

              const userId = this.authService.getUserIdFromToken();
              this.router.navigate(['user-profile/', userId]);

          },
          error : (err) =>
          {
            console.log(err);
          },


        }
      )

    }





}
