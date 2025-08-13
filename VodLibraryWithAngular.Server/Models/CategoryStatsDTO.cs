using System.ComponentModel.DataAnnotations;

namespace VodLibraryWithAngular.Server.Models
{
    public class CategoryStatsDTO
    {
        [Required]
        public int Id { get; set; }
        [Required]
        public string Name { get; set; }
        [Required]
        public int VideosCount { get; set; }

        [Required]
        public string ImagePath { get; set; }
    }
}
