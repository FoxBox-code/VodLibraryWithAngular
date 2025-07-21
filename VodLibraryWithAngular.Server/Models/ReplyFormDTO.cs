namespace VodLibraryWithAngular.Server.Models
{
    public class ReplyFormDTO
    {
        public required string UserName { get; set; }

        public required string ReplyContent { get; set; }

        public required int VideoId { get; set; }

        public required int CommentId { get; set; }

        public required DateTime Uploaded { get; set; }

    }


}
