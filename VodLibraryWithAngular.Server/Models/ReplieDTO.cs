using System.ComponentModel.DataAnnotations;

namespace VodLibraryWithAngular.Server.Models
{
    public class ReplieDTO
    {
        public int Id { get; set; }

        public string UserName { get; set; }

        [Required]
        public string UserId { get; set; }

        public string UserProfilePic { get; set; }

        public string Description { get; set; }

        public int VideoRecordId { get; set; }

        public int CommentId { get; set; }

        public DateTime Uploaded { get; set; }

        public int Likes { get; set; }

        public int DisLikes { get; set; }

    }
}
