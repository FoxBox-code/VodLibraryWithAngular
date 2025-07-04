namespace VodLibraryWithAngular.Server.Models
{
    public class ReactionResponseDto
    {
        public int VideoId { get; set; }
        public int LikeCount { get; set; }
        public int DisLikeCount { get; set; }
        public string Reaction { get; set; }
    }

}
