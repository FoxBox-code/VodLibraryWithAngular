export interface Reply
{
    id : number,
    userName : string,
    userId : string,
    userProfilePic : string,
    description : string,
    videoRecordId : number,
    commentId : number,
    uploaded : Date,//return to string if lots of stuff gets broken
    likes : number,
    disLikes : number

}


