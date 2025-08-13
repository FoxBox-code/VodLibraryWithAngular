using System.ComponentModel.DataAnnotations;

namespace VodLibraryWithAngular.Server.Models
{
    public class VideoLikesDislikeCountDTO
    {
        [Required]
        public int Likes { get; set; } = 0;

        [Required]
        public int Dislikes { get; set; } = 0;
    }
}
