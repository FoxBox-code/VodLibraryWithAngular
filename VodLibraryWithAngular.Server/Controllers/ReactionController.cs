using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using VodLibraryWithAngular.Server.Data;
using VodLibraryWithAngular.Server.Data.Models;
using VodLibraryWithAngular.Server.Models;

namespace VodLibraryWithAngular.Server.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class ReactionController : ControllerBase
    {
        private readonly ApplicationDbContext _dbContext;
        private readonly UserManager<ApplicationUser> _userManager;

        public ReactionController(ApplicationDbContext dbContext)
        {
            _dbContext = dbContext;
        }

        [Authorize]
        [HttpGet("{videoId}/reactions")]//THIS METHOD MIGHT NEED TO BE FIXED , were using user id without an authentication , plus even normal users should be able to get the count of the likes/dislikes 
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
        [HttpGet("{videoId}/comment-reactions")]
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
        [HttpPost("{commentId}/comment-reactions")]
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
        [HttpDelete("{commentId}/comment-reactions")]
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
        [HttpPost("{videoId}/reactions")]//addOrUpdateVideoReaction
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
        [HttpDelete("{videoId}/reactions")] //deleteVideoReaction
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

        [Authorize]
        [HttpGet("{commentId}/replies-user-reactions")]
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
        [HttpPost("{replyId}/replies-user-reactions")]
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
        [HttpDelete("{replyId}/replies-user-reactions")]
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
    }
}
