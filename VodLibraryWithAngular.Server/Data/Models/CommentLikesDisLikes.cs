namespace VodLibraryWithAngular.Server.Data.Models
{
    public class CommentLikesDisLikes
    {
        public int Id { get; set; }

        public int CommentId { get; set; }

        public string UserId { get; set; }

        public bool Like { get; set; }

        public Comment Comment { get; set; }
        public ApplicationUser User { get; set; }

    }
}
