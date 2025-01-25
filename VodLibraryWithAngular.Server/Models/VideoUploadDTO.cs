using System.ComponentModel.DataAnnotations;
using static VodLibraryWithAngular.Server.DataConstants.ConstantsCharacteristics.VideoRecordsConstants;

namespace VodLibraryWithAngular.Server.Models
{
    public class VideoUploadDTO
    {
        [StringLength(TitleMaxLength, MinimumLength = TitleMinLength, ErrorMessage = "{0} must be between {2} and {1}")]
        public required string Title { get; set; }

        [StringLength(DescriptionMaxLength, ErrorMessage = "{0} must be in range of {1} charachters")]
        public string? Description { get; set; }

        public required int CategoryId { get; set; }

        public required IFormFile VideoFile { get; set; }

        public required IFormFile ImageFile { get; set; }
    }
}
