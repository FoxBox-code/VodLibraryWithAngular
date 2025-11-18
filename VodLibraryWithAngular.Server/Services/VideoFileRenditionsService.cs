using Microsoft.EntityFrameworkCore;
using VodLibraryWithAngular.Server.Data;
using VodLibraryWithAngular.Server.Data.Models;
using VodLibraryWithAngular.Server.DataConstants;
using VodLibraryWithAngular.Server.Interfaces;


namespace VodLibraryWithAngular.Server.Services
{
    public class VideoFileRenditionsService : IVideoFileRenditionsService
    {

        private readonly IWebHostEnvironment _environment;
        private ILogger<IVideoFileRenditionsService> _logger;
        private IServiceScopeFactory _scopeFactory;
        public VideoFileRenditionsService(IWebHostEnvironment environment, ILogger<IVideoFileRenditionsService> logger, IServiceScopeFactory scopeFactory)
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

                string videoRenditionPath = await RenditionPaths(input, outPut, video, dbContext);
                _logger.LogInformation("pass the awaiter RenditionPaths");

                string framesPath = await GenerateFramesForVideo(video, videoRenditionPath);
                _logger.LogInformation($"Generate Frame For videos completed at RenditionUploadedVideo method");

                await GenerateSpriteSheetsForVideo(video, videoRenditionPath, framesPath, dbContext);

                video.Status = DataConstants.VideoStatusEnum.Complete;
                video.Ended = DateTimeOffset.UtcNow;
                await dbContext.SaveChangesAsync();
            }
            catch (Exception ex)
            {
                video.Status = DataConstants.VideoStatusEnum.Failed;
                video.ProcessingError = $"{ex.Message}";
                _logger.LogError(ex.Message);
                await dbContext.SaveChangesAsync();//save the error message to db;
                throw new Exception($"{ex.Message}, Failed to rendition from the given video");
            }


        }

        //This was private but had to make it publllic for dataMigraion service
        public (string input, string outPut) CreatePaths(int videoId, string videoTitle, string videoPath)
        {

            string folder = IFileNameSanitizer.CleanFolderOrFileName($"VideoId{videoId} {videoTitle.TrimEnd()}");
            string outPutPath = Path.Combine([_environment.WebRootPath, "videos", folder]);

            string input = Path.Combine([_environment.WebRootPath, "videos", Path.GetFileName(videoPath)]);

            return (input, outPutPath);
        }

        private async Task<string> RenditionPaths(string input, string output, VideoRecord video, ApplicationDbContext dbContext)
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

            return renditionsPaths.Values.First();
        }

        public async Task<string> GenerateFramesForVideo(VideoRecord video, string renditionFilePath)
        {
            string renditionFolder = Path.GetDirectoryName(renditionFilePath);

            string outPutDirectory = Path.Combine(renditionFolder, "Thumbnail Frames");

            Directory.CreateDirectory(outPutDirectory);

            string ffmpegFramesArguments = $"-i \"{video.VideoPath}\" -vf fps=1,scale=160:-1 \"{Path.Combine(outPutDirectory, "frame_%05d.jpg")}\"";

            int exitCode = await FfmpegRunner.RunMpegAsync(ffmpegFramesArguments);

            if (exitCode != 0)
            {
                _logger.LogError($"FfmpegRunner Generation frame for video failed for {video}, its path was {renditionFolder}");
                throw new Exception($"FfmpegRunner Generation frame for video failed for {video}, its path was {renditionFolder}");
            }

            return outPutDirectory;
        }

        public async Task GenerateSpriteSheetsForVideo(VideoRecord video, string renditionFilePath, string framesPath, ApplicationDbContext? context)
        {
            string renditionFolder = Path.GetDirectoryName(renditionFilePath);
            string spriteSheetFolder = Path.Combine(renditionFolder, "Sprite Sheets");

            Directory.CreateDirectory(spriteSheetFolder);

            string[] frames = Directory.GetFiles(framesPath, "frame_*.jpg");

            int spriteSheetIndex = 0;
            int spriteSheetCapacity = 50;
            for (int i = 0; i < frames.Length; i += spriteSheetCapacity)
            {
                string[] currentBatch = frames.Skip(i).Take(50).ToArray();

                string txtPath = Path.Combine(spriteSheetFolder, $"spriteSheet{spriteSheetIndex}.txt");
                string spriteBatchJpg = Path.Combine(spriteSheetFolder, $"spriteSheet{spriteSheetIndex}.jpg");

                await File.WriteAllLinesAsync(txtPath, currentBatch.Select(line => $"file '{line.Replace("\\", "/")}'"));//high possibility of typo or invalid mpeg standard format

                string spriteArgs = $"-f concat -safe 0 -i \"{txtPath}\" -vf \"tile=10x5\" \"{spriteBatchJpg}\"";

                int exitCode = await FfmpegRunner.RunMpegAsync(spriteArgs);
                if (exitCode != 0)
                {
                    _logger.LogError($"FfmpegRunner Generation sprite sheet failed for {video}, its path was {renditionFolder}, the failure happened at batchIndex {spriteSheetIndex}");
                    throw new Exception($"FfmpegRunner Generation sprite sheet failed for {video}, its path was {renditionFolder}, the failure happened at batchIndex {spriteSheetIndex}");
                }
                spriteSheetIndex++;

            }


            if (context != null)
            {
                int numberOfSprites = video.Length.Seconds / 50;
                VideoSpriteMetaData spriteSheet = new VideoSpriteMetaData()
                {
                    Name = $"{video.Title} spriteSheet",
                    VideoRecordId = video.Id,
                    DirectoryPath = spriteSheetFolder,
                    NumberOfSprites = numberOfSprites,
                };

                await context.VideoSpritesMetaData.AddAsync(spriteSheet);
            }


        }
    }
}
