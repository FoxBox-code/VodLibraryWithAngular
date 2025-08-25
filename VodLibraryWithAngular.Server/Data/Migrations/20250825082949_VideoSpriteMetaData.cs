using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace VodLibraryWithAngular.Server.Migrations
{
    /// <inheritdoc />
    public partial class VideoSpriteMetaData : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {


            migrationBuilder.CreateTable(
                name: "VideoSpritesMetaData",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Name = table.Column<string>(type: "text", nullable: false),
                    VideoRecordId = table.Column<int>(type: "integer", nullable: false),
                    NumberOfSprites = table.Column<int>(type: "integer", nullable: false),
                    NumberOfFrames = table.Column<int>(type: "integer", nullable: false),
                    NumberOfFramesPerSecond = table.Column<int>(type: "integer", nullable: false),
                    DirectoryPath = table.Column<string>(type: "text", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_VideoSpritesMetaData", x => x.Id);
                    table.ForeignKey(
                        name: "FK_VideoSpritesMetaData_VideoRecords_VideoRecordId",
                        column: x => x.VideoRecordId,
                        principalTable: "VideoRecords",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_VideoSpritesMetaData_VideoRecordId",
                table: "VideoSpritesMetaData",
                column: "VideoRecordId",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "VideoSpritesMetaData");


        }
    }
}
