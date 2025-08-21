
export interface PlayVideo
{
    id : number,
    title : string,
    description : string,
    uploaded : Date,
    duration : string,
    totalTimeInSeconds : number
    videoPath : string,
    videoOwnerId : string,
    videoOwnerName : string,
    videoOwnerProfileIcon : string,
    categoryName : string,
    views : number,
    likes : number,
    disLikes : number,
    totalCommentReplyCount : number,
    commentCount : number,
    videoOwnerSubscribersCount : number,
    videoRenditions : {[resolution : string] : string}

}


