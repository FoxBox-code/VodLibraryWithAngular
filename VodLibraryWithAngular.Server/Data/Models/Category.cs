using System.ComponentModel.DataAnnotations;
using static VodLibraryWithAngular.Server.DataConstants.ConstantsCharacteristics.ChategoryConstants;

namespace VodLibraryWithAngular.Server.Data.Models
{
    public class Category
    {
        public int Id { get; set; }

        [Required]
        [MaxLength(CategoryNameMaxLength, ErrorMessage = "{0} must contain a max of {1} symbols")]
        public string Name { get; set; }

        public IEnumerable<VideoRecord> Videos { get; set; } = new List<VideoRecord>();
    }
}
