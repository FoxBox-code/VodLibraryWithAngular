namespace VodLibraryWithAngular.Server.Data.Models
{
    public class RepliesLikesDisLikes
    {
        public int Id { get; set; }

        public int ReplyId { get; set; }

        public string UserId { get; set; }

        public bool Like { get; set; }

        public Reply Reply { get; set; }
        public ApplicationUser User { get; set; }
    }
}
