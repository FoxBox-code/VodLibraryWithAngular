using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
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


        public VideoController(ApplicationDbContext context, IWebHostEnvironment enviroment)
        {
            _dbContext = context;
            _environment = enviroment;
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

    }
}
