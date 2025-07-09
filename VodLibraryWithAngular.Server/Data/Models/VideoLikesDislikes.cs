namespace VodLibraryWithAngular.Server.Data.Models
{
    public class VideoLikesDislikes
    {
        public int Id { get; set; }

        public int VideoId { get; set; }

        public string UserId { get; set; }

        public bool Liked { get; set; }

        public DateTime TimeOfLike { get; set; }

        public VideoRecord Video { get; set; }

        public ApplicationUser User { get; set; }
    }
}
