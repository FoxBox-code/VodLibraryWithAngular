using System.Text.Json.Serialization;

namespace VodLibraryWithAngular.Server.Models
{
    public class SubscribingDTO
    {
        [JsonPropertyName("followerId")]
        public required string FollowerId { get; set; }

        [JsonPropertyName("followerUserName")]
        public required string FollowerUserName { get; set; }

        [JsonPropertyName("subscribedToId")]
        public required string SubscribedToId { get; set; }

        [JsonPropertyName("subscribedToUserName")]
        public required string SubscribedToUserName { get; set; }
    }
}
