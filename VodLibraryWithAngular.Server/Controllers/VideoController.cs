using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using NuGet.Protocol;
using System.Security.Claims;
using VodLibraryWithAngular.Server.Data;
using VodLibraryWithAngular.Server.Data.Models;
using VodLibraryWithAngular.Server.Interfaces;
using VodLibraryWithAngular.Server.Models;
using VodLibraryWithAngular.Server.QueryHttpParams;


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


        public VideoController(ApplicationDbContext context, IWebHostEnvironment enviroment, ILogger<VideoController> logger, UserManager<ApplicationUser> userManager, IFileNameSanitizer fileNameSanitizer)
        {
            _dbContext = context;
            _environment = enviroment;
            _logger = logger;
            _userManager = userManager;
            _fileNameSanitizer = fileNameSanitizer;
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

                string videoPath = Path.Combine(_environment.WebRootPath, "videos", Guid.NewGuid() + _fileNameSanitizer.SanitizeFileName(videoUploadForm.VideoFile.FileName));
                string thumbnail = Path.Combine(_environment.WebRootPath, "thumbnail", Guid.NewGuid() + _fileNameSanitizer.SanitizeFileName(videoUploadForm.ImageFile.FileName)); // Guid.NewGuid generates unique names in order to prevent colliding

                using (FileStream videoStream = new FileStream(videoPath, FileMode.Create))
                {
                    await videoUploadForm.VideoFile.CopyToAsync(videoStream);
                }


                var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

                if (string.IsNullOrEmpty(userId))
                {
                    return Unauthorized("You are not authorized to upload videos!");
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
                    VideoOwnerId = userId


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
                    return Ok(new { message = "Video Uploaded successfully to VODLibrary" });
                }

                VideoWindowDTO videoWindowDTO = CreateVideoWindowDTOFromVideoRecord(latestVideo);


                return Ok(new
                {
                    message = "Video Uploaded successfully to VODLibrary",
                    videoWindowDTO
                }
                );
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
                        Videos = c.Videos.Select(v => CreateVideoWindowDTOFromVideoRecord(v)).ToList()
                    })
                    .ToList();

                return Ok(categoryDTO);

            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Failed to load the categories and its videos", error = ex.Message });
            }

        }
















        private (int hours, int minutes, int seconds) VideoLengthConvertedToHoursMinutesSeconds(TimeSpan length)
        {
            return (((int)length.TotalHours, length.Minutes, length.Seconds));
        }
        private VideoWindowDTO CreateVideoWindowDTOFromVideoRecord(VideoRecord video)//if you feel brave place this function on every videoWindowDTO creation
        {
            if (video.Category?.Name == null || video.VideoOwner?.UserName == null)
            {
                video = _dbContext.VideoRecords.Include(v => v.Category).Include(v => v.VideoOwner).First(v => v.Id == video.Id);
            }

            VideoWindowDTO res = new VideoWindowDTO()
            {
                Id = video.Id,
                Title = video.Title,
                Uploaded = video.Uploaded,
                Length = video.Length,
                Views = video.Views,
                VideoOwnerId = video.VideoOwnerId,
                VideoOwnerName = video.VideoOwner.UserName,
                VideoOwnerProfileIcon = $"{Request.Scheme}://{Request.Host}/ProfilePics/ProfileIcons/{Path.GetFileName(video.VideoOwner.profilePic)}",

                ImagePath = $"{Request.Scheme}://{Request.Host}/thumbnail/{Path.GetFileName(video.ImagePath)}",
                CategoryId = video.CategoryId,
                CategoryName = video.Category.Name,
                Description = video.Description

            };

            var (hours, minutes, seconds) = VideoLengthConvertedToHoursMinutesSeconds(video.Length);

            res.Hours = hours;
            res.Minutes = minutes;
            res.Seconds = seconds;

            return res;
        }

        [HttpGet("play/{videoId}")]
        public async Task<IActionResult> GetCurrentVideo(int videoId)//getCurrentVideo
        {


            try
            {
                VideoRecord? video = await _dbContext.VideoRecords
                .Include(v => v.VideoOwner)
                .Include(v => v.Category)
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.Id == videoId);


                if (video == null)
                {
                    _logger.LogError($"The video that was suppose to play with id {videoId} was not found in the data base");
                    return NotFound(new { message = $"Video was not found" });
                }

                int subscribersCount = await _dbContext.SubScribers.CountAsync(x => x.SubscribedId == video.VideoOwnerId);
                int commentCount = await _dbContext.Comments.CountAsync(x => x.VideoRecordId == videoId);




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

                    TotalCommentReplyCount = commentCount + video.ReplyCount,
                    CommentCount = commentCount,


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

        [Authorize]
        [HttpGet("play/{videoId}/reactions")]//THIS METHOD MIGHT NEED TO BE FIXED , were using user id without an authentication , plus even normal users should be able to get the count of the likes/dislikes 
        public async Task<IActionResult> GetCurrentVideoReactions(int videoId) //getVideoReactions
        {
            int likeCount = await _dbContext.VideoLikesDislikes
                .CountAsync(x => x.VideoId == videoId && x.Liked);

            int dislikeCount = await _dbContext.VideoLikesDislikes
                .CountAsync(x => x.VideoId == videoId && !x.Liked);


            string? userId = _userManager.GetUserId(User);

            VideoLikesDislikes? userVote = await _dbContext.VideoLikesDislikes
                .FirstOrDefaultAsync(x => x.UserId == userId && x.VideoId == videoId);

            var userReact = userVote == null ? "None" : userVote.Liked ? "Like" : "Dislike";

            var result = new ReactionResponseDto
            {
                VideoId = videoId,
                LikeCount = likeCount,
                DisLikeCount = dislikeCount,
                Reaction = userReact
            };

            return Ok(result);
        }

        [Authorize]
        [HttpGet("play/{videoId}/comment-reactions")]
        public async Task<IActionResult> GetUserCommentReactions(int videoId)
        {
            var userId = _userManager.GetUserId(User);

            if (userId == null)
            {
                return Unauthorized(new
                {
                    message = "User is not logged in"
                });
            }


            List<UserCommentReactionsDTO> reactions = await _dbContext.CommentLikesDisLikes
                .Where(x => x.Comment.VideoRecordId == videoId && x.UserId == userId)
                .Select(x => new UserCommentReactionsDTO
                {
                    CommentId = x.CommentId,
                    Like = x.Like
                })
                .ToListAsync();



            return Ok(reactions);

        }

        [Authorize]
        [HttpPost("play/{commentId}/comment-reactions")]
        public async Task<IActionResult> AddUpdateUserCommentReactions(int commentId, [FromBody] UserCommentReactionsDTO body)
        {
            var userId = _userManager.GetUserId(User);

            var commentLikeDislike = await _dbContext.CommentLikesDisLikes.FirstOrDefaultAsync(x => x.CommentId == commentId && userId == x.UserId);

            if (commentLikeDislike == null)
            {
                commentLikeDislike = new CommentLikesDisLikes()
                {
                    CommentId = commentId,
                    UserId = userId,
                    Like = body.Like
                };

                await _dbContext.CommentLikesDisLikes.AddAsync(commentLikeDislike);
            }
            else
            {
                commentLikeDislike.Like = body.Like;

                _dbContext.CommentLikesDisLikes.Update(commentLikeDislike);
            }

            await _dbContext.SaveChangesAsync();

            var likeCount = await _dbContext.CommentLikesDisLikes.CountAsync(x => x.CommentId == commentId && x.Like);
            var disLikeCount = await _dbContext.CommentLikesDisLikes.CountAsync(x => x.CommentId == commentId && !x.Like);

            CommentReactionResponseDTO commentReactionResponseDTO = new CommentReactionResponseDTO()
            {
                CommentId = commentId,
                LikeCount = likeCount,
                DislikeCount = disLikeCount,
                Like = body.Like
            };

            return Ok(commentReactionResponseDTO);

        }



        [Authorize]
        [HttpDelete("play/{commentId}/comment-reactions")]
        public async Task<IActionResult> DeleteUserCommentReactions(int commentId)
        {
            var userId = _userManager.GetUserId(User);
            var commentLikesDislikes = await _dbContext.CommentLikesDisLikes
                .FirstOrDefaultAsync(x => x.CommentId == commentId && userId == x.UserId);

            if (commentLikesDislikes == null)
            {
                return BadRequest(new
                {
                    message = $"Comment with {commentId} was not found!"
                });
            }

            _dbContext.CommentLikesDisLikes.Remove(commentLikesDislikes);
            await _dbContext.SaveChangesAsync();

            var likeCount = await _dbContext.CommentLikesDisLikes.CountAsync(x => x.CommentId == commentId && x.Like);
            var disLikeCount = await _dbContext.CommentLikesDisLikes.CountAsync(x => x.CommentId == commentId && !x.Like);

            CommentReactionResponseDTO commentReactionResponseDTO = new CommentReactionResponseDTO()
            {
                CommentId = commentId,
                LikeCount = likeCount,
                DislikeCount = disLikeCount,

            };

            return Ok(commentReactionResponseDTO);
        }

        [Authorize]
        [HttpPost("play/{videoId}/reactions")]//addOrUpdateVideoReaction
        public async Task<IActionResult> AddOrUpdateVideoReaction(int videoId, [FromBody] ReactionDTO dto)
        {
            string? userId = _userManager.GetUserId(User);
            string? userName = _userManager.GetUserName(User);
            if (userId == null)
                return Unauthorized(new
                {
                    message = "User is not logged in"
                });

            var exists = await _dbContext.VideoLikesDislikes
                .FirstOrDefaultAsync(x => x.VideoId == videoId && userId == x.UserId);

            VideoRecord video = await _dbContext.VideoRecords.FirstOrDefaultAsync();

            if (exists == null)
            {
                VideoLikesDislikes reaction = new VideoLikesDislikes()
                {
                    VideoId = videoId,
                    UserId = userId,
                    UserName = userName,
                    Liked = dto.ReactionType == "Like",
                    TimeOfLike = DateTime.UtcNow,
                    VideoTitle = video.Title
                };

                await _dbContext.VideoLikesDislikes.AddAsync(reaction);

            }
            else
            {
                exists.Liked = dto.ReactionType == "Like";
                exists.TimeOfLike = DateTime.UtcNow;
            }

            await _dbContext.SaveChangesAsync();

            var likeCount = await _dbContext.VideoLikesDislikes
                .CountAsync(x => x.VideoId == videoId && x.Liked == true);
            var disLikeCount = await _dbContext.VideoLikesDislikes
                .CountAsync(x => x.VideoId == videoId && x.Liked == false);
            var userCurrentReaction = dto.ReactionType;

            return Ok(new ReactionResponseDto
            {
                VideoId = videoId,
                LikeCount = likeCount,
                DisLikeCount = disLikeCount,
                Reaction = userCurrentReaction
            });
        }

        [Authorize]
        [HttpDelete("play/{videoId}/reactions")] //deleteVideoReaction
        public async Task<IActionResult> RemoveUserReaction(int videoId)
        {
            string? userId = _userManager.GetUserId(User);

            if (userId == null)
            {
                return Unauthorized(new
                {
                    message = "User is not logged in"
                });
            }

            var selected = await _dbContext.VideoLikesDislikes
                .FirstOrDefaultAsync(x => x.VideoId == videoId && x.UserId == userId);

            if (selected == null)
            {
                return NotFound(new
                {
                    message = "Reaction on this video for this user was not found"
                });
            }

            _dbContext.VideoLikesDislikes.Remove(selected);
            await _dbContext.SaveChangesAsync();

            var likeCount = await _dbContext.VideoLikesDislikes
                .CountAsync(x => x.VideoId == videoId && x.Liked == true);
            var disLikeCount = await _dbContext.VideoLikesDislikes
                .CountAsync(x => x.VideoId == videoId && x.Liked == false);


            string reaction = "None";
            return Ok(new ReactionResponseDto
            {
                VideoId = videoId,
                LikeCount = likeCount,
                DisLikeCount = disLikeCount,
                Reaction = reaction
            });
        }

        [HttpGet("play/{videoId}/comments")]
        public async Task<IActionResult> GetVideoComments(int videoId, [FromQuery] CommentParams par)//getcomment or loadcomment
        {
            try
            {
                int take = par.Take;
                int skip = par.Skip;

                List<CommentDTO> comments = await _dbContext.Comments
                    .Where(c => c.VideoRecordId == videoId)
                    .Include(c => c.User)
                    .AsNoTracking()
                    .Skip(skip)
                    .Take(take)
                    .Select(c => new CommentDTO()
                    {
                        Id = c.Id,
                        UserName = c.UserName,
                        UserId = c.UserId,
                        UserIcon = $"{Request.Scheme}://{Request.Host}/ProfilePics/ProfileIcons/{Path.GetFileName(c.User.profilePic)}",
                        Description = c.Description,
                        VideoRecordId = c.VideoRecordId,
                        Uploaded = c.Uploaded,
                        Likes = c.LikesDisLikes.Count(x => x.Like),
                        DisLikes = c.LikesDisLikes.Count(x => !x.Like),
                        RepliesCount = c.Replies.Count(r => r.CommentId == c.Id),
                    })
                    .OrderByDescending(x => x.Likes)
                    .ThenByDescending(x => x.RepliesCount)
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
                return BadRequest("ModelState failed at the back end");
            }

            VideoRecord? currentVideo = await _dbContext.VideoRecords.FirstOrDefaultAsync(v => v.Id == model.VideoRecordId);

            if (currentVideo == null)
            {
                return BadRequest($"No video with the model id of {model.VideoRecordId} exists, please provide valid video id");
            }

            var userName = User.FindFirst(ClaimTypes.Name)?.Value;//I used username to do something with authentication?? This could be a problem !!!!!

            if (string.IsNullOrEmpty(userName) || userName != model.UserName)
            {
                return Unauthorized("You are not authorized to comment on  videos!");
            }

            string? userId = _userManager.GetUserId(User);//Adding Id to the comments for profile page link

            if (userId == null)
            {
                return Unauthorized(new
                {
                    message = "The attempted comment was done form a user with unidentified/missing userId"
                });
            }

            Comment addedComment = new Comment()
            {
                UserName = userName,
                UserId = userId,
                Description = model.Description,
                VideoRecordId = model.VideoRecordId,
                RepliesCount = 0,


            };

            currentVideo.CommentsCount++;

            await _dbContext.Comments.AddAsync(addedComment);
            await _dbContext.SaveChangesAsync();

            return Ok(model);
            //TODO add validations for videoId and userName from the given model

        }

        [Authorize]
        [HttpPost("addComment5000")]
        public async Task<IActionResult> AddComment5000([FromBody] AddCommentDTO model)
        {
            if (!ModelState.IsValid)
            {
                _logger.LogError($"The given model from the client is not valid {model}");
                return BadRequest("ModelState failed at the back end");
            }

            VideoRecord? currentVideo = await _dbContext.VideoRecords.FirstOrDefaultAsync(v => v.Id == model.VideoRecordId);

            if (currentVideo == null)
            {
                return BadRequest($"No video with the model id of {model.VideoRecordId} exists, please provide valid video id");
            }

            var userName = User.FindFirst(ClaimTypes.Name)?.Value;//I used username to do something with authentication?? This could be a problem !!!!!

            if (string.IsNullOrEmpty(userName) || userName != model.UserName)
            {
                return Unauthorized("You are not authorized to comment on  videos!");
            }

            string? userId = _userManager.GetUserId(User);//Adding Id to the comments for profile page link

            if (userId == null)
            {
                return Unauthorized(new
                {
                    message = "The attempted comment was done form a user with unidentified/missing userId"
                });
            }
            List<Comment> comments = new List<Comment>();

            for (int i = 0; i < 5000; i++)
            {
                Comment addedComment = new Comment()
                {
                    UserName = userName,
                    UserId = userId,
                    Description = model.Description + $"{i}",
                    VideoRecordId = model.VideoRecordId,
                    RepliesCount = 0,


                };

                comments.Add(addedComment);
            }


            currentVideo.CommentsCount++;

            await _dbContext.Comments.AddRangeAsync(comments);
            await _dbContext.SaveChangesAsync();

            return Ok(model);
            //TODO add validations for videoId and userName from the given model

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

        [Authorize]
        [HttpPost("addReply")]
        public async Task<IActionResult> AddReplyToComment([FromBody] ReplyFormDTO model)
        {
            if (!ModelState.IsValid)
            {
                _logger.LogError($"The given model from the client is not valid {model}");
                return BadRequest("ModelState failed at the back end");
            }

            VideoRecord? currentVideo = await _dbContext.VideoRecords.FirstOrDefaultAsync(v => v.Id == model.VideoId);

            if (currentVideo == null)
            {
                return BadRequest($"No video with the model id of {model.VideoId} exists, please provide valid video id");
            }

            Comment? comment = await _dbContext.Comments.FirstOrDefaultAsync(c => c.Id == model.CommentId);

            if (comment == null)
            {
                return BadRequest($"No comment with the model id of {model.CommentId} exists, please provide valid comment id");
            }

            var userName = User.FindFirst(ClaimTypes.Name)?.Value;

            if (string.IsNullOrEmpty(userName) || userName != model.UserName)
            {
                return Unauthorized("You are not authorized to reply on comments!");
            }

            string? userId = _userManager.GetUserId(User);

            if (userId == null)
            {
                return Unauthorized(new
                {
                    message = "During the adding of a reply the user id was not found!"
                });
            }

            Reply reply = new Reply()
            {
                UserName = userName,
                UserId = userId,
                Description = model.ReplyContent,
                CommentId = model.CommentId,
                VideoRecordId = model.VideoId,
                Uploaded = model.Uploaded


            };

            currentVideo.ReplyCount++;
            comment.RepliesCount++;

            await _dbContext.Replies.AddAsync(reply);
            await _dbContext.SaveChangesAsync();

            Reply? userReply = await _dbContext.Replies.FirstOrDefaultAsync(r => r.UserId == userId
                                && r.CommentId == model.CommentId
                                && r.Uploaded == model.Uploaded);



            if (userReply == null)
            {
                _logger.LogError($"Even though we have added a reply we could not get the added user reply from the data base using this filter {userId}, {model.CommentId}, {model.Uploaded}");
                return BadRequest(new
                {
                    message = "Could not updade the UI with user's latest reply"
                });
            }

            ReplieDTO answer = new ReplieDTO()
            {
                Id = userReply.Id,
                UserName = userReply.UserName,
                UserId = userReply.UserId,
                Description = userReply.Description,
                CommentId = userReply.CommentId,
                Uploaded = userReply.Uploaded,
                VideoRecordId = userReply.VideoRecordId
            };

            return Ok(answer);



        }

        [Authorize]
        [HttpPost("addReply5000")]
        public async Task<IActionResult> AddReplyToComment5000([FromBody] ReplyFormDTO model)
        {
            if (!ModelState.IsValid)
            {
                _logger.LogError($"The given model from the client is not valid {model}");
                return BadRequest("ModelState failed at the back end");
            }

            VideoRecord? currentVideo = await _dbContext.VideoRecords.FirstOrDefaultAsync(v => v.Id == model.VideoId);

            if (currentVideo == null)
            {
                return BadRequest($"No video with the model id of {model.VideoId} exists, please provide valid video id");
            }

            Comment? comment = await _dbContext.Comments.FirstOrDefaultAsync(c => c.Id == model.CommentId);

            if (comment == null)
            {
                return BadRequest($"No comment with the model id of {model.CommentId} exists, please provide valid comment id");
            }

            var userName = User.FindFirst(ClaimTypes.Name)?.Value;

            if (string.IsNullOrEmpty(userName) || userName != model.UserName)
            {
                return Unauthorized("You are not authorized to reply on comments!");
            }

            string? userId = _userManager.GetUserId(User);

            if (userId == null)
            {
                return Unauthorized(new
                {
                    message = "During the adding of a reply the user id was not found!"
                });
            }
            List<Reply> replies = new List<Reply>();

            for (int i = 0; i < 5000; i++)
            {

                Reply reply = new Reply()
                {
                    UserName = userName,
                    UserId = userId,
                    Description = model.ReplyContent + $"special reply{i}",
                    CommentId = model.CommentId,
                    VideoRecordId = model.VideoId,
                    Uploaded = model.Uploaded


                };

                replies.Add(reply);
            }


            currentVideo.ReplyCount++;
            comment.RepliesCount++;

            await _dbContext.Replies.AddRangeAsync(replies);
            await _dbContext.SaveChangesAsync();

            Reply? userReply = await _dbContext.Replies.FirstOrDefaultAsync(r => r.UserId == userId
                                && r.CommentId == model.CommentId
                                && r.Uploaded == model.Uploaded);



            if (userReply == null)
            {
                _logger.LogError($"Even though we have added a reply we could not get the added user reply from the data base using this filter {userId}, {model.CommentId}, {model.Uploaded}");
                return BadRequest(new
                {
                    message = "Could not updade the UI with user's latest reply"
                });
            }

            ReplieDTO answer = new ReplieDTO()
            {
                Id = userReply.Id,
                UserName = userReply.UserName,
                UserId = userReply.UserId,
                Description = userReply.Description,
                CommentId = userReply.CommentId,
                Uploaded = userReply.Uploaded,
                VideoRecordId = userReply.VideoRecordId
            };

            return Ok(answer);



        }

        [HttpGet("play/{videoId}/{commentId}/replies")]
        public async Task<IActionResult> GetRepliesForComment(int videoId, int commentId, [FromQuery] int skip)
        {
            VideoRecord? video = await _dbContext.VideoRecords.FirstOrDefaultAsync(v => v.Id == videoId);

            if (video == null)
            {
                return BadRequest($"Failed to find video with id {videoId}");
            }

            Comment? comment = await _dbContext.Comments.FirstOrDefaultAsync(v => v.Id == commentId);

            if (comment == null)
            {
                return BadRequest($"Failed to find comment with id {commentId}");
            }

            List<ReplieDTO> replieDTOs = await _dbContext.Replies
                .Where(r => r.VideoRecordId == videoId && r.CommentId == commentId)
                .Include(r => r.User)
                .Skip(skip)
                .Take(20)
                .Select(r => new ReplieDTO()
                {
                    Id = r.Id,
                    UserName = r.UserName,
                    UserId = r.UserId,
                    UserProfilePic = $"{Request.Scheme}://{Request.Host}/ProfilePics/ProfileIcons/{Path.GetFileName(r.User.profilePic)}",
                    Description = r.Description,
                    VideoRecordId = r.VideoRecordId,
                    CommentId = r.CommentId,
                    Uploaded = r.Uploaded,
                    Likes = r.LikesDisLikes.Count(x => x.Like),
                    DisLikes = r.LikesDisLikes.Count(x => !x.Like)
                })
                .ToListAsync();

            return Ok(replieDTOs);
        }

        [Authorize]
        [HttpGet("play/{commentId}/replies-user-reactions")]
        public async Task<IActionResult> GetUserRepliesReactions(int commentId)
        {
            string userId = _userManager.GetUserId(User);//Authorize should make sure this is not empty

            var userRepliesReactions = await _dbContext.RepliesLikesDisLikes.Where(x => x.Reply.CommentId == commentId && x.UserId == userId)
                .Select(x => new UserReplyReactions
                {
                    CommentId = commentId,
                    ReplyId = x.ReplyId,
                    Like = x.Like
                })
                .ToListAsync();

            return Ok(userRepliesReactions);


        }

        [Authorize]
        [HttpPost("play/{replyId}/replies-user-reactions")]
        public async Task<IActionResult> AddUpdateUserReplyReaction(int replyId, [FromBody] ReplyReactionDTO reaction)
        {
            var userId = _userManager.GetUserId(User);

            var replyLikeDislike = await _dbContext.RepliesLikesDisLikes.FirstOrDefaultAsync(x => x.ReplyId == replyId && x.UserId == userId);

            if (replyLikeDislike == null)
            {
                RepliesLikesDisLikes newReaction = new RepliesLikesDisLikes()
                {
                    ReplyId = replyId,
                    UserId = userId,
                    Like = reaction.ReactionType
                };

                await _dbContext.RepliesLikesDisLikes.AddAsync(newReaction);
            }
            else
            {
                replyLikeDislike.Like = reaction.ReactionType;

                _dbContext.RepliesLikesDisLikes.Update(replyLikeDislike);
            }

            await _dbContext.SaveChangesAsync();

            int replyLikeCount = await _dbContext.RepliesLikesDisLikes.CountAsync(x => x.ReplyId == replyId && x.Like);
            int replyDislikeCount = await _dbContext.RepliesLikesDisLikes.CountAsync(x => x.ReplyId == replyId && !x.Like);

            ReplyLikeDislikeCountUpdateDTO updatedCount = new ReplyLikeDislikeCountUpdateDTO()
            {
                ReplyId = replyId,
                LikeCount = replyLikeCount,
                DislikeCount = replyDislikeCount
            };

            return Ok(updatedCount);

        }

        [Authorize]
        [HttpDelete("play/{replyId}/replies-user-reactions")]
        public async Task<IActionResult> DeleteUserReaction(int replyId)
        {
            string userId = _userManager.GetUserId(User);

            var selected = await _dbContext.RepliesLikesDisLikes.FirstAsync(x => x.ReplyId == replyId && x.UserId == userId);

            if (selected == null)
            {
                return BadRequest(new
                {
                    message = $"A reply with this id {replyId} was not found!"
                });
            }

            _dbContext.RepliesLikesDisLikes.Remove(selected);

            await _dbContext.SaveChangesAsync();

            int replyLikeCount = await _dbContext.RepliesLikesDisLikes.CountAsync(x => x.ReplyId == replyId && x.Like);
            int replyDislikeCount = await _dbContext.RepliesLikesDisLikes.CountAsync(x => x.ReplyId == replyId && !x.Like);

            ReplyLikeDislikeCountUpdateDTO updatedCount = new ReplyLikeDislikeCountUpdateDTO()
            {
                ReplyId = replyId,
                LikeCount = replyLikeCount,
                DislikeCount = replyDislikeCount
            };

            return Ok(updatedCount);
        }

        [Authorize]
        [HttpGet("liked")]
        public async Task<IActionResult> GetUserLikedHistory([FromQuery] int take) //  getUsersLikedVideosHistory
        {
            string userId = _userManager.GetUserId(User);


            var videoLikesDislikes = _dbContext.VideoLikesDislikes
                .Where(x => x.UserId == userId && x.Liked)
                .OrderByDescending(x => x.TimeOfLike);

            if (take > 0)
                videoLikesDislikes = (IOrderedQueryable<VideoLikesDislikes>)videoLikesDislikes.Take(take);

            var videoIds = await videoLikesDislikes.Select(x => new
            {
                videoId = x.VideoId
            })
            .ToListAsync();

            List<VideoWindowDTO> collection = new List<VideoWindowDTO>();

            foreach (var videoId in videoIds)
            {
                VideoRecord current = await _dbContext.VideoRecords
                    .Include(v => v.VideoOwner)
                    .FirstOrDefaultAsync(x => x.Id == videoId.videoId);

                if (current == null)
                {
                    Console.WriteLine($"During the search of the users liked videos , one of the pointed ids {videoId.videoId} was not present in the videoCollection");
                    continue; // not sure how to handle this 
                }

                VideoWindowDTO video = CreateVideoWindowDTOFromVideoRecord(current);



                collection.Add(video);
            }

            return Ok(collection);
        }







        [Authorize]
        [HttpDelete("liked/{videoId}")]
        public async Task<IActionResult> RemoveVideoLikeFromHistory(int videoId)//deleteLikedVideoFromHistory
        {
            string userId = _userManager.GetUserId(User);

            var selectedForRemoval = await _dbContext.VideoLikesDislikes
                .FirstOrDefaultAsync(x => x.UserId == userId && x.VideoId == videoId);

            if (selectedForRemoval == null)
            {
                return BadRequest(new
                {
                    message = $"An error occurred  while deleting this like for video with id {videoId}, the video was not found present in the users collection"
                });
            }

            _dbContext.VideoLikesDislikes.Remove(selectedForRemoval);
            await _dbContext.SaveChangesAsync();

            return Ok(new
            {
                message = "successfully removed video from liked"
            });
        }


        [Authorize]
        [HttpPost("history/{videoId}")]
        public async Task<IActionResult> AddVideoToUsersWatchHistory(int videoId)
        {
            string userId = _userManager.GetUserId(User);

            UserWatchHistory newAddition = await _dbContext.UserWatchHistories.FirstOrDefaultAsync(h => h.VideoId == videoId && userId == h.UserId);//check for duplicates

            if (newAddition == null)
            {
                newAddition = new UserWatchHistory()
                {
                    UserId = userId,
                    VideoId = videoId,
                    WatchedOn = DateTime.UtcNow,

                };

                await _dbContext.UserWatchHistories.AddAsync(newAddition);
            }
            else
            {
                newAddition.WatchedOn = DateTime.UtcNow;

                _dbContext.UserWatchHistories.Update(newAddition);
            }



            await _dbContext.SaveChangesAsync();

            VideoRecord video = _dbContext.VideoRecords.Include(v => v.VideoOwner).First(v => v.Id == videoId);

            WatchHistoryVideoInfoDTO res = new WatchHistoryVideoInfoDTO()
            {
                VideoId = newAddition.VideoId,
                WatchedOn = newAddition.WatchedOn,
                Video = CreateVideoWindowDTOFromVideoRecord(video),
                PrimaryKeyId = newAddition.Id
            };

            return Ok(res);

        }


        [Authorize]
        [HttpGet("history")]
        public async Task<IActionResult> GetUserWatchHistoryForToday()
        {
            string userId = _userManager.GetUserId(User);

            DateTime today = DateTime.UtcNow.Date;
            DateTime tomorrow = today.AddDays(1);


            List<UserWatchHistory> videos = await _dbContext.UserWatchHistories
                .Include(x => x.Video)
                .ThenInclude(v => v.VideoOwner)
                .Where(x => x.UserId == userId && x.WatchedOn >= today && x.WatchedOn < tomorrow)
                .OrderByDescending(x => x.WatchedOn)
                .ToListAsync();

            List<WatchHistoryVideoInfoDTO> watchHistoryVideoDto = videos
                .Select(x => new WatchHistoryVideoInfoDTO
                {
                    VideoId = x.VideoId,
                    WatchedOn = x.WatchedOn,
                    Video = CreateVideoWindowDTOFromVideoRecord(x.Video),
                    PrimaryKeyId = x.VideoId
                })
                .ToList();







            return Ok(watchHistoryVideoDto);
        }

        [Authorize]
        [HttpGet("past/history")]
        public async Task<IActionResult> GetUserWatchHistoryPastToday()//THIS MIGHT NEED A LOGIC rEWRITE
        {
            string userId = _userManager.GetUserId(User);

            DateTime today = DateTime.UtcNow.Date;



            List<List<WatchHistoryVideoInfoDTO>> pastRecords = new List<List<WatchHistoryVideoInfoDTO>>();

            List<WatchHistoryVideoInfoDTO> currentDay = new List<WatchHistoryVideoInfoDTO>();

            var userWatchHistory = await _dbContext.UserWatchHistories
                .Include(x => x.Video)
                    .ThenInclude(v => v.VideoOwner)
                .Where(x => x.UserId == userId && x.WatchedOn < today)
                .OrderByDescending(x => x.WatchedOn)
                .ToListAsync();

            DateTime previousDay = today.AddDays(-1);
            DateTime currentDateDay = previousDay;

            foreach (var video in userWatchHistory)
            {


                WatchHistoryVideoInfoDTO videoToAdd = new WatchHistoryVideoInfoDTO()
                {
                    VideoId = video.VideoId,
                    WatchedOn = video.WatchedOn,
                    Video = CreateVideoWindowDTOFromVideoRecord(video.Video),
                    PrimaryKeyId = video.Id
                };

                if (currentDay.Count > 0 && currentDateDay != video.WatchedOn.Date)
                {
                    pastRecords.Add(currentDay);
                    currentDay = new List<WatchHistoryVideoInfoDTO>();
                    currentDateDay = video.WatchedOn.Date;
                }
                else
                {
                    currentDateDay = video.WatchedOn.Date;
                }

                currentDay.Add(videoToAdd);

            }

            if (currentDay.Count > 0)
            {
                pastRecords.Add(currentDay);
            }


            return Ok(pastRecords);
        }

        [Authorize]
        [HttpDelete("past/history")]
        public async Task<IActionResult> DeleteUserWatchHistoryAll()
        {
            string userId = _userManager.GetUserId(User);

            var recordHistory = await _dbContext.UserWatchHistories.Where(x => x.UserId == userId).ToListAsync();

            _dbContext.UserWatchHistories.RemoveRange(recordHistory);
            await _dbContext.SaveChangesAsync();

            return Ok(new
            {
                message = "History for user was cleared"
            });
        }

        [Authorize]
        [HttpDelete("history/{primaryKeyId}")]
        public async Task<IActionResult> DeleteIndividualVideoRecord(int primaryKeyId)
        {
            var historyRecord = await _dbContext.UserWatchHistories.FirstOrDefaultAsync(x => x.Id == primaryKeyId);

            if (historyRecord == null)
            {
                return BadRequest(new
                {
                    message = $"History record with this primary key id {primaryKeyId} was not found !"
                });
            }

            _dbContext.Remove(historyRecord);
            await _dbContext.SaveChangesAsync();

            return Ok(new
            {
                message = "Video was successfully removed from user's history record"
            });
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

            List<VideoWindowDTO> userCatalogDTO = userCatalog.Select(v => CreateVideoWindowDTOFromVideoRecord(v)).ToList();

            return Ok(userCatalogDTO);

        }

        [HttpGet("get-video-window")]////This is a HARDCODED API request to see visually how the poping element will in Upload Component
        public async Task<IActionResult> GetVideoWindow()
        {
            VideoRecord video = await _dbContext.VideoRecords.Include(v => v.VideoOwner).FirstAsync(v => v.Id == 14);

            VideoWindowDTO res = CreateVideoWindowDTOFromVideoRecord(video);

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
                    result.Add(CreateVideoWindowDTOFromVideoRecord(video));

                else
                {
                    string[] titleSplited = video.Title.ToLower().Split(" ", StringSplitOptions.RemoveEmptyEntries);

                    foreach (var prefix in titleSplited)
                    {
                        if (queryHashSet.Contains(prefix))
                        {
                            result.Add(CreateVideoWindowDTOFromVideoRecord(video));
                        }
                    }
                }


            }

            if (result.Count == 0)
            {
                foreach (var video in allVideos)
                {

                    if (2 >= Levenshtein(video.Title.Split(" ").First(), querySplitted[0]))
                        result.Add(CreateVideoWindowDTOFromVideoRecord(video));

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

            VideoWindowDTO res = CreateVideoWindowDTOFromVideoRecord(video);

            return Ok(res);

        }

        [Authorize]
        [HttpPatch("edit/{videoId}")]
        public async Task<IActionResult> PatchEditVideoInfo(int videoId, [FromBody] EditVideoDTO body)
        {
            string userId = _userManager.GetUserId(User);

            Console.WriteLine(body);
            string imageBase64 = body.NewImageString;
            VideoRecord video = await _dbContext.VideoRecords.FirstOrDefaultAsync(v => v.Id == videoId);


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

            video.Title = body.Title;
            video.Description = body.Description;
            video.CategoryId = (int)body.CategoryId;

            await _dbContext.SaveChangesAsync();


            VideoWindowDTO res = CreateVideoWindowDTOFromVideoRecord(video);

            return Ok(res);
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

            VideoRecord video = await _dbContext.VideoRecords.FirstOrDefaultAsync(x => x.Id == videoId);

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
            category.VideosCount++;

            _dbContext.VideoRecords.Remove(video);
            await _dbContext.SaveChangesAsync();

            return Ok();
        }

        [Authorize]
        [HttpGet("history/you")]
        public async Task<IActionResult> GetUserHistoryForYouPage()
        {
            string userId = _userManager.GetUserId(User);

            List<UserWatchHistory> history = await _dbContext.UserWatchHistories.Where(h => h.UserId == userId)
                .Include(h => h.Video)
                .OrderByDescending(h => h.WatchedOn)
                .Take(10)
                .ToListAsync();

            if (history.Count == 0)
            {
                return NotFound(new
                {
                    message = "No history"
                });
            }

            List<VideoWindowDTO> videoWindowDTOs = history.Select(h => CreateVideoWindowDTOFromVideoRecord(h.Video)).ToList();

            return Ok(videoWindowDTOs);
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

                List<VideoWindowDTO> dtos = vods.Select(x => CreateVideoWindowDTOFromVideoRecord(x)).ToList();

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

            List<VideoWindowDTO> videoWindowDTOs = vods.Select(x => CreateVideoWindowDTOFromVideoRecord(x)).ToList();

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


            List<VideoWindowDTO> videos = res.Select(x => CreateVideoWindowDTOFromVideoRecord(x)).ToList();

            return Ok(videos);

        }





    }
}





