namespace VodLibraryWithAngular.Server.Data.Models
{
    public class UserWatchHistory
    {
        public int Id { get; set; }

        public string UserId { get; set; }

        public int VideoId { get; set; }

        DateTime WatchedOn { get; set; }
        public ApplicationUser User { get; set; }

        public VideoRecord Video { get; set; }


    }
}
