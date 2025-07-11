using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace VodLibraryWithAngular.Server.Migrations
{
    /// <inheritdoc />
    public partial class UpdateUserWatchHistory : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_UserWatchHistories_VideoRecords_VideoId",
                table: "UserWatchHistories");

            migrationBuilder.AddColumn<DateTime>(
                name: "WatchedOn",
                table: "UserWatchHistories",
                type: "timestamp with time zone",
                nullable: false,
                defaultValue: new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified));

            migrationBuilder.AddForeignKey(
                name: "FK_UserWatchHistories_VideoRecords_VideoId",
                table: "UserWatchHistories",
                column: "VideoId",
                principalTable: "VideoRecords",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_UserWatchHistories_VideoRecords_VideoId",
                table: "UserWatchHistories");

            migrationBuilder.DropColumn(
                name: "WatchedOn",
                table: "UserWatchHistories");

            migrationBuilder.AddForeignKey(
                name: "FK_UserWatchHistories_VideoRecords_VideoId",
                table: "UserWatchHistories",
                column: "VideoId",
                principalTable: "VideoRecords",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }
    }
}
