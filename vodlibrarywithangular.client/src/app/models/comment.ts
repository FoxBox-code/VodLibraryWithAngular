import { Reply } from "./reply";

export interface VideoComment
{
    id : number,
    userName : string,
    description : string,
    videoRecordId : string,
    uploaded : string,
    likes : number,
    disLikes : number,
    repliesCount : number,

}



