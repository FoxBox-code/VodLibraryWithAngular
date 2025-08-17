using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using VodLibraryWithAngular.Server.Data.Models;



namespace VodLibraryWithAngular.Server.Data
{
    public class ApplicationDbContext : IdentityDbContext<ApplicationUser>
    {
        public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
            : base(options)
        {
        }


        public DbSet<Category> Categories { get; set; }

        public DbSet<VideoRecord> VideoRecords { get; set; }

        public DbSet<Comment> Comments { get; set; }

        public DbSet<Reply> Replies { get; set; }

        public DbSet<VideoLikesDislikes> VideoLikesDislikes { get; set; }

        public DbSet<CommentLikesDisLikes> CommentLikesDisLikes { get; set; }

        public DbSet<RepliesLikesDisLikes> RepliesLikesDisLikes { get; set; }

        public DbSet<UserWatchHistory> UserWatchHistories { get; set; }

        public DbSet<Subscriber> SubScribers { get; set; }

        public DbSet<VideoRendition> VideoRenditions { get; set; }

        private Category[] categoriesToSeed;

        protected override void OnModelCreating(ModelBuilder builder)
        {
            base.OnModelCreating(builder);

            builder.Entity<Category>()
                .HasKey(c => c.Id);

            builder.Entity<VideoRecord>()
                .HasKey(v => v.Id);

            builder.Entity<Comment>()
                .HasKey(c => c.Id);

            builder.Entity<Comment>()
                .HasOne(c => c.User)
                .WithMany()
                .HasForeignKey(c => c.UserId)
                .OnDelete(DeleteBehavior.Restrict);

            builder.Entity<Reply>()
                .HasKey(r => r.Id);

            builder.Entity<Reply>()
                .HasOne(r => r.User)
                .WithMany()
                .HasForeignKey(r => r.UserId)
                .OnDelete(DeleteBehavior.Restrict);

            builder.Entity<VideoRecord>()
                .HasOne(v => v.Category)
                .WithMany(c => c.Videos)
                .HasForeignKey(v => v.CategoryId)
                .OnDelete(DeleteBehavior.Restrict);

            builder.Entity<VideoRecord>()
                .HasOne(v => v.VideoOwner)
                .WithMany()
                .HasForeignKey(v => v.VideoOwnerId)
                .OnDelete(DeleteBehavior.Restrict);

            builder.Entity<VideoRecord>()
                .HasMany(v => v.Comments)
                .WithOne(c => c.VideoRecord)
                .HasForeignKey(c => c.VideoRecordId)
                .OnDelete(DeleteBehavior.Cascade);

            builder.Entity<VideoRecord>()
                .HasMany(v => v.Replies)
                .WithOne(r => r.VideoRecord)
                .HasForeignKey(r => r.VideoRecordId)
                .OnDelete(DeleteBehavior.Restrict);


            builder.Entity<Comment>()
                .HasMany(c => c.Replies)
                .WithOne(r => r.Comment)
                .HasForeignKey(r => r.CommentId)
                .OnDelete(DeleteBehavior.Cascade);

            builder.Entity<VideoLikesDislikes>()
                .HasOne(v => v.Video)
                .WithMany(u => u.LikeDislikeStats)
                .HasForeignKey(v => v.VideoId);

            builder.Entity<VideoLikesDislikes>()
                .HasOne(u => u.User)
                .WithMany(v => v.LikeDislikesStats)
                .HasForeignKey(u => u.UserId)
                .OnDelete(DeleteBehavior.Restrict);

            builder.Entity<CommentLikesDisLikes>()
                .HasOne(c => c.Comment)
                .WithMany(c => c.LikesDisLikes)
                .HasForeignKey(c => c.CommentId);

            builder.Entity<RepliesLikesDisLikes>()
                .HasOne(r => r.Reply)
                .WithMany(r => r.LikesDisLikes)
                .HasForeignKey(r => r.ReplyId);

            builder.Entity<UserWatchHistory>()
                .HasOne(x => x.User)
                .WithMany(u => u.UserWatchHistories)
                .HasForeignKey(x => x.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            builder.Entity<UserWatchHistory>()
                .HasOne(x => x.Video)
                .WithMany(v => v.WatchHistories)
                .HasForeignKey(x => x.VideoId)
                .OnDelete(DeleteBehavior.Cascade);

            builder.Entity<Subscriber>()
                .HasOne(f => f.Follower)
                .WithMany(s => s.Following)
                .HasForeignKey(f => f.FollowerId)
                .OnDelete(DeleteBehavior.NoAction);

            builder.Entity<Subscriber>()
                .HasOne(s => s.Subscribed)
                .WithMany(f => f.Followers)
                .HasForeignKey(s => s.SubscribedId)
                .OnDelete(DeleteBehavior.NoAction);

            builder.Entity<VideoRendition>()
                .HasOne<VideoRecord>(x => x.VideoRecord)
                .WithMany(v => v.VideoRenditions)
                .HasForeignKey(f => f.VideoRecordId);


            SeedCategories();

            builder.Entity<Category>()
                .HasData(categoriesToSeed);

        }

        private void SeedCategories()
        {
            categoriesToSeed = new Category[]
            {
                new Category { Id = 1, Name = "Music"} ,
                new Category { Id = 2, Name = "Sports"},
                new Category { Id = 3, Name = "Gaming"},
                new Category { Id = 4, Name = "Entertainment"},
                new Category { Id = 5, Name = "Education"},



            };
        }




    }



}




