using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace VodLibraryWithAngular.Server.Migrations
{
    /// <inheritdoc />
    public partial class CommentRepliesUserRelationShipStage1 : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "UserId",
                table: "Replies",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "UserId",
                table: "Comments",
                type: "text",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "UserId",
                table: "Replies");

            migrationBuilder.DropColumn(
                name: "UserId",
                table: "Comments");
        }
    }
}
