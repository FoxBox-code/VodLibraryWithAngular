namespace VodLibraryWithAngular.Server.Models
{
    public class ProfilesFollowingDTO
    {
        public required string UserName { get; set; }

        public required string Id { get; set; }

        public required DateTime SubscribedOn { get; set; }

        public required string UesrImageIcon { get; set; }


    }
}
