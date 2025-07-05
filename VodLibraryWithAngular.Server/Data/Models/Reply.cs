using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;
using static VodLibraryWithAngular.Server.DataConstants.ConstantsCharacteristics.CommentConstants;

namespace VodLibraryWithAngular.Server.Data.Models
{
    public class Reply
    {
        public int Id { get; set; }

        [Required]
        public string UserName { get; set; }


        [Required]
        [MaxLength(CommentDescriptionMaxLength)]
        public string Description { get; set; }

        public int CommentId { get; set; }

        [JsonIgnore] // Ignore during serialization
        public Comment Comment { get; set; }

        public DateTime Uploaded { get; set; } = DateTime.UtcNow;

        public ICollection<RepliesLikesDisLikes> LikesDisLikes = new List<RepliesLikesDisLikes>();

        public int VideoRecordId { get; set; }
        public VideoRecord VideoRecord { get; set; }
    }
}
