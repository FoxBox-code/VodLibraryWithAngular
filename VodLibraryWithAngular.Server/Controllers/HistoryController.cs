using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using VodLibraryWithAngular.Server.Data;
using VodLibraryWithAngular.Server.Data.Models;
using VodLibraryWithAngular.Server.Interfaces;
using VodLibraryWithAngular.Server.Models;

namespace VodLibraryWithAngular.Server.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class HistoryController : ControllerBase
    {
        private readonly ApplicationDbContext _dbContext;
        private readonly UserManager<ApplicationUser> _userManager;
        private readonly IDTOTransformer _dtoTransformer;

        public HistoryController(ApplicationDbContext dbContext, UserManager<ApplicationUser> userManager, IDTOTransformer dTOTransformer)
        {
            _dbContext = dbContext;
            _userManager = userManager;
            _dtoTransformer = dTOTransformer;
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

                VideoWindowDTO video = _dtoTransformer.CreateVideoWindowDTOFromVideoRecord(current);



                collection.Add(video);
            }

            return Ok(collection);
        }

        [Authorize]
        [HttpDelete("liked/{videoId}")]
        public async Task<IActionResult> DeleteLikedVideoFromHistory(int videoId)//deleteLikedVideoFromHistory
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
        [HttpPost("{videoId}")]
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
                Video = _dtoTransformer.CreateVideoWindowDTOFromVideoRecord(video),
                PrimaryKeyId = newAddition.Id
            };

            return Ok(res);

        }


        [Authorize]
        [HttpGet("today")]
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
                    Video = _dtoTransformer.CreateVideoWindowDTOFromVideoRecord(x.Video),
                    PrimaryKeyId = x.VideoId
                })
                .ToList();







            return Ok(watchHistoryVideoDto);
        }

        [Authorize]
        [HttpGet("past")]
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
                    Video = _dtoTransformer.CreateVideoWindowDTOFromVideoRecord(video.Video),
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
        [HttpDelete("past")]
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
        [HttpDelete("invdividual/{primaryKeyId}")]
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


        [Authorize]
        [HttpGet("you")]
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

            List<VideoWindowDTO> videoWindowDTOs = history.Select(h => _dtoTransformer.CreateVideoWindowDTOFromVideoRecord(h.Video)).ToList();

            return Ok(videoWindowDTOs);
        }





    }
}
