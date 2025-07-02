using Microsoft.AspNetCore.Identity;
using VodLibraryWithAngular.Server.Data.Models;

namespace VodLibraryWithAngular.Server.Data
{
    public class ApplicationUser : IdentityUser
    {
        public ICollection<VideoLikesDislikes> LikeDislikesStats { get; set; }
    }
}
