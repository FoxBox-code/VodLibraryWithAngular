namespace VodLibraryWithAngular.Server.Models
{
    public class CommentDTO
    {

        public required int Id { get; set; }


        public required string UserName { get; set; }


        public required string UserId { get; set; }


        public required string UserIcon { get; set; }


        public required string Description { get; set; }


        public required int VideoRecordId { get; set; }


        public required DateTime Uploaded { get; set; }

        public int Likes { get; set; }

        public int DisLikes { get; set; }


        public int RepliesCount { get; set; }

        public IEnumerable<ReplieDTO> Replies { get; set; } = new List<ReplieDTO>();




    }
}
