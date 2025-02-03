import { Reply } from "./reply";

export interface Comment
{
    id : number,
    userName : string,
    description : string,
    videoRecordId : string,
    uploaded : string,
    likes : number,
    disLikes : number,
    repliesCount : number,
    replies : Reply[]
}



