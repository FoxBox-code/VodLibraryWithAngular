using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.Security.Claims;
using VodLibraryWithAngular.Server.Data;
using VodLibraryWithAngular.Server.Data.Models;
using VodLibraryWithAngular.Server.Models;


namespace VodLibraryWithAngular.Server.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class VideoController : ControllerBase
    {
        private readonly ApplicationDbContext _dbContext;
        private readonly IWebHostEnvironment _environment;
        private readonly ILogger<VideoController> _logger;


        public VideoController(ApplicationDbContext context, IWebHostEnvironment enviroment, ILogger<VideoController> logger)
        {
            _dbContext = context;
            _environment = enviroment;
            _logger = logger;
        }

        [HttpGet("categories")]
        public async Task<IActionResult> GetCategories()
        {
            List<CategoryDTO> categories = await _dbContext.Categories
                .Select(c => new CategoryDTO()
                {
                    Id = c.Id,
                    Name = c.Name,
                })
                .ToListAsync();

            if (categories == null)
            {
                return BadRequest("No categories found!");
            }
            else
            {
                return Ok(categories);
            }

        }

        [Authorize]
        [HttpPost("upload")]
        [RequestSizeLimit(104857600)] //100MB
        public async Task<IActionResult> Upload([FromForm] VideoUploadDTO videoUploadForm)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(new { message = "Invalid Model", error = ModelState.Values.SelectMany(e => e.Errors).Select(e => e.ErrorMessage) });
            }

            try
            {
                string videoPath = Path.Combine(_environment.WebRootPath, "videos", Guid.NewGuid() + videoUploadForm.VideoFile.FileName);
                string thumbnail = Path.Combine(_environment.WebRootPath, "thumbnail", Guid.NewGuid() + videoUploadForm.ImageFile.FileName); // Guid.NewGuid generates unique names in order to prevent colliding

                using (FileStream videoStream = new FileStream(videoPath, FileMode.Create))
                {
                    await videoUploadForm.VideoFile.CopyToAsync(videoStream);
                }

                using (FileStream imageStream = new FileStream(thumbnail, FileMode.Create))
                {
                    await videoUploadForm.ImageFile.CopyToAsync(imageStream);
                }



                var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

                if (string.IsNullOrEmpty(userId))
                {
                    return Unauthorized("You are not authorized to upload videos!");
                }
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
                    Likes = 0,
                    Dislike = 0,
                    CommentsCount = 0,
                    ReplyCount = 0,
                    Length = videoDuration,
                    VideoOwnerId = userId

                };

                await _dbContext.VideoRecords.AddAsync(video);
                await _dbContext.SaveChangesAsync();

                return Ok(new { message = "Video Uploaded successfully to VODLibrary " });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Failed to post video to VODLibrary", error = ex.Message });
            }




        }

        [HttpGet("sections")]
        public async Task<IActionResult> GetMainMenuVideos()
        {
            try
            {
                List<CategoryWithItsVideosDTO> categoryWithItsVideosDTOs = await _dbContext
                 .Categories
                 .Include(c => c.Videos)
                 .ThenInclude(v => v.VideoOwner)

                 .Select(c => new CategoryWithItsVideosDTO()
                 {

                     Id = c.Id,
                     Name = c.Name,
                     Videos = c.Videos
                     .Take(10)
                     .Select(v => new VideoWindowDTO()
                     {
                         Id = v.Id,
                         Title = v.Title,
                         Uploaded = v.Uploaded,
                         Length = v.Length,
                         Views = v.Views,
                         VideoOwnerId = v.VideoOwnerId,
                         VideoOwnerName = v.VideoOwner.UserName,
                         ImagePath = $"{Request.Scheme}://{Request.Host}/thumbnail/{Path.GetFileName(v.ImagePath)}"

                     })
                     .ToList()
                 })
                 .ToListAsync();

                if (categoryWithItsVideosDTOs.Count() == 0)
                {
                    return NotFound("Server could not find categories");
                }

                return Ok(categoryWithItsVideosDTOs);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Failed to load the gategories and its vidoes", error = ex.Message });
            }





        }

        [HttpGet("play/{videoId}")]
        public async Task<IActionResult> GetCurrentVideo(int videoId)
        {


            try
            {
                VideoRecord? video = await _dbContext.VideoRecords
                .Include(v => v.VideoOwner)
                .Include(v => v.Category)
                .Include(v => v.Comments)
                .ThenInclude(c => c.Replies)
                .FirstOrDefaultAsync(x => x.Id == videoId);




                PlayVideoDTO selectedVideo = new PlayVideoDTO()
                {
                    Id = video.Id,
                    Title = video.Title,
                    Description = video.Description,
                    Uploaded = video.Uploaded,
                    VideoPath = $"{Request.Scheme}://{Request.Host}/videos/{Path.GetFileName(video.VideoPath)}",
                    VideoOwnerId = video.VideoOwnerId,
                    VideoOwnerName = video.VideoOwner.UserName,
                    CategoryName = video.Category.Name,
                    Views = video.Views,
                    Likes = video.Likes,
                    DisLikes = video.Dislike,
                    CommentCount = video.CommentsCount,
                    Comments = video.Comments
                   .Select(c => new CommentDTO()
                   {
                       Id = c.Id,
                       UserName = c.UserName,
                       Description = c.Description,
                       VideoRecordId = c.VideoRecordId,
                       Uploaded = c.Uploaded,
                       Likes = c.Likes,
                       DisLikes = c.DisLikes,
                       RepliesCount = c.RepliesCount,
                       Replies = c.Replies
                           .Select(r => new ReplieDTO()
                           {
                               Id = r.Id,
                               UserName = r.UserName,
                               Description = r.Description,
                               VideoRecordId = r.VideoRecordId,
                               CommentId = r.CommentId,
                               Uploaded = r.Uploaded,
                               Likes = r.Likes,
                               DisLikes = r.DisLikes

                           })
                           .ToList()
                   })
                   .ToList()


                };

                return Ok(selectedVideo);
            }
            catch (DbUpdateException dataBaseExcpetion)
            {
                _logger.LogError(dataBaseExcpetion, $"DataBase fetching has failed for video Id : {videoId}");
                return StatusCode(500, new
                {
                    message = "Database error while fetching the video",
                    errorType = "DataBase ERROR",
                    details = dataBaseExcpetion.Message
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Unexpected error happened while fetching video Id : {videoId}");
                return StatusCode(500, new
                {
                    message = "Unexpected error while fetching the video",
                    errorType = "Server ERROR",
                    details = ex.Message
                });
            }

        }

        [HttpGet("play/{videoId}/comments")]
        public async Task<IActionResult> GetVideoComments(int videoId)
        {
            try
            {
                List<CommentDTO> comments = await _dbContext.Comments
                    .Where(c => c.VideoRecordId == videoId)
                    .Select(c => new CommentDTO()
                    {
                        Id = c.VideoRecordId,
                        UserName = c.UserName,
                        Description = c.Description,
                        VideoRecordId = c.VideoRecordId,
                        Uploaded = c.Uploaded,
                        Likes = c.Likes,
                        DisLikes = c.DisLikes,
                        RepliesCount = c.RepliesCount,
                    })
                    .ToListAsync();

                if (comments.IsNullOrEmpty())
                {
                    return BadRequest("No comments were found for this video");
                }

                return Ok(comments);
            }
            catch (DbUpdateException ex)
            {
                _logger.LogError($"Failed to retrive comments with the given video id {videoId}", ex);
                return StatusCode(500, new
                {
                    message = "Failed to fetch from the database",
                    errorType = "Database ERROR",
                    details = ex.Message
                });
            }
            catch (Exception ex)
            {
                _logger.LogError($"Unexpected error occurred in the GetVideosComments action", ex);
                return StatusCode(500, new
                {
                    message = "Unexpected error occurred at the server",
                    errorType = "Server ERROR",
                    details = ex.Message
                });
            }

        }

        [Authorize]
        [HttpPost("addComment")]
        public async Task<IActionResult> AddComment([FromBody] AddCommentDTO model)
        {
            if (!ModelState.IsValid)
            {
                _logger.LogError($"The given model from the client is not valid {model}");
                return BadRequest("ModelState vailed at the back end");
            }

            VideoRecord? currentVideo = await _dbContext.VideoRecords.FirstOrDefaultAsync(v => v.Id == model.VideoRecordId);

            if (currentVideo == null)
            {
                return BadRequest($"No video with the model id of {model.VideoRecordId} exists, please provide valid video id");
            }

            var userName = User.FindFirst(ClaimTypes.Name)?.Value;

            if (string.IsNullOrEmpty(userName) || userName != model.UserName)
            {
                return Unauthorized("You are not authorized to upload videos!");
            }


            Comment addedComment = new Comment()
            {
                UserName = userName,
                Description = model.Description,
                VideoRecordId = model.VideoRecordId,
                Likes = 0,
                DisLikes = 0,
                RepliesCount = 0,

            };

            await _dbContext.Comments.AddAsync(addedComment);
            await _dbContext.SaveChangesAsync();

            return Ok(model);
            //TODO add validations for videoId and userName from the given model

        }







    }
}
