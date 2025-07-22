namespace VodLibraryWithAngular.Server.Models
{
    public class CategoryWithItsVideosDTO
    {
        public int Id { get; set; }

        public string Name { get; set; }

        public IEnumerable<VideoWindowDTO> Videos { get; set; } = new List<VideoWindowDTO>();

    }
}
