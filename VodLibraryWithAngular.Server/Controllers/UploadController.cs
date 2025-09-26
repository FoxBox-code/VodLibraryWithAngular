using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using NuGet.Protocol;
using System.Security.Claims;
using VodLibraryWithAngular.Server.Data;
using VodLibraryWithAngular.Server.Data.Models;
using VodLibraryWithAngular.Server.DataConstants;
using VodLibraryWithAngular.Server.Interfaces;
using VodLibraryWithAngular.Server.Models;
using VodLibraryWithAngular.Server.Services;

namespace VodLibraryWithAngular.Server.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class UploadController : ControllerBase
    {

        private readonly IWebHostEnvironment _environment;
        private readonly IFileNameSanitizer _fileNameSanitizer;
        private readonly ILogger<UploadController> _logger;
        private readonly ApplicationDbContext _dbContext;
        private readonly IVideoFileRenditionsService _videoFileRenditionsService;
        private readonly DTOTransformer _dtoTransformer;
        public UploadController(IWebHostEnvironment env, IFileNameSanitizer fns, ILogger<UploadController> logger, ApplicationDbContext dbContext,
            IVideoFileRenditionsService videoFileRenditionsService, DTOTransformer dtoTransformer)
        {
            _environment = env;
            _fileNameSanitizer = fns;
            _logger = logger;
            _dbContext = dbContext;
            _videoFileRenditionsService = videoFileRenditionsService;
            _dtoTransformer = dtoTransformer;
        }
        [Authorize]
        [HttpPost("video")]
        [RequestSizeLimit(209715200)] //200MB
        public async Task<IActionResult> UploadVideo([FromForm] VideoUploadDTO videoUploadForm)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(new { message = "Invalid Model", error = ModelState.Values.SelectMany(e => e.Errors).Select(e => e.ErrorMessage) });
            }

            try
            {

                string videoPath = Path.Combine(_environment.WebRootPath, "videos", Guid.NewGuid() + _fileNameSanitizer.SanitizeFileNameFromUrl(videoUploadForm.VideoFile.FileName));
                string thumbnail = Path.Combine(_environment.WebRootPath, "thumbnail", Guid.NewGuid() + _fileNameSanitizer.SanitizeFileNameFromUrl(videoUploadForm.ImageFile.FileName)); // Guid.NewGuid generates unique names in order to prevent colliding

                var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

                if (string.IsNullOrEmpty(userId))
                {
                    return Unauthorized("You are not authorized to upload videos!");
                }

                using (FileStream videoStream = new FileStream(videoPath, FileMode.Create))
                {
                    await videoUploadForm.VideoFile.CopyToAsync(videoStream);
                }



                //using (FileStream imageStream = new FileStream(thumbnail, FileMode.Create))
                //{
                //    await videoUploadForm.ImageFile.CopyToAsync(imageStream);
                //} use library ImageSharp to format the given image from the user to selected sizes 

                using Image image = await SixLabors.ImageSharp.Image.LoadAsync(videoUploadForm.ImageFile.OpenReadStream());
                image.Mutate(x => x.Resize(480, 360));

                await using FileStream outPutStream = new FileStream(thumbnail, FileMode.Create);
                await image.SaveAsJpegAsync(outPutStream);//We only work with JPegs for now

                var mediaInfo = await Xabe.FFmpeg.FFmpeg.GetMediaInfo(videoPath); // NO IDEA HOW THIS LIBRARY WORKS
                var videoDuration = mediaInfo.VideoStreams.First().Duration;

                VideoRecord video = new VideoRecord()
                {
                    Title = videoUploadForm.Title,
                    Description = videoUploadForm.Description,
                    CategoryId = videoUploadForm.CategoryId,
                    VideoPath = videoPath,
                    ImagePath = thumbnail,
                    Uploaded = DateTime.UtcNow,
                    Views = 0,
                    CommentsCount = 0,
                    ReplyCount = 0,
                    Length = videoDuration,
                    VideoOwnerId = userId,



                };

                Category category = await _dbContext.Categories.FirstOrDefaultAsync(x => x.Id == video.CategoryId);

                if (category == null)
                {
                    _logger.LogInformation($"The added video was made with an unknown category id {video.CategoryId}");
                    return BadRequest(new
                    {
                        message = "Unable to create video invalid category"
                    });
                }

                category.VideosCount++;

                await _dbContext.VideoRecords.AddAsync(video);
                await _dbContext.SaveChangesAsync();


                VideoRecord? latestVideo = await _dbContext.VideoRecords.Include(v => v.VideoOwner).FirstOrDefaultAsync(v => v.VideoOwnerId == userId && v.Uploaded == video.Uploaded);

                if (latestVideo == null)
                {
                    _logger.LogError($"The video the user uploaded {video.ToJson()} was created in the db but retrieving it with the user id and the uploaded date was not successful");
                    return BadRequest("Video failed to add");
                }

                _ = Task.Run(async () =>
                {

                    await _videoFileRenditionsService.RenditionUploadedVideo(latestVideo);

                });


                VideoWindowDTO videoWindowDTO = _dtoTransformer.CreateVideoWindowDTOFromVideoRecord(latestVideo);


                return Ok(new
                {
                    Status = video.Status,
                    videoId = video.Id
                }
                );
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Failed to post video to VODLibrary", error = ex.Message });
            }

        }

        [HttpGet("polling/videoStatus")]
        public async Task<IActionResult> GetStatusForVideo([FromQuery] int videoId)
        {
            _logger.LogInformation($"Entering getStatusForvideos with {videoId}");
            var video = await _dbContext.VideoRecords.Include(x => x.VideoRenditions).FirstOrDefaultAsync(x => x.Id == videoId);

            if (video == null)
            {
                _logger.LogInformation($"During GetStatusForVideo the video requested with id {videoId} was not found");
                return NotFound("Video was not found");
            }
            else if (video.Status != VideoStatusEnum.Complete)
            {
                return Ok(new
                { status = video.Status });

            }

            VideoWindowDTO videoWindowDTO = _dtoTransformer.CreateVideoWindowDTOFromVideoRecord(video);


            return Ok(new { status = video.Status, videWindowDto = videoWindowDTO });




        }

        [HttpGet("get-video-window")]////This is a HARDCODED API request to see visually how the poping element will in Upload Component
        public async Task<IActionResult> GetVideoWindow()
        {
            VideoRecord video = await _dbContext.VideoRecords.Include(v => v.VideoOwner).FirstAsync(v => v.Id == 14);

            VideoWindowDTO res = _dtoTransformer.CreateVideoWindowDTOFromVideoRecord(video);

            return Ok(res);
        }
    }
}
