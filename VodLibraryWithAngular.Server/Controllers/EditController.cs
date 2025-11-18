using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Text;
using VodLibraryWithAngular.Server.Data;
using VodLibraryWithAngular.Server.Data.Models;
using VodLibraryWithAngular.Server.Interfaces;
using VodLibraryWithAngular.Server.Models;

namespace VodLibraryWithAngular.Server.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class EditController : ControllerBase
    {

        private readonly ApplicationDbContext _dbContext;
        private readonly UserManager<ApplicationUser> _userManager;
        private readonly ILogger<EditController> _logger;
        private readonly IDTOTransformer _dtoTransformer;
        private readonly IWebHostEnvironment webHostEnvironment;

        public EditController(ApplicationDbContext dbContext, UserManager<ApplicationUser> userManager, ILogger<EditController> logger, IDTOTransformer dtoTransformer, IWebHostEnvironment webHostEnvironment)
        {
            this._dbContext = dbContext;
            _userManager = userManager;
            _logger = logger;
            _dtoTransformer = dtoTransformer;
            this.webHostEnvironment = webHostEnvironment;
        }
        [Authorize]
        [HttpGet("video/{videoId}")]
        public async Task<IActionResult> GetEditVideoInfo(int videoId)
        {
            string userId = _userManager.GetUserId(User);

            if (userId == null)
            {
                return Unauthorized(new
                {
                    message = "User manager was not able to find current user's claims"
                });
            }

            VideoRecord? video = await _dbContext.VideoRecords.FirstOrDefaultAsync(v => v.Id == videoId);

            if (video == null)
            {
                return BadRequest(new
                {
                    message = $"Video with id ${videoId} was not found"
                });
            }

            if (userId != video.VideoOwnerId)
            {
                _logger.LogError($"Somehow user with id${userId} and claims principal {User} went into edit mode to video not of his own, " +
                    $"specifically at ${video.Id} Title ${video.Title} which belongs to user with id${video.VideoOwnerId}");

                return Unauthorized(new
                {
                    message = $"You are not allowed to change videos that don t belong to you"
                });
            }

            VideoWindowDTO res = _dtoTransformer.CreateVideoWindowDTOFromVideoRecord(video);

            return Ok(res);

        }

        [Authorize]
        [HttpPatch("video/{videoId}")]
        public async Task<IActionResult> PatchEditVideoInfo(int videoId, [FromBody] EditVideoDTO body)
        {
            string userId = _userManager.GetUserId(User);

            Console.WriteLine(body);
            string imageBase64 = body.NewImageString;
            VideoRecord video = await _dbContext.VideoRecords.Include(v => v.VideoRenditions).Include(v => v.VideoSpriteMetaData).FirstOrDefaultAsync(v => v.Id == videoId);


            if (video == null)
            {
                _logger.LogError($"A request for editing video with id {videoId} was made but the database did not find it ");

                return BadRequest(new
                {
                    message = $"Video with pointed id {videoId} was not found"
                });
            }

            if (video.VideoOwnerId != userId)
                return Unauthorized(new
                {
                    message = "You are not authorized to edit this video"
                });

            if (imageBase64 != null)
            {
                if (video.ImagePath != null)
                {
                    string oldPath = Path.Combine(webHostEnvironment.WebRootPath, video.ImagePath.TrimStart('/'));

                    if (System.IO.File.Exists(oldPath))
                    {
                        System.IO.File.Delete(oldPath);
                    }
                }

                string filePath = Guid.NewGuid().ToString() + ".jpg";//A bit of an iffy with this jpg hard code
                string savedPath = Path.Combine("thumbnail", filePath);
                string fullPath = Path.Combine(webHostEnvironment.WebRootPath, savedPath);

                string pureBase64 = SanitizeBase64(imageBase64);
                var imageBytes = Convert.FromBase64String(pureBase64);
                await using var imageStream = new MemoryStream(imageBytes);

                using var image = await Image.LoadAsync(imageStream);

                image.Mutate(x => x.Resize(480, 360));

                await using var outPutStream = new FileStream(fullPath, FileMode.Create);

                await image.SaveAsJpegAsync(outPutStream);

                video.ImagePath = fullPath;

            }

            if (body.Title != video.Title)
            {

                EditVideoTitleDirectory(video, body.Title);

            }

            video.Title = body.Title;
            video.Description = body.Description;
            video.CategoryId = (int)body.CategoryId;

            await _dbContext.SaveChangesAsync();


            VideoWindowDTO res = _dtoTransformer.CreateVideoWindowDTOFromVideoRecord(video);

            return Ok(res);
        }

        private void EditVideoTitleDirectory(VideoRecord video, string newTitle)
        {
            var renditions = video.VideoRenditions.ToArray();
            VideoRendition rendition = renditions[0];
            VideoSpriteMetaData spriteSheet = video.VideoSpriteMetaData;

            string renditionDirectory = Path.GetDirectoryName(rendition.RenditionPath);
            string[] newDirectoryArr = renditionDirectory.Split("\\").SkipLast(1).ToArray();

            StringBuilder sb = new StringBuilder();
            foreach (string splitPath in newDirectoryArr)
            {
                sb.Append(splitPath + "\\");
            }

            string newDirectory = sb.ToString().TrimEnd('\\');

            newDirectory = Path.Combine(newDirectory, $"Video{video.Id} {IFileNameSanitizer.CleanFolderOrFileName(newTitle)}");//Name path done correctly

            foreach (var ren in renditions)
            {
                ren.RenditionPath = Path.Combine(newDirectory, Path.GetFileName(ren.RenditionPath));

            }
            Directory.Move(renditionDirectory, newDirectory);

            string spriteSheetPathLast = spriteSheet.DirectoryPath.Split('\\').Last();

            spriteSheet.DirectoryPath = Path.Combine(newDirectory, spriteSheetPathLast);
        }


        private string SanitizeBase64(string base64)//for context this is how a base 64 string looks like(/9j/4AAQSkZJRgABAQAAAQABAAD...) ,
                                                    //these values before the comma are headers placed by the browser for context but in order to work with the
                                                    //encoded data we need to remove these headers, data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD...

        {
            int commaIndex = base64.IndexOf(",");
            return commaIndex >= 0 ? base64.Substring(commaIndex + 1) : base64;
        }

        [Authorize]
        [HttpDelete("delete/{videoId}")]
        public async Task<IActionResult> DeleteVideo(int videoId)
        {
            string? userId = _userManager.GetUserId(User);

            VideoRecord video = await _dbContext.VideoRecords.Include(v => v.VideoRenditions).FirstOrDefaultAsync(x => x.Id == videoId);

            if (video == null)
            {
                _logger.LogError($"The video with id:{videoId} was requested by user with id:{userId} to be deleted but the video was not found in the database");
                return NotFound(new
                { message = "Video was not found" });

            }

            if (userId == null || video.VideoOwnerId != userId)
            {
                return Unauthorized(new
                { message = "You're not authorized to remove this video" });

            }

            Category category = await _dbContext.Categories.FirstOrDefaultAsync(x => x.Id == video.CategoryId);

            if (category == null)
            {
                _logger.LogInformation($"Unable to delete the video of user with id {userId} somehow the video was made with an category id that is not provided in the data base -error happens at VideoController DeleteVideo");
                return BadRequest();
            }

            if (System.IO.File.Exists(video.VideoPath))
            {
                System.IO.File.Delete(video.VideoPath);
            }


            VideoRendition[] renditions = video.VideoRenditions.ToArray();

            if (renditions.Length > 0)
            {
                string renditionFolder = Path.GetDirectoryName(renditions[0].RenditionPath);
                if (Directory.Exists(renditionFolder))
                    Directory.Delete(renditionFolder, true);
            }


            _dbContext.VideoRecords.Remove(video);
            await _dbContext.SaveChangesAsync();

            return Ok();
        }
    }
}
