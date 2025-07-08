namespace VodLibraryWithAngular.Server.Models
{
    public class UserReplyReactions
    {
        public int VideoId { get; set; }

        public int CommentId { get; set; }

        public int ReplyId { get; set; }
        public bool Like { get; set; }
    }
}
