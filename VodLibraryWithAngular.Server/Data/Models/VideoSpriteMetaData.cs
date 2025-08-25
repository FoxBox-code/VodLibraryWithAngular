namespace VodLibraryWithAngular.Server.Data.Models
{
    public class VideoSpriteMetaData
    {
        public int Id { get; set; }

        public string Name { get; set; }
        public int VideoRecordId { get; set; }
        public VideoRecord VideoRecord { get; set; }

        public int NumberOfSprites { get; set; }

        public int NumberOfFrames { get; set; } = 50;

        public int NumberOfFramesPerSecond { get; set; } = 1;

        public int FrameWidth = 160;

        public int FrameHeight = 90;

        public int SpriteWidth = 1600;

        public int SpriteHeight = 450;

        public int Cols = 10;

        public int Rows = 5;

        public string DirectoryPath { get; set; }


    }
}
