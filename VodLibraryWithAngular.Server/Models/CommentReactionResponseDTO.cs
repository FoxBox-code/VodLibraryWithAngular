namespace VodLibraryWithAngular.Server.Models
{
    public class CommentReactionResponseDTO
    {
        public int CommentId { get; set; }
        public int LikeCount { get; set; }
        public int DislikeCount { get; set; }

        public bool? Like { get; set; }
    }
}
