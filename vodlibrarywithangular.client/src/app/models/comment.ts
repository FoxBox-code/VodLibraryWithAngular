import { Reply } from "./reply";

export interface VideoComment
{
    id : number,
    userName : string,
    userId : string,
    description : string,
    videoRecordId : string,
    uploaded : Date,
    likes : number,
    disLikes : number,
    repliesCount : number,

}



