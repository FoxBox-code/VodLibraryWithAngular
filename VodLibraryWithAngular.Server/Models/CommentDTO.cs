namespace VodLibraryWithAngular.Server.Models
{
    public class CommentDTO
    {
        public int Id { get; set; }

        public string UserName { get; set; }

        public string UserNameId { get; set; }

        public string Description { get; set; }

        public int VideoRecordId { get; set; }

        public DateTime Uploaded { get; set; }

        public int Likes { get; set; }

        public int DisLikes { get; set; }

        public int RepliesCount { get; set; }

        public IEnumerable<ReplieDTO> Replies { get; set; } = new List<ReplieDTO>();




    }
}
