using Microsoft.AspNetCore.Identity;
using VodLibraryWithAngular.Server.Data.Models;

namespace VodLibraryWithAngular.Server.Data
{
    public class ApplicationUser : IdentityUser
    {
        public ICollection<VideoLikesDislikes> LikeDislikesStats { get; set; }

        public ICollection<UserWatchHistory> UserWatchHistories { get; set; }

        public ICollection<Subscriber> Followers { get; set; }

        public ICollection<Subscriber> Following { get; set; }

        public DateTime? registeredOn { get; set; } = DateTime.UtcNow;

        public string? profilePic { get; set; }

    }
}
