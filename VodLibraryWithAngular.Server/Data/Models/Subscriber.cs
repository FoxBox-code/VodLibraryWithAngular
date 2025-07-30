namespace VodLibraryWithAngular.Server.Data.Models
{
    public class Subscriber
    {
        public int Id { get; set; }

        public required string FollowerId { get; set; }

        public required string FollowerUserName { get; set; }

        public ApplicationUser Follower { get; set; }

        public required string SubscribedId { get; set; }
        public required string SubscribedUserName { get; set; }

        public ApplicationUser Subscribed { get; set; }

        public required DateTime SubscribedOn { get; set; } = DateTime.UtcNow;
    }
}
