using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace VodLibraryWithAngular.Server.Migrations
{
    /// <inheritdoc />
    public partial class UserWatchHistoryVideodeletebehaviorSetToCascade : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_UserWatchHistories_VideoRecords_VideoId",
                table: "UserWatchHistories");

            migrationBuilder.AddForeignKey(
                name: "FK_UserWatchHistories_VideoRecords_VideoId",
                table: "UserWatchHistories",
                column: "VideoId",
                principalTable: "VideoRecords",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_UserWatchHistories_VideoRecords_VideoId",
                table: "UserWatchHistories");

            migrationBuilder.AddForeignKey(
                name: "FK_UserWatchHistories_VideoRecords_VideoId",
                table: "UserWatchHistories",
                column: "VideoId",
                principalTable: "VideoRecords",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }
    }
}
