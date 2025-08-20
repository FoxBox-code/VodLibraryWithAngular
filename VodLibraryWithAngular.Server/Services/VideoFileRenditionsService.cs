using Microsoft.EntityFrameworkCore;
using VodLibraryWithAngular.Server.Data;
using VodLibraryWithAngular.Server.Data.Models;
using VodLibraryWithAngular.Server.DataConstants;
using VodLibraryWithAngular.Server.Interfaces;


namespace VodLibraryWithAngular.Server.Services
{
    public class VideoFileRenditionsService
    {

        private readonly IWebHostEnvironment _environment;
        private ILogger<VideoFileRenditionsService> _logger;
        private IServiceScopeFactory _scopeFactory;
        public VideoFileRenditionsService(IWebHostEnvironment environment, ILogger<VideoFileRenditionsService> logger, IServiceScopeFactory scopeFactory)
        {

            _environment = environment;
            _logger = logger;
            _scopeFactory = scopeFactory;
        }

        async public Task RenditionExistingVideos()
        {
            using IServiceScope scope = _scopeFactory.CreateScope();
            var dbContext = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            List<VideoRecord> videoRecordsPaths = await dbContext.VideoRecords.ToListAsync();

            foreach (var video in videoRecordsPaths)
            {


                if (video.Status != VideoStatusEnum.Complete)
                    await RenditionUploadedVideo(video: video);
            }






        }

        async public Task RenditionUploadedVideo(VideoRecord video)
        {
            using IServiceScope scope = _scopeFactory.CreateScope();
            var dbContext = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            dbContext.Attach(video);//video controller passes a videoRecord object we need to track it constantly trough the scope of scopeFactory


            var (input, outPut) = CreatePaths(video.Id, video.Title, video.VideoPath);


            try
            {
                video.Status = DataConstants.VideoStatusEnum.Processing;

                await RenditionPaths(input, outPut, video, dbContext);
                _logger.LogInformation("pass the awaiter RenditionPaths");

                video.Status = DataConstants.VideoStatusEnum.Complete;
                video.Ended = DateTimeOffset.UtcNow;
                await dbContext.SaveChangesAsync();
            }
            catch (Exception ex)
            {
                video.Status = DataConstants.VideoStatusEnum.Failed;
                video.ProcessingError = $"{ex.Message}";
                _logger.LogError("Failed to process of rendering was not finished, check folder if the video exists there might be other problems occurring");
                await dbContext.SaveChangesAsync();//save the error message to db;
                throw new Exception($"{ex.Message}, Failed to rendition from the given video");
            }


        }

        private (string input, string outPut) CreatePaths(int videoId, string videoTitle, string videoPath)
        {

            string folder = IFileNameSanitizer.CleanFolderName($"VideoId{videoId} {videoTitle.TrimEnd()}");
            string outPutPath = Path.Combine([_environment.WebRootPath, "videos", folder]);

            string input = Path.Combine([_environment.WebRootPath, "videos", Path.GetFileName(videoPath)]);

            return (input, outPutPath);
        }

        private async Task RenditionPaths(string input, string output, VideoRecord video, ApplicationDbContext dbContext)
        {

            Dictionary<VideoResEnum, string> renditionsPaths = await VideoRenditionEncoder.EncodeMp4VariantsAsync(input, output);

            foreach (var ren in renditionsPaths)
            {
                VideoRendition videoRendition = new VideoRendition()
                {
                    Resolution = ren.Key,
                    RenditionPath = ren.Value,
                    VideoRecordId = video.Id
                };

                _logger.LogInformation($"current video rendition {videoRendition}");


                await dbContext.VideoRenditions.AddAsync(videoRendition);

            }


        }
    }
}
