namespace VodLibraryWithAngular.Server.Models
{
    public class VideoWindowDTO
    {
        public int Id { get; set; }

        public required string Title { get; set; }

        public DateTime Uploaded { get; set; }

        public TimeSpan Length { get; set; }

        public int Views { get; set; }

        public required string VideoOwnerId { get; set; }
        public required string VideoOwnerName { get; set; }

        public required string ImagePath { get; set; }
    }
}
