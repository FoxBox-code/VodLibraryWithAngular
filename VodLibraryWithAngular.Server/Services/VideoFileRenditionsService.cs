using Microsoft.EntityFrameworkCore;
using VodLibraryWithAngular.Server.Data;
using VodLibraryWithAngular.Server.Data.Models;
using VodLibraryWithAngular.Server.Interfaces;


namespace VodLibraryWithAngular.Server.Services
{
    public class VideoFileRenditionsService
    {
        private ApplicationDbContext _context;
        private readonly IWebHostEnvironment _environment;
        private ILogger<VideoFileRenditionsService> _logger;
        public VideoFileRenditionsService(ApplicationDbContext context, IWebHostEnvironment environment, ILogger<VideoFileRenditionsService> logger)
        {
            _context = context;
            _environment = environment;
            _logger = logger;
        }

        async public Task RenditionExistingVideos()
        {
            List<VideoRecord> videoRecordsPaths = await _context.VideoRecords.ToListAsync();

            foreach (var video in videoRecordsPaths)
            {
                int videoId = video.Id;
                string folder = IFileNameSanitizer.CleanFolderName($"VideoId{video.Id} {video.Title.TrimEnd()}");
                string outPutPath = Path.Combine([_environment.WebRootPath, "videos", folder]);

                string videoPath = Path.Combine([_environment.WebRootPath, "videos", Path.GetFileName(video.VideoPath)]);
                List<string> renditionsPaths = await VideoRenditionEncoder.EncodeMp4VariantsAsync(videoPath, outPutPath);

                foreach (var ren in renditionsPaths)
                {
                    VideoRendition videoRendition = new VideoRendition()
                    {
                        RenditionPath = ren,
                        VideoRecordId = video.Id
                    };
                    await _context.AddAsync(videoRendition);
                }

            }

            await _context.SaveChangesAsync();

        }

        async public Task RenditionUploadedVideo(string videoPath, string videoTitle)
        {
            string folder = "VideoId";

            string outPutPath = Path.Combine([_environment.WebRootPath, "videos", $"{Guid.NewGuid()}"]);

            string definitiveVideoPath = Path.Combine([_environment.WebRootPath, "videos", $"{Path.GetFileName(videoPath)}"]);



        }

        private async Task RenditionPaths(string videoPath, string outPutPath)
        {
            List<string> renditionsPaths = await VideoRenditionEncoder.EncodeMp4VariantsAsync(videoPath, outPutPath);
        }
    }
}
