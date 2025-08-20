using VodLibraryWithAngular.Server.DataConstants;

namespace VodLibraryWithAngular.Server.Data.Models
{
    public class VideoRendition
    {
        public int Id { get; set; }

        public required VideoResEnum Resolution { get; set; }

        public required string RenditionPath { get; set; }


        public required int VideoRecordId { get; set; }

        public VideoRecord VideoRecord { get; set; }



    }
}
