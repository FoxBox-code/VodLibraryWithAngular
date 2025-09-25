using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using NuGet.Protocol;
using System.Security.Claims;
using System.Text;
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
    public class VideoController : ControllerBase
    {
        private readonly ApplicationDbContext _dbContext;
        private readonly IWebHostEnvironment _environment;
        private readonly ILogger<VideoController> _logger;
        private readonly UserManager<ApplicationUser> _userManager;
        private readonly IFileNameSanitizer _fileNameSanitizer;
        private readonly VideoFileRenditionsService _videoFileRenditionsService;
        private readonly DTOTransformer _dtoTransformer;



        public VideoController(ApplicationDbContext context,
            IWebHostEnvironment enviroment, ILogger<VideoController> logger,
            UserManager<ApplicationUser> userManager, IFileNameSanitizer fileNameSanitizer,
            VideoFileRenditionsService videoFileService, DTOTransformer dTOTransformer)
        {
            _dbContext = context;
            _environment = enviroment;
            _logger = logger;
            _userManager = userManager;
            _fileNameSanitizer = fileNameSanitizer;
            _videoFileRenditionsService = videoFileService;
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

        [Authorize]
        [HttpPost("upload")]
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

        [HttpGet("get-video-window")]////This is a HARDCODED API request to see visually how the poping element will in Upload Component
        public async Task<IActionResult> GetVideoWindow()
        {
            VideoRecord video = await _dbContext.VideoRecords.Include(v => v.VideoOwner).FirstAsync(v => v.Id == 14);

            VideoWindowDTO res = _dtoTransformer.CreateVideoWindowDTOFromVideoRecord(video);

            return Ok(res);
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

        [Authorize]
        [HttpGet("edit/{videoId}")]
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

            VideoRecord video = await _dbContext.VideoRecords.FirstOrDefaultAsync(v => v.Id == videoId);

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
        [HttpPatch("edit/{videoId}")]
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
                    string oldPath = Path.Combine(_environment.WebRootPath, video.ImagePath.TrimStart('/'));

                    if (System.IO.File.Exists(oldPath))
                    {
                        System.IO.File.Delete(oldPath);
                    }
                }

                string filePath = Guid.NewGuid().ToString() + ".jpg";//A bit of an iffy with this jpg hard code
                string savedPath = Path.Combine("thumbnail", filePath);
                string fullPath = Path.Combine(_environment.WebRootPath, savedPath);

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
                Directory.Delete(renditionFolder, true);
            }


            _dbContext.VideoRecords.Remove(video);
            await _dbContext.SaveChangesAsync();

            return Ok();
        }



        [Authorize]
        [HttpGet("subscribers")]
        public async Task<IActionResult> GetUserFollowing()
        {
            string userId = _userManager.GetUserId(User);

            var queryResult = await _dbContext.SubScribers.Include(x => x.Subscribed).Where(s => s.FollowerId == userId).ToListAsync();

            Console.WriteLine("ARE WE EVEN HERERERERERE!!!!!!!!!!!");

            List<ProfilesFollowingDTO> following = queryResult.Select(q => new ProfilesFollowingDTO
            {
                Id = q.SubscribedId,
                UserName = q.SubscribedUserName,
                SubscribedOn = q.SubscribedOn,
                UesrImageIcon = $"{Request.Scheme}://{Request.Host}/ProfilePics/ProfileIcons/{Path.GetFileName(q.Subscribed.profilePic)}"

            })
            .ToList();

            return Ok(following);

        }


        [Authorize]
        [HttpPost("subscribe")]
        public async Task<IActionResult> SubscribeUserToVideoOwner([FromBody] SubscribingDTO body)
        {
            Subscriber subscribe = await _dbContext.SubScribers.FirstOrDefaultAsync(x => x.FollowerId == body.FollowerId && x.SubscribedId == body.SubscribedToId);

            if (subscribe != null)
            {
                return BadRequest(new
                {
                    message = "Duplicate detected user already subbed to content creator"
                });
            }

            subscribe = new Subscriber()
            {
                FollowerId = body.FollowerId,
                FollowerUserName = body.FollowerUserName,
                SubscribedId = body.SubscribedToId,
                SubscribedUserName = body.SubscribedToUserName,
                SubscribedOn = DateTime.UtcNow

            };

            await _dbContext.SubScribers.AddAsync(subscribe);
            await _dbContext.SaveChangesAsync();

            return Ok();
        }

        [Authorize]
        [HttpDelete("subscribe")]
        public async Task<IActionResult> UnSubscribeUserToVideoOwner([FromQuery] SubscribingDTO body)
        {
            Console.WriteLine(body.ToJson());
            Subscriber subscriber = _dbContext.SubScribers.FirstOrDefault(x => x.FollowerId == body.FollowerId && x.SubscribedId == body.SubscribedToId);

            if (subscriber == null)
            {
                return BadRequest(new
                {
                    message = "Could not find meta data for the provided un subscription"
                });

            }

            _dbContext.Remove(subscriber);
            await _dbContext.SaveChangesAsync();

            return Ok();

        }

        [Authorize]
        [HttpGet("subscriptions")]
        public async Task<IActionResult> GetUserVideosFromSubscribers()
        {
            string userId = _userManager.GetUserId(User);

            var subs = await _dbContext.SubScribers.Where(s => s.FollowerId == userId)
                .Select(x => new { x.SubscribedId })
                .ToListAsync();

            List<VideoWindowDTO> videos = new List<VideoWindowDTO>();

            foreach (var sub in subs)
            {
                List<VideoRecord> vods = await _dbContext.VideoRecords.Where(x => x.VideoOwnerId == sub.SubscribedId).ToListAsync();

                List<VideoWindowDTO> dtos = vods.Select(x => _dtoTransformer.CreateVideoWindowDTOFromVideoRecord(x)).ToList();

                videos.AddRange(dtos);

            }

            videos.Sort((a, b) =>
            {
                return b.Uploaded.CompareTo(a.Uploaded);
            });

            return Ok(videos);
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





    }
}





