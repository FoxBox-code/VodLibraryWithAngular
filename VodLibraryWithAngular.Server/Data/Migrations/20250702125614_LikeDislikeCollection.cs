using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace VodLibraryWithAngular.Server.Migrations
{
    /// <inheritdoc />
    public partial class LikeDislikeCollection : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Dislike",
                table: "VideoRecords");

            migrationBuilder.DropColumn(
                name: "Likes",
                table: "VideoRecords");

            migrationBuilder.CreateTable(
                name: "VideoLikesDislikes",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    VideoId = table.Column<int>(type: "integer", nullable: false),
                    UserId = table.Column<string>(type: "text", nullable: false),
                    Liked = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_VideoLikesDislikes", x => x.Id);
                    table.ForeignKey(
                        name: "FK_VideoLikesDislikes_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_VideoLikesDislikes_VideoRecords_VideoId",
                        column: x => x.VideoId,
                        principalTable: "VideoRecords",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_VideoLikesDislikes_UserId",
                table: "VideoLikesDislikes",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_VideoLikesDislikes_VideoId",
                table: "VideoLikesDislikes",
                column: "VideoId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "VideoLikesDislikes");

            migrationBuilder.AddColumn<int>(
                name: "Dislike",
                table: "VideoRecords",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "Likes",
                table: "VideoRecords",
                type: "integer",
                nullable: false,
                defaultValue: 0);
        }
    }
}
