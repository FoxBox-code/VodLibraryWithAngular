using VodLibraryWithAngular.Server.Data;
using VodLibraryWithAngular.Server.Data.Models;

namespace VodLibraryWithAngular.Server.Interfaces
{
    public interface IVideoFileRenditionsService
    {
        public Task RenditionExistingVideos();

        public Task RenditionUploadedVideo(VideoRecord video);

        public (string input, string outPut) CreatePaths(int videoId, string videoTitle, string videoPath);

        public Task<string> GenerateFramesForVideo(VideoRecord video, string renditionFilePath);

        public Task GenerateSpriteSheetsForVideo(VideoRecord video, string renditionFilePath, string framesPath, ApplicationDbContext? context);



    }
}
