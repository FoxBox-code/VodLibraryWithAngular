using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.Security.Claims;
using VodLibraryWithAngular.Server.Data;
using VodLibraryWithAngular.Server.Data.Models;
using VodLibraryWithAngular.Server.Models;
using VodLibraryWithAngular.Server.QueryHttpParams;

namespace VodLibraryWithAngular.Server.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class CommentController : ControllerBase
    {
        private readonly ApplicationDbContext _dbContext;
        private readonly ILogger<CommentController> _logger;
        private readonly UserManager<ApplicationUser> _userManager;
        public CommentController(ApplicationDbContext dbContext)
        {
            _dbContext = dbContext;
        }

        [HttpGet("{videoId}")]
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


        [HttpGet("{videoId}/{commentId}/replies")]
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
    }
}
