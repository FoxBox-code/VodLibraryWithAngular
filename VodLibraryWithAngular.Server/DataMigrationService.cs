using Microsoft.EntityFrameworkCore;
using VodLibraryWithAngular.Server.Data;
using VodLibraryWithAngular.Server.Data.Models;

namespace VodLibraryWithAngular.Server
{
    public class DataMigrationService
    {
        private ApplicationDbContext _context;
        private readonly IWebHostEnvironment _webHostEnvironment;
        private ILogger<DataMigrationService> _logger;
        public DataMigrationService(ApplicationDbContext context, IWebHostEnvironment webHostEnvironment, ILogger<DataMigrationService> logger)
        {
            _context = context;
            _webHostEnvironment = webHostEnvironment;
            _logger = logger;
        }


        public void FillUserNameInTableASPUsers()
        {
            var users = _context.Users
                .Select(u => new
                {
                    UserName = u.UserName,
                    UserId = u.Id
                })
                .ToList();

            Dictionary<string, string> dic = new Dictionary<string, string>();

            foreach (var user in users)
            {
                dic[user.UserName] = user.UserId;
            }

            var comments = _context.Comments.ToList();

            foreach (var comment in comments)
            {
                comment.UserId = dic[comment.UserName];
            }

            var replies = _context.Replies.ToList();

            foreach (var reply in replies)
            {
                reply.UserId = dic[reply.UserName];
            }

            _context.SaveChanges();

            Console.WriteLine("Migration script completed , all users in table comments/replies have ids to them");
        }

        public async Task FillUserNameInTableVideoLikesDislikesAsync()
        {
            Dictionary<string, string> userIdToUserNameKeyValuePair = new Dictionary<string, string>();

            var usersIdAndNames = await _context.Users.Select(x => new
            {
                userId = x.Id,
                UserName = x.UserName,
            })
            .ToListAsync();

            foreach (var item in usersIdAndNames)
            {
                userIdToUserNameKeyValuePair[item.userId] = item.UserName;

            }



            List<VideoLikesDislikes> likesDislikes = await _context.VideoLikesDislikes.ToListAsync();

            foreach (var item in likesDislikes)
            {
                if (userIdToUserNameKeyValuePair.ContainsKey(item.UserId))
                {
                    item.UserName = userIdToUserNameKeyValuePair[item.UserId];
                }
            }

            await _context.SaveChangesAsync();
        }

        public async Task FillVideoTitleToVideoLikesDislikesAsync()
        {
            Dictionary<int, string> VideoIdTitles = new Dictionary<int, string>();

            var videos = await _context.VideoRecords.Select(x => new
            {
                videoId = x.Id,
                videoTitle = x.Title,
            })
                .ToListAsync();

            foreach (var video in videos)
            {
                VideoIdTitles[video.videoId] = video.videoTitle;
            }

            List<VideoLikesDislikes> likesDislikes = await _context.VideoLikesDislikes.ToListAsync();

            foreach (var item in likesDislikes)
            {
                if (VideoIdTitles.ContainsKey(item.VideoId))
                {
                    item.VideoTitle = VideoIdTitles[item.VideoId];
                }

            }

            await _context.SaveChangesAsync();


        }

        public async Task FillCategoriesWithVideoCount()
        {
            List<Category> categories = await _context.Categories.ToListAsync();

            foreach (var category in categories)
            {
                int count = await _context.VideoRecords.CountAsync(v => v.CategoryId == category.Id);

                category.VideosCount = count;


                await _context.SaveChangesAsync();
            }

        }

        public async Task SetCategoryWithImage()
        {
            string[] paths = [
                "C:\\Users\\why19\\Downloads\\Music-Shutterstock-scaled.jpg",
                "C:\\Users\\why19\\Downloads\\sports-balls.jpg",
                "C:\\Users\\why19\\Downloads\\abstract_digital-gamepad-sl-800x450.jpg",
                "C:\\Users\\why19\\Downloads\\media-and-entertainment-industry-1024x516.webp",
                "C:\\Users\\why19\\Downloads\\Top-12-Pioneers-in-Education-scaled.jpg"
                            ];


            _logger.Log(0, $"GIVE ME SOMETHING YOU SHIT {Path.GetExtension(paths[0])}");




            Category[] categories = await _context.Categories.ToArrayAsync();

            try
            {
                for (int i = 0; i < categories.Length; i++)
                {

                    await using (FileStream stream = new FileStream(paths[i], FileMode.Open, FileAccess.Read))
                    {
                        string wwwrootLocation = Path.Combine(_webHostEnvironment.WebRootPath, "Category Images");

                        Directory.CreateDirectory(wwwrootLocation);

                        wwwrootLocation = Path.Combine(wwwrootLocation, Path.GetFileName(paths[i]));

                        await using (FileStream create = new FileStream(wwwrootLocation, FileMode.Create))
                        {
                            using Image image = await Image.LoadAsync(stream);
                            {
                                await image.SaveAsJpegAsync(create);
                            }
                        }

                        categories[i].ImagePath = wwwrootLocation;

                    }
                }

                await _context.SaveChangesAsync();
            }
            catch (Exception ex)
            {
                Console.WriteLine("SOmething happened", ex);
            }


        }

        public async Task FillVidoesWithStartedDateField()
        {
            var videos = await _context.VideoRecords.Where(v => v.Id != 31).ToListAsync();

            foreach (var video in videos)
            {
                video.Started = video.Uploaded;
            }

            await _context.SaveChangesAsync();

        }


    }
}
