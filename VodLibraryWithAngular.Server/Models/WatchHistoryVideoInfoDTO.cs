namespace VodLibraryWithAngular.Server.Models
{
    public class WatchHistoryVideoInfoDTO
    {
        public int VideoId { get; set; }
        public DateTime WatchedOn { get; set; }

        public VideoWindowDTO Video { get; set; }

    }
}
