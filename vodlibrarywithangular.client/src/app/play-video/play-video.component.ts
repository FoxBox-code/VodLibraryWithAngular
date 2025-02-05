import { Component, Inject, inject} from '@angular/core';
import { VideoService } from '../video.service';
import { PlayVideo } from '../models/play-video';
import { ActivatedRoute } from '@angular/router';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { AuthService } from '../auth.service';
import { Observable } from 'rxjs';
import { NavigationService } from '../navigation.service';
import { Router } from '@angular/router';
import { AddCommentDTO } from '../models/add-comment';
import { VideoComment } from '../models/comment';


@Component({
  selector: 'app-play-video',
  standalone: false,

  templateUrl: './play-video.component.html',
  styleUrl: './play-video.component.css'
})
export class PlayVideoComponent
{
    selectedVideo : PlayVideo | null = null;
    selectedVideoId : number;
    commentForm : FormGroup;
    commentsCount : number = 0;//THIS WONT CUT IT
    commentsCountObservable : Observable<number>
    userNameAsObservable : Observable<string | null>;
    userName : string | null = null;
    nagivationService = inject(NavigationService);
    router = inject(Router);
    videoComments? : VideoComment[];
    autoLoadComments : boolean = false;

    constructor(private videoService : VideoService, private activatedRoute:ActivatedRoute, formBuilder : FormBuilder, private authService : AuthService)
    {
        this.selectedVideoId = Number(this.activatedRoute.snapshot.paramMap.get('id'));

        videoService.getCurrentVideo(this.selectedVideoId).subscribe(
        {
            next : (result) =>
            {
                this.selectedVideo = result;
                console.log(JSON.stringify(this.selectedVideo));
            }



        })

        this.commentForm = formBuilder.group(
        {
            Comment : ['', [Validators.required]]
        });

        this.userNameAsObservable = authService.getUserNameAsOservable();
        this.userNameAsObservable.subscribe(value =>
          {
            this.userName = value;
            console.log(`Current name of user is : ${this.userName}`);


          })

        videoService.getCommentsCount(this.selectedVideoId);
        this.commentsCountObservable = videoService.commentsCount$;


    }
    addComment()
    {
        if(this.commentForm.invalid)
        {
            console.error("Invalid commonet form ");

        }
        else
        {
          let addCommentDTO: AddCommentDTO =
          {
            userName: '',  // default empty string
            description: '',   // default empty string
            videoRecordId: 0,
            // initialize other properties as needed

          };


          if(this.userName !== null)
            {
              addCommentDTO.userName = this.userName ;
            }
              addCommentDTO.description = this.commentForm.value.Comment;
              addCommentDTO.videoRecordId = this.selectedVideoId;

              this.videoService.addComment(addCommentDTO).subscribe(
              {
                next : (result) => {
                  console.log(`User ${result.userName} commented : ${result.description}`);
                  this.videoService.refreshCommentsCount(this.selectedVideoId);
                },
                error : (error) => console.error(`User ${addCommentDTO.userName} failed to upload comment ${error}`)
              });

              this.commentForm.reset();

              if(this.autoLoadComments)
              {
                this.loadComments();
              }




        }


    }


    loadComments()
    {
        this.autoLoadComments = true;
        this.videoService.getVideoComments(this.selectedVideoId).subscribe(
        {
            next : (result) => this.videoComments = result
        });
    }

    navigateToLogIn()
    {
        this.nagivationService.updateAdress(this.router.url);
        console.log(`Changing router to ${this.router.url}`);

        this.router.navigate(['login']);
    }


}
