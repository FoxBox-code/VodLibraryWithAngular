namespace VodLibraryWithAngular.Server.Models
{
    public class VideoWindowDTO
    {
        public required int Id { get; set; }

        public required string Title { get; set; }

        public DateTime Uploaded { get; set; }

        public TimeSpan Length { get; set; }

        public int Hours { get; set; }
        public int Minutes { get; set; }

        public int Seconds { get; set; }

        public int Views { get; set; }

        public required int CategoryId { get; set; }
        public required string CategoryName { get; set; }

        public required string VideoOwnerId { get; set; }
        public required string VideoOwnerName { get; set; }

        public required string ImagePath { get; set; }

        public required string? Description { get; set; }
    }
}
