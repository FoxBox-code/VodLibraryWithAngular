using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using VodLibraryWithAngular.Server.Data.Models;


namespace VodLibraryWithAngular.Server.Data
{
    public class ApplicationDbContext : IdentityDbContext
    {
        public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
            : base(options)
        {
        }


        public DbSet<Category> Categories { get; set; }

        public DbSet<VideoRecord> VideoRecords { get; set; }

        public DbSet<Comment> Comments { get; set; }

        public DbSet<Reply> Replies { get; set; }

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

            builder.Entity<Reply>()
                .HasKey(r => r.Id);

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
                new Category { Id = 6, Name = "Science and Technology"}


            };
        }
    }


}
