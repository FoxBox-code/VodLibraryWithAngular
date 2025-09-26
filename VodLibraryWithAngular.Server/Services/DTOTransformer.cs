using Microsoft.EntityFrameworkCore;
using VodLibraryWithAngular.Server.Data;
using VodLibraryWithAngular.Server.Data.Models;
using VodLibraryWithAngular.Server.Interfaces;
using VodLibraryWithAngular.Server.Models;

namespace VodLibraryWithAngular.Server.Services
{
    public class DTOTransformer : IDTOTransformer
    {
        private readonly ApplicationDbContext _dbContext;
        private readonly IHttpContextAccessor _httpContextAccessor;
        private readonly ILogger<DTOTransformer> _logger;
        public DTOTransformer(ApplicationDbContext dbContext, IHttpContextAccessor httpContextAccessor, ILogger<DTOTransformer> logger)
        {
            _dbContext = dbContext;
            _httpContextAccessor = httpContextAccessor;
            _logger = logger;
        }
        public VideoWindowDTO CreateVideoWindowDTOFromVideoRecord(VideoRecord video)//if you feel brave place this function on every videoWindowDTO creation
        {
            if (video.Category?.Name == null || video.VideoOwner?.UserName == null)
            {
                video = _dbContext.VideoRecords.Include(v => v.Category).Include(v => v.VideoOwner).First(v => v.Id == video.Id);
            }

            if (_httpContextAccessor == null)
            {
                _logger.LogError("Inside the DTOTransformer service , the httpcontextAccesor was of null reference. This would lead to not load the static content");
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
                VideoOwnerProfileIcon = $"{_httpContextAccessor.HttpContext.Request.Scheme}://{_httpContextAccessor.HttpContext.Request.Host}/ProfilePics/ProfileIcons/{Path.GetFileName(video.VideoOwner.profilePic)}",

                ImagePath = $"{_httpContextAccessor.HttpContext.Request.Scheme}://{_httpContextAccessor.HttpContext.Request.Host}/thumbnail/{Path.GetFileName(video.ImagePath)}",
                CategoryId = video.CategoryId,
                CategoryName = video.Category.Name,
                Description = video.Description,


            };

            var (hours, minutes, seconds) = VideoLengthConvertedToHoursMinutesSeconds(video.Length);

            res.Hours = hours;
            res.Minutes = minutes;
            res.Seconds = seconds;

            return res;
        }

        private (int hours, int minutes, int seconds) VideoLengthConvertedToHoursMinutesSeconds(TimeSpan length)
        {
            return (((int)length.TotalHours, length.Minutes, length.Seconds));
        }
    }
}
