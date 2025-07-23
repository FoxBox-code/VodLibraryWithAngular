using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using NuGet.Protocol;
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
        private readonly UserManager<ApplicationUser> _userManager;


        public VideoController(ApplicationDbContext context, IWebHostEnvironment enviroment, ILogger<VideoController> logger, UserManager<ApplicationUser> userManager)
        {
            _dbContext = context;
            _environment = enviroment;
            _logger = logger;
            _userManager = userManager;
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
        public async Task<IActionResult> UploadVideo([FromForm] VideoUploadDTO videoUploadForm)
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

                //using (FileStream imageStream = new FileStream(thumbnail, FileMode.Create))
                //{
                //    await videoUploadForm.ImageFile.CopyToAsync(imageStream);
                //} use library ImageSharp to format the given image from the user to selected sizes 

                using var image = await SixLabors.ImageSharp.Image.LoadAsync(videoUploadForm.ImageFile.OpenReadStream());
                image.Mutate(x => x.Resize(480, 360));

                await using var outPutStream = new FileStream(thumbnail, FileMode.Create);
                await image.SaveAsJpegAsync(outPutStream);



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
                    CommentsCount = 0,
                    ReplyCount = 0,
                    Length = videoDuration,
                    VideoOwnerId = userId


                };

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
                     .Select(v =>

                     new VideoWindowDTO()
                     {
                         Id = v.Id,
                         Title = v.Title,
                         Uploaded = v.Uploaded,
                         Length = v.Length,
                         Views = v.Views,
                         VideoOwnerId = v.VideoOwnerId,
                         VideoOwnerName = v.VideoOwner.UserName,
                         ImagePath = $"{Request.Scheme}://{Request.Host}/thumbnail/{Path.GetFileName(v.ImagePath)}"

                     }
                     )
                     .ToList()
                 })
                 .ToListAsync();



                if (categoryWithItsVideosDTOs.Count() == 0)
                {
                    return NotFound("Server could not find categories");
                }

                foreach (var category in categoryWithItsVideosDTOs)
                {
                    foreach (var video in category.Videos)
                    {
                        var (hours, minutes, seconds) = VideoLengthConvertedToHoursMinutesSeconds(video.Length);

                        video.Hours = hours;
                        video.Minutes = minutes;
                        video.Seconds = seconds;

                    }
                }

                return Ok(categoryWithItsVideosDTOs);
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
            VideoWindowDTO res = new VideoWindowDTO()
            {
                Id = video.Id,
                Title = video.Title,
                Uploaded = video.Uploaded,
                Length = video.Length,
                Views = video.Views,
                VideoOwnerId = video.VideoOwnerId,
                VideoOwnerName = video.VideoOwner.UserName,
                ImagePath = $"{Request.Scheme}://{Request.Host}/thumbnail/{Path.GetFileName(video.ImagePath)}"
            };

            var (hours, minutes, seconds) = VideoLengthConvertedToHoursMinutesSeconds(video.Length);

            res.Hours = hours;
            res.Minutes = minutes;
            res.Seconds = seconds;

            return res;
        }

        [HttpGet("play/{videoId}")]
        public async Task<IActionResult> GetCurrentVideo(int videoId)//THIS needs to be rewritten since we load the comments when we get the video but have a seprate method for that
        {


            try
            {
                VideoRecord? video = await _dbContext.VideoRecords
                .Include(v => v.VideoOwner)
                .Include(v => v.Category)
                .Include(v => v.Comments)
                .ThenInclude(c => c.Replies)
                .FirstOrDefaultAsync(x => x.Id == videoId);


                var comments = video.Comments.ToList();

                List<CommentDTO> commentDTOs = new List<CommentDTO>();

                foreach (var com in comments)
                {
                    int likeCount = await _dbContext.CommentLikesDisLikes
                        .CountAsync(x => x.Id == com.Id && x.Like);

                    int disLikeCout = await _dbContext.CommentLikesDisLikes
                        .CountAsync(x => x.Id == com.Id && !x.Like);

                    var replies = await _dbContext.Replies.Where(x => x.CommentId == com.Id).ToListAsync();

                    List<ReplieDTO> repliesDTOs = new List<ReplieDTO>();

                    foreach (var rep in replies)
                    {
                        int repLikeCount = await _dbContext.RepliesLikesDisLikes
                            .CountAsync(x => x.Id == rep.Id && x.Like);

                        int repDisLikeCount = await _dbContext.RepliesLikesDisLikes
                            .CountAsync(x => x.Id == rep.Id && !x.Like);

                        ReplieDTO currentReply = new ReplieDTO()
                        {
                            Id = rep.Id,
                            UserName = rep.UserName,
                            UserId = rep.UserId,
                            Description = rep.Description,
                            VideoRecordId = rep.VideoRecordId,
                            CommentId = rep.CommentId,
                            Uploaded = rep.Uploaded,
                            Likes = repLikeCount,
                            DisLikes = repDisLikeCount
                        };

                        repliesDTOs.Add(currentReply);
                    }

                    CommentDTO current = new CommentDTO()
                    {
                        Id = com.Id,
                        UserName = com.UserName,
                        UserId = com.UserId,
                        Description = com.Description,
                        VideoRecordId = com.VideoRecordId,
                        Uploaded = com.Uploaded,
                        Likes = likeCount,
                        DisLikes = disLikeCout,
                        RepliesCount = com.RepliesCount,
                        Replies = repliesDTOs

                    };


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
                    CategoryName = video.Category.Name,
                    Views = video.Views,

                    CommentCount = video.CommentsCount,
                    Comments = commentDTOs

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

        [HttpGet("play/{videoId}/reactions")]//THIS MIGHT BE a source of problem , we use _userManager on a method that is not authorized
        public async Task<IActionResult> GetCurrentReactions(int videoId)
        {
            int likeCount = await _dbContext.VideoLikesDislikes
                .CountAsync(x => x.VideoId == videoId && x.Liked);

            int dislikeCount = await _dbContext.VideoLikesDislikes
                .CountAsync(x => x.VideoId == videoId && !x.Liked);


            string? userId = _userManager.GetUserId(User);

            VideoLikesDislikes? userVote = await _dbContext.VideoLikesDislikes
                .FirstOrDefaultAsync(x => x.UserId == userId);

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
        [HttpPost("play/{videoId}/reactions")]
        public async Task<IActionResult> AddOrUpdateVideoReaction(int videoId, [FromBody] ReactionDTO dto)
        {
            string? userId = _userManager.GetUserId(User);

            if (userId == null)
                return Unauthorized(new
                {
                    message = "User is not logged in"
                });

            var exists = await _dbContext.VideoLikesDislikes
                .FirstOrDefaultAsync(x => x.VideoId == videoId && userId == x.UserId);

            if (exists == null)
            {
                VideoLikesDislikes reaction = new VideoLikesDislikes()
                {
                    VideoId = videoId,
                    UserId = userId,
                    Liked = dto.ReactionType == "Like",
                    TimeOfLike = DateTime.UtcNow
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
        [HttpDelete("play/{videoId}/reactions")]
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
        public async Task<IActionResult> GetVideoComments(int videoId)
        {
            try
            {
                List<CommentDTO> comments = await _dbContext.Comments
                    .Where(c => c.VideoRecordId == videoId)
                    .OrderByDescending(c => c.Uploaded)
                    .Select(c => new CommentDTO()
                    {
                        Id = c.Id,
                        UserName = c.UserName,
                        UserId = c.UserId,
                        Description = c.Description,
                        VideoRecordId = c.VideoRecordId,
                        Uploaded = c.Uploaded,
                        Likes = c.LikesDisLikes.Count(x => x.Like),
                        DisLikes = c.LikesDisLikes.Count(x => !x.Like),
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

        [HttpGet("play/{videoId}/commentsCount")]
        public async Task<IActionResult> GetCommentsCount(int videoId)
        {
            VideoRecord? video = await _dbContext.VideoRecords.FirstOrDefaultAsync(v => v.Id == videoId);

            if (video == null)
            {
                return BadRequest($"No such video with {videoId} exists");
            }

            int videoCommentsCount = video.CommentsCount + video.ReplyCount;

            return Ok(videoCommentsCount);
        }

        [HttpGet("play/{videoId}/updateViews")]
        public async Task<IActionResult> UpdateViews(int videoId)
        {
            VideoRecord? video = await _dbContext.VideoRecords.FirstOrDefaultAsync(v => v.Id == videoId);

            if (video == null)
            {
                return BadRequest($"No such video with this id {videoId} exists");
            }

            video.Views++;

            await _dbContext.SaveChangesAsync();

            return Ok(video.Views);
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

        [HttpGet("play/{videoId}/{commentId}/replies")]
        public async Task<IActionResult> GetRepliesForComment(int videoId, int commentId)
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
                .Select(r => new ReplieDTO()
                {
                    Id = r.Id,
                    UserName = r.UserName,
                    UserId = r.UserId,
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
        public async Task<IActionResult> GetUserLikedHistory()
        {
            string userId = _userManager.GetUserId(User);


            var videoIds = await _dbContext.VideoLikesDislikes
                .Where(x => x.UserId == userId && x.Liked)
                .OrderByDescending(x => x.TimeOfLike)
                .Select(x => new
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

                VideoWindowDTO video = new VideoWindowDTO()
                {
                    Id = current.Id,
                    Title = current.Title,
                    Uploaded = current.Uploaded,
                    Length = current.Length,
                    Views = current.Views,
                    VideoOwnerId = current.VideoOwnerId,
                    VideoOwnerName = current.VideoOwner.UserName,
                    ImagePath = $"{Request.Scheme}://{Request.Host}/thumbnail/{Path.GetFileName(current.ImagePath)}"

                };



                collection.Add(video);
            }

            return Ok(collection);
        }

        [Authorize]
        [HttpDelete("liked/{videoId}")]
        public async Task<IActionResult> RemoveVideoLikeFromHistory(int videoId)
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

            UserWatchHistory newAddition = await _dbContext.UserWatchHistories.FirstOrDefaultAsync(h => h.VideoId == videoId && userId == h.UserId);

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

            WatchHistoryVideoInfoDTO res = new WatchHistoryVideoInfoDTO()
            {
                VideoId = newAddition.VideoId,
                WatchedOn = newAddition.WatchedOn,
                Video = _dbContext.VideoRecords
                    .Include(v => v.VideoOwner)
                    .Where(v => v.Id == videoId)
                    .Select(v => new VideoWindowDTO
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
                    .First(),
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

            var videos = await _dbContext.UserWatchHistories
                .Include(x => x.Video)
                .Where(x => x.UserId == userId && x.WatchedOn >= today && x.WatchedOn < tomorrow)
                .OrderByDescending(x => x.WatchedOn)
                .Select(x => new WatchHistoryVideoInfoDTO
                {
                    VideoId = x.VideoId,
                    WatchedOn = x.WatchedOn,
                    Video = _dbContext.VideoRecords
                    .Include(v => v.VideoOwner)
                    .Where(v => v.Id == x.VideoId)
                    .Select(v => new VideoWindowDTO
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
                    .First(),
                    PrimaryKeyId = x.Id
                })
                .ToListAsync();

            return Ok(videos);
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
                    Video = new VideoWindowDTO()
                    {
                        Id = video.Video.Id,
                        Title = video.Video.Title,
                        Uploaded = video.Video.Uploaded,
                        Length = video.Video.Length,
                        Views = video.Video.Views,
                        VideoOwnerId = video.Video.VideoOwnerId,
                        VideoOwnerName = video.Video.VideoOwner.UserName,
                        ImagePath = $"{Request.Scheme}://{Request.Host}/thumbnail/{Path.GetFileName(video.Video.ImagePath)}"
                    },
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

            List<VideoWindowDTO> userCatalog = await _dbContext
                .VideoRecords
                .Include(v => v.VideoOwner)
                .Where(x => x.VideoOwnerId == user.Id)
                .OrderByDescending(x => x.Uploaded)
                .Select(v => new VideoWindowDTO
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
                .ToListAsync();

            return Ok(userCatalog);

        }




    }
}
