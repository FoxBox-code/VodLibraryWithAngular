using System.ComponentModel.DataAnnotations;
using static VodLibraryWithAngular.Server.DataConstants.ConstantsCharacteristics.VideoRecordsConstants;

namespace VodLibraryWithAngular.Server.Data.Models
{
    public class VideoRecord
    {
        public int Id { get; set; }

        [Required]
        [StringLength(TitleMaxLength, MinimumLength = TitleMinLength, ErrorMessage = "{0} must be between {2} and {1} charachters long")]
        public string Title { get; set; }

        [Required]
        public DateTime Uploaded { get; set; }

        [StringLength(DescriptionMaxLength, ErrorMessage = "The description cannot be longer than 5000 charachters")]
        public string? Description { get; set; }

        [Required]
        [Range(0, MaxVideoTicks, ErrorMessage = "Video must be between 0 or 24 hours")]
        public TimeSpan Length { get; set; }

        public int CategoryId { get; set; }

        public Category Category { get; set; }

        public int Views { get; set; }

        public ICollection<VideoLikesDislikes> LikeDislikeStats { get; set; }

        [Required]
        public string VideoOwnerId { get; set; }

        public ApplicationUser VideoOwner { get; set; }

        public string VideoPath { get; set; } //this is the URL for the video that will be in the DataBase

        public string ImagePath { get; set; } // this will provide thumbnail picture 

        public ICollection<Comment> Comments { get; set; } = new List<Comment>();

        public int CommentsCount { get; set; }

        public ICollection<Reply> Replies { get; set; } = new List<Reply>();

        public int ReplyCount { get; set; }

        public ICollection<UserWatchHistory> WatchHistories { get; set; }

        public IEnumerable<VideoRendition> VideoRenditions { get; set; }

    }
}
