namespace VodLibraryWithAngular.Server.Models
{
    public class PlayVideoDTO
    {
        public int Id { get; set; }

        public string Title { get; set; }

        public string Description { get; set; }

        public DateTime Uploaded { get; set; }

        public TimeSpan Duration { get; set; }

        public double TotalTimeInSeconds { get; set; }

        public string VideoPath { get; set; }

        public string VideoOwnerId { get; set; }

        public string VideoOwnerName { get; set; }

        public string VideoOwnerProfileIcon { get; set; }

        public int VideoOwnerSubscribersCount { get; set; }

        public string CategoryName { get; set; }

        public int Views { get; set; }

        public int Likes { get; set; }

        public int DisLikes { get; set; }

        public int TotalCommentReplyCount { get; set; }

        public int CommentCount { get; set; }

        public IEnumerable<CommentDTO> Comments { get; set; } = new List<CommentDTO>();

        public IDictionary<string, string> VideoRenditions { get; set; }

        public string SpriteSheet { get; set; } = string.Empty;

        public string? SpriteSheetBasePath { get; set; }

        public int SpriteSheetIndex { get; set; } = 0;

        public int SpriteSheetsCount { get; set; }


    }
}
