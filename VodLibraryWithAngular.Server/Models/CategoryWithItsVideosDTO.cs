using System.Collections;

namespace VodLibraryWithAngular.Server.Models
{
    public class CategoryWithItsVideosDTO
    {
        public int Id { get; set; }

        public string Name { get; set; }

        public IEnumerable Videos { get; set; } = new List<VideoWindowDTO>();

    }
}
