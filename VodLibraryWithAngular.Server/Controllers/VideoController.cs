using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using VodLibraryWithAngular.Server.Data;
using VodLibraryWithAngular.Server.Data.Models;
using VodLibraryWithAngular.Server.DataConstants;
using VodLibraryWithAngular.Server.Interfaces;
using VodLibraryWithAngular.Server.Models;


namespace VodLibraryWithAngular.Server.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class VideoController : ControllerBase
    {
        private readonly ApplicationDbContext _dbContext;
        private readonly ILogger<VideoController> _logger;
        private readonly UserManager<ApplicationUser> _userManager;
        private readonly IDTOTransformer _dtoTransformer;

        public VideoController(ApplicationDbContext context,
             ILogger<VideoController> logger,
            UserManager<ApplicationUser> userManager,
            IDTOTransformer dTOTransformer)
        {
            _dbContext = context;
            _logger = logger;
            _userManager = userManager;
            _dtoTransformer = dTOTransformer;



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

        [HttpGet("sections")]
        public async Task<IActionResult> GetMainMenuVideos() //getVideosSection
        {
            try
            {
                List<Category> categories = await _dbContext
                 .Categories
                 .Include(c => c.Videos)
                 .ThenInclude(v => v.VideoOwner)
                 .ToListAsync();

                if (categories.Count() == 0)
                {
                    return NotFound("Server could not find categories");
                }

                List<CategoryWithItsVideosDTO> categoryDTO = categories
                    .Select(c => new CategoryWithItsVideosDTO
                    {
                        Id = c.Id,
                        Name = c.Name,
                        Videos = c.Videos.Where(v => v.Status == VideoStatusEnum.Complete).Select(v => _dtoTransformer.CreateVideoWindowDTOFromVideoRecord(v)).ToList()
                    })
                    .ToList();

                return Ok(categoryDTO);

            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Failed to load the categories and its videos", error = ex.Message });
            }

        }

        [HttpGet("play/{videoId}")]
        public async Task<IActionResult> GetCurrentVideo(int videoId) //getCurrentVideo
        {


            try
            {
                VideoRecord? video = await _dbContext.VideoRecords
                .Include(v => v.VideoOwner)
                .Include(v => v.Category)
                .Include(v => v.VideoRenditions)
                .Include(v => v.VideoSpriteMetaData)
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.Id == videoId);


                if (video == null)
                {
                    _logger.LogError($"The video that was suppose to play with id {videoId} was not found in the data base");
                    return NotFound(new { message = $"Video was not found" });
                }

                int subscribersCount = await _dbContext.SubScribers.CountAsync(x => x.SubscribedId == video.VideoOwnerId);
                //int commentCount = await _dbContext.Comments.CountAsync(x => x.VideoRecordId == videoId);
                //Not sure how quick this would be for millions of comments 

                Dictionary<string, string> renditions = new();
                string baseSpriteSheetJpgPath = string.Empty;

                foreach (var videoRenditions in video.VideoRenditions)
                {
                    var folderName = Uri.EscapeDataString(Path.GetDirectoryName(videoRenditions.RenditionPath).Split('\\').Last());
                    var fileName = Path.GetFileName(videoRenditions.RenditionPath);

                    var enums = videoRenditions.Resolution;




                    renditions[videoRenditions.Resolution.ToString()] = ($"{Request.Scheme}://{Request.Host}/videos/{folderName}/{fileName}");
                    baseSpriteSheetJpgPath = $"{Request.Scheme}://{Request.Host}/videos/{folderName}/Sprite%20Sheets";
                }



                PlayVideoDTO selectedVideo = new PlayVideoDTO()
                {
                    Id = video.Id,
                    Title = video.Title,
                    Description = video.Description,
                    Uploaded = video.Uploaded,
                    VideoPath = $"{Request.Scheme}://{Request.Host}/videos/{Path.GetFileName(video.VideoPath)}",
                    VideoOwnerId = video.VideoOwnerId,
                    VideoOwnerName = video.VideoOwner.UserName,
                    VideoOwnerProfileIcon = $"{Request.Scheme}://{Request.Host}/ProfilePics/ProfileIcons/{Path.GetFileName(video.VideoOwner.profilePic)}",
                    VideoOwnerSubscribersCount = subscribersCount,
                    CategoryName = video.Category.Name,
                    Views = video.Views,
                    Duration = video.Length,
                    TotalTimeInSeconds = video.Length.TotalSeconds,

                    TotalCommentReplyCount = video.CommentsCount + video.ReplyCount,
                    CommentCount = video.CommentsCount,

                    VideoRenditions = renditions,
                    SpriteSheetsCount = video.VideoSpriteMetaData.NumberOfSprites,
                    SpriteSheetBasePath = baseSpriteSheetJpgPath,
                    SpriteSheet = Path.Combine(baseSpriteSheetJpgPath, $"sprite_{0}.jpg")


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

        [HttpPatch("play/{videoId}/updateViews")]
        public async Task<IActionResult> UpdateViews(int videoId)
        {
            VideoRecord? video = await _dbContext.VideoRecords.FirstOrDefaultAsync(v => v.Id == videoId);

            if (video == null)
            {
                return BadRequest($"No such video with this id {videoId} exists");
            }

            video.Views++;

            await _dbContext.SaveChangesAsync();

            return Ok();
        }


        [HttpGet("user-profile/{userId}")]
        public async Task<IActionResult> GetUserCatalog(string userId)
        {
            var user = await _dbContext.Users.FirstOrDefaultAsync(u => u.Id == userId);

            if (user == null)
            {
                return NotFound(new
                {
                    message = "User not found!"
                });
            }

            List<VideoRecord> userCatalog = await _dbContext
                .VideoRecords
                .Include(v => v.VideoOwner)
                .Where(x => x.VideoOwnerId == user.Id)
                .OrderByDescending(x => x.Uploaded)
                .ToListAsync();

            List<VideoWindowDTO> userCatalogDTO = userCatalog.Select(v => _dtoTransformer.CreateVideoWindowDTOFromVideoRecord(v)).ToList();

            return Ok(userCatalogDTO);

        }



        [Authorize]
        [HttpGet("collection")]
        public async Task<IActionResult> GetLikedVideosCount()
        {
            string userId = _userManager.GetUserId(User);



            int vodIds = await _dbContext.VideoLikesDislikes.CountAsync(x => x.UserId == userId && x.Liked == true);



            return Ok(vodIds);
        }

        [Authorize]
        [HttpGet("likedVideosPlayList")]
        public async Task<IActionResult> GetUserLikedVideos()
        {

            string userId = _userManager.GetUserId(User);

            List<VideoRecord> vods = await _dbContext.VideoLikesDislikes.Include(x => x.Video).Where(x => x.UserId == userId && x.Liked == true).OrderByDescending(x => x.TimeOfLike).Select(x => x.Video).ToListAsync();

            List<VideoWindowDTO> videoWindowDTOs = vods.Select(x => _dtoTransformer.CreateVideoWindowDTOFromVideoRecord(x)).ToList();

            return Ok(videoWindowDTOs);
        }

        [HttpGet("{videoId}/likeDislikeCount")]
        public async Task<IActionResult> GetVideoLikesDislikeCount(int videoId)
        {


            var counterDB = await _dbContext.VideoLikesDislikes.Where(x => x.VideoId == videoId)
                .GroupBy(x => x.Liked)
                .Select(x => new { Like = x.Key, Count = x.Count() })
                .ToListAsync();



            VideoLikesDislikeCountDTO counter = new VideoLikesDislikeCountDTO();

            foreach (var item in counterDB)
            {
                if (item.Like)
                    counter.Likes = item.Count;

                else
                    counter.Dislikes = item.Count;
            }



            return Ok(counter);
        }

        [HttpGet("{videoId}/descriptionCategory")]
        public async Task<IActionResult> GetCategoryStatsInViedoDescription(int videoId)
        {
            var videoRecord = await _dbContext.VideoRecords.Include(x => x.Category).FirstOrDefaultAsync(x => x.Id == videoId);

            if (videoRecord == null)
            {
                _logger.LogInformation($"Inside Task GetCategoryStatsInViedoDescription with video id {videoId} we could not find the actual video , this API is only used inside playVideo COmponent");
                return NotFound("Video not found ");
            }

            CategoryStatsDTO res = new CategoryStatsDTO();

            res.Id = videoRecord.Category.Id;
            res.Name = videoRecord.Category.Name;
            res.ImagePath = $"{Request.Scheme}://{Request.Host}/Category Images/{Path.GetFileName(videoRecord.Category.ImagePath)}";
            res.VideosCount = videoRecord.Category.VideosCount;


            return Ok(res);
        }

        [HttpGet("{categoryId}")]
        public async Task<IActionResult> GetCategoryVideos(int categoryId)
        {

            Category category = await _dbContext.Categories.FirstOrDefaultAsync(x => x.Id == categoryId);

            if (category == null)
            {
                _logger.LogInformation($"Invalid category , the searched category id {categoryId} does not exist in the database");
                return NotFound(new { message = "404 CATEGORY NOT FOUND" });
            }

            var res = await _dbContext.VideoRecords.Where(x => x.CategoryId == categoryId).ToListAsync();


            List<VideoWindowDTO> videos = res.Select(x => _dtoTransformer.CreateVideoWindowDTOFromVideoRecord(x)).ToList();

            return Ok(videos);

        }


        [HttpGet("search")]
        public async Task<IActionResult> SearchVideo([FromQuery] string query)
        {
            List<VideoRecord> allVideos = await _dbContext.VideoRecords.Include(v => v.VideoOwner).ToListAsync();

            string[] querySplitted = query.ToLower().Split(" ");
            List<VideoWindowDTO> result = new List<VideoWindowDTO>();
            HashSet<string> queryHashSet = new HashSet<string>(querySplitted);

            foreach (var video in allVideos)
            {
                if (4 >= Levenshtein(query.ToLower(), video.Title.ToLower()))
                    result.Add(_dtoTransformer.CreateVideoWindowDTOFromVideoRecord(video));

                else
                {
                    string[] titleSplited = video.Title.ToLower().Split(" ", StringSplitOptions.RemoveEmptyEntries);

                    foreach (var prefix in titleSplited)
                    {
                        if (queryHashSet.Contains(prefix))
                        {
                            result.Add(_dtoTransformer.CreateVideoWindowDTOFromVideoRecord(video));
                        }
                    }
                }


            }

            if (result.Count == 0)
            {
                foreach (var video in allVideos)
                {

                    if (2 >= Levenshtein(video.Title.Split(" ").First(), querySplitted[0]))
                        result.Add(_dtoTransformer.CreateVideoWindowDTOFromVideoRecord(video));

                }
            }


            return Ok(result);



        }


        private int Levenshtein(string a, string b)
        {
            if (a == b) return 0;
            if (a.Length == 0) return b.Length;
            if (b.Length == 0) return a.Length;

            var costs = new int[b.Length + 1];
            for (int j = 0; j <= b.Length; j++)
                costs[j] = j;

            for (int i = 1; i <= a.Length; i++)
            {
                costs[0] = i;
                int nw = i - 1;
                for (int j = 1; j <= b.Length; j++)
                {
                    int cj = Math.Min(
                        1 + Math.Min(costs[j], costs[j - 1]),
                        a[i - 1] == b[j - 1] ? nw : nw + 1);
                    nw = costs[j];
                    costs[j] = cj;
                }
            }

            return costs[b.Length];
        }



    }
}


































































