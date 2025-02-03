namespace VodLibraryWithAngular.Server.Models
{
    public class AddCommentDTO
    {
        public string UserName { get; set; }

        public string Description { get; set; }

        public int VideoRecordId { get; set; }
    }
}
