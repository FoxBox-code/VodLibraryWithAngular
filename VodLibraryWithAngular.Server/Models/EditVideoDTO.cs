using System.Text.Json.Serialization;

namespace VodLibraryWithAngular.Server.Models
{
    public class EditVideoDTO
    {
        [JsonPropertyName("title")]
        public required string? Title { get; set; }

        [JsonPropertyName("description")]
        public string? Description { get; set; }

        [JsonPropertyName("categoryId")]
        public required int? CategoryId { get; set; }

        [JsonPropertyName("newImageString")]
        public string? NewImageString { get; set; }
    }
}
