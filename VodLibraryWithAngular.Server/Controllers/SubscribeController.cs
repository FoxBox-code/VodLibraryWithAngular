using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using NuGet.Protocol;
using VodLibraryWithAngular.Server.Data;
using VodLibraryWithAngular.Server.Data.Models;
using VodLibraryWithAngular.Server.Interfaces;
using VodLibraryWithAngular.Server.Models;

namespace VodLibraryWithAngular.Server.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class SubscribeController : ControllerBase
    {
        private readonly ApplicationDbContext _dbContext;
        private readonly UserManager<ApplicationUser> _userManager;
        private readonly IDTOTransformer _dtoTransformer;
        public SubscribeController(ApplicationDbContext dbContext, UserManager<ApplicationUser> userManager, IDTOTransformer _dtoTransformer)
        {
            _dbContext = dbContext;
            _userManager = userManager;
            this._dtoTransformer = _dtoTransformer;
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
    }
}
