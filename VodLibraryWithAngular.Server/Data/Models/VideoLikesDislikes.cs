using System.ComponentModel.DataAnnotations;

namespace VodLibraryWithAngular.Server.Data.Models
{
    public class VideoLikesDislikes
    {
        public int Id { get; set; }

        [Required]
        public int VideoId { get; set; }


        public string VideoTitle { get; set; }

        [Required]
        public string UserId { get; set; }

        [Required]
        public string UserName { get; set; }
        public bool Liked { get; set; }

        [Required]
        public DateTime TimeOfLike { get; set; }

        public VideoRecord Video { get; set; }


        public ApplicationUser User { get; set; }
    }
}
