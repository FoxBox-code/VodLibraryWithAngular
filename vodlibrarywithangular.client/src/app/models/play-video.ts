import { Comment } from "./comment"

export interface PlayVideo
{
    id : number,
    title : string,
    description : string,
    uploaded : string,
    videoPath : string,
    videoOwnerId : string,
    videoOwnerName : string,
    categoryName : string,
    views : number,
    likes : number,
    disLikes : number,
    commentCount : 0,
    comments : Comment[]
}


