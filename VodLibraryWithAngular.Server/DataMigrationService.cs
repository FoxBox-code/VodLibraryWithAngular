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

        public async Task CreateVideoFrames()
        {
            List<VideoRecord> videos = await _context.VideoRecords.Include(v => v.VideoRenditions).ToListAsync();

            foreach (var video in videos)
            {
                double totalSeconds = video.Length.TotalSeconds;
                string videoRendtion = video.VideoRenditions.ToArray()[0].RenditionPath;
                string videoRenditionPath = Path.GetDirectoryName(videoRendtion);
                string outPutDirectory = Path.Combine(videoRenditionPath, "Thumbnail Frames");


                if (Directory.Exists(outPutDirectory))//Deletes folder if the processFailed
                {
                    int folderFramesCount = Directory.GetFiles(outPutDirectory, "frame_*.jpg").Length;

                    if (folderFramesCount >= Math.Floor(totalSeconds))
                    {
                        continue;
                    }
                    Directory.Delete(outPutDirectory, true);
                }





                Directory.CreateDirectory(outPutDirectory);

                string ffmpegArguments = $"-i \"{videoRendtion}\" -vf fps=1,scale=160:-1 \"{Path.Combine(outPutDirectory, "frame_%05d.jpg")}\"";





                int exitCode = await FfmpegRunner.RunMpegAsync(ffmpegArguments);

                if (exitCode != 0)
                {
                    throw new Exception($"Failed to create all frames for video {video.Title}");
                }
                else if (exitCode == 0)
                {
                    _logger.LogInformation($"All frames for video {video.Title} have been done");
                }

            }
        }

        public async Task CreateVideoSprites()
        {
            List<VideoRecord> videos = await _context.VideoRecords.Include(v => v.VideoRenditions).ToListAsync();

            foreach (VideoRecord video in videos)
            {
                var arrRenditions = video.VideoRenditions.ToArray();

                VideoRendition rendition = arrRenditions[0];
                string outPutDirectory = Path.GetDirectoryName(rendition.RenditionPath);

                string thumbnailsFramesDirectory = Path.Combine(outPutDirectory, "Thumbnail Frames");

                List<string> frames = Directory.GetFiles(thumbnailsFramesDirectory, "frame_*.jpg")
                    .OrderBy(f =>
                    int.Parse(
                        Path.GetFileNameWithoutExtension(f)
                        .Split("_")[1]))
                    .ToList();



                string spritesDirectory = Path.Combine(outPutDirectory, "Sprite Sheets");
                Directory.CreateDirectory(spritesDirectory);
                string[] existingSpritesCount = Directory.GetFiles(spritesDirectory, ".jpg");
                if (Directory.Exists(spritesDirectory) && existingSpritesCount.Length > 0)
                {
                    _logger.LogInformation($"skipping spriteCreation for directory {spritesDirectory}");
                    continue;
                }

                int spriteSize = 50;
                int spriteIndex = 0;

                for (int i = 0; i < frames.Count; i += 50)
                {
                    List<string> frameBatch = frames.Skip(i).Take(50).ToList();

                    string spriteBatchTextFile = Path.Combine(spritesDirectory, $"sprite_{spriteIndex}.txt");
                    File.WriteAllLines(spriteBatchTextFile, frameBatch.Select(f => $"file '{f.Replace('\\', '/')}'"));

                    string spriteBatchJpg = Path.Combine(spritesDirectory, $"sprite_{spriteIndex}.jpg");
                    string spriteArgs = $"-f concat -safe 0 -i \"{spriteBatchTextFile}\" -vf \"tile=10x5\" \"{spriteBatchJpg}\"";
                    await FfmpegRunner.RunMpegAsync(spriteArgs);

                    spriteIndex++;
                }
            }





        }

        public async Task FillTableVideoSpriteSheets()
        {
            List<VideoRecord> videos = await _context.VideoRecords.Include(v => v.VideoRenditions).ToListAsync();

            foreach (VideoRecord videoRecord in videos)
            {
                VideoRendition rendition = videoRecord.VideoRenditions.ToArray()[0];
                string spritePath = Path.Combine(Path.GetDirectoryName(rendition.RenditionPath), "Sprite Sheets");

                if (Directory.Exists(spritePath))
                {
                    int countOfSprites = Directory.GetFiles(spritePath, "sprite_*.jpg").Length;

                    VideoSpriteMetaData data = new VideoSpriteMetaData()
                    {
                        Name = videoRecord.Title + " spriteSheet",
                        VideoRecordId = videoRecord.Id,
                        NumberOfSprites = countOfSprites,
                        DirectoryPath = spritePath,
                    };

                    await _context.AddAsync(data);

                }
                else
                {
                    _logger.LogError($"Failed to add the sprite metaData for videoRecord with id {videoRecord.Id} title {videoRecord.Title} , the directory does not exist");
                }
            }
            await _context.SaveChangesAsync();


        }

        public async Task UpdateVideosCommentCountVariable()
        {
            List<VideoRecord> videos = await _context.VideoRecords.Include(v => v.Comments).ToListAsync();

            foreach (var video in videos)
            {
                int commentCount = video.Comments.Count();

                video.CommentsCount = commentCount;
            }


            await _context.SaveChangesAsync();

        }

        public async Task UpdateVideoReplyCountVariable()
        {
            List<VideoRecord> videos = await _context.VideoRecords.Include(v => v.Replies).ToListAsync();

            foreach (var video in videos)
            {
                int repliesCount = video.Replies.Count();

                video.ReplyCount = repliesCount;
            }

            await _context.SaveChangesAsync();
        }

    }
}
