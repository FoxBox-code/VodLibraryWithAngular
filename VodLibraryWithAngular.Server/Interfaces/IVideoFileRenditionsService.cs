using VodLibraryWithAngular.Server.Data.Models;

namespace VodLibraryWithAngular.Server.Interfaces
{
    public interface IVideoFileRenditionsService
    {
        public Task RenditionExistingVideos();

        public Task RenditionUploadedVideo(VideoRecord video);



    }
}
