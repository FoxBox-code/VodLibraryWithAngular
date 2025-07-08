namespace VodLibraryWithAngular.Server.Models
{
    public class ReplyLikeDislikeCountUpdateDTO
    {
        public int ReplyId { get; set; }

        public int LikeCount { get; set; }

        public int DislikeCount { get; set; }
    }
}
