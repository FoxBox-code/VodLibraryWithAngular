using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace VodLibraryWithAngular.Server.Migrations
{
    /// <inheritdoc />
    public partial class CommentReplyLikesDislikes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_VideoLikesDislikes_AspNetUsers_UserId",
                table: "VideoLikesDislikes");

            migrationBuilder.DropColumn(
                name: "DisLikes",
                table: "Replies");

            migrationBuilder.DropColumn(
                name: "Likes",
                table: "Replies");

            migrationBuilder.DropColumn(
                name: "DisLikes",
                table: "Comments");

            migrationBuilder.DropColumn(
                name: "Likes",
                table: "Comments");

            migrationBuilder.CreateTable(
                name: "CommentLikesDisLikes",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    CommentId = table.Column<int>(type: "integer", nullable: false),
                    UserId = table.Column<string>(type: "text", nullable: false),
                    Like = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CommentLikesDisLikes", x => x.Id);
                    table.ForeignKey(
                        name: "FK_CommentLikesDisLikes_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_CommentLikesDisLikes_Comments_CommentId",
                        column: x => x.CommentId,
                        principalTable: "Comments",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "RepliesLikesDisLikes",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    ReplyId = table.Column<int>(type: "integer", nullable: false),
                    UserId = table.Column<string>(type: "text", nullable: false),
                    Like = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RepliesLikesDisLikes", x => x.Id);
                    table.ForeignKey(
                        name: "FK_RepliesLikesDisLikes_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_RepliesLikesDisLikes_Replies_ReplyId",
                        column: x => x.ReplyId,
                        principalTable: "Replies",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_CommentLikesDisLikes_CommentId",
                table: "CommentLikesDisLikes",
                column: "CommentId");

            migrationBuilder.CreateIndex(
                name: "IX_CommentLikesDisLikes_UserId",
                table: "CommentLikesDisLikes",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_RepliesLikesDisLikes_ReplyId",
                table: "RepliesLikesDisLikes",
                column: "ReplyId");

            migrationBuilder.CreateIndex(
                name: "IX_RepliesLikesDisLikes_UserId",
                table: "RepliesLikesDisLikes",
                column: "UserId");

            migrationBuilder.AddForeignKey(
                name: "FK_VideoLikesDislikes_AspNetUsers_UserId",
                table: "VideoLikesDislikes",
                column: "UserId",
                principalTable: "AspNetUsers",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_VideoLikesDislikes_AspNetUsers_UserId",
                table: "VideoLikesDislikes");

            migrationBuilder.DropTable(
                name: "CommentLikesDisLikes");

            migrationBuilder.DropTable(
                name: "RepliesLikesDisLikes");

            migrationBuilder.AddColumn<int>(
                name: "DisLikes",
                table: "Replies",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "Likes",
                table: "Replies",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "DisLikes",
                table: "Comments",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "Likes",
                table: "Comments",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddForeignKey(
                name: "FK_VideoLikesDislikes_AspNetUsers_UserId",
                table: "VideoLikesDislikes",
                column: "UserId",
                principalTable: "AspNetUsers",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }
    }
}
