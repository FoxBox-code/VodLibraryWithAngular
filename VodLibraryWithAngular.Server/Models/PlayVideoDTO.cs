﻿namespace VodLibraryWithAngular.Server.Models
{
    public class PlayVideoDTO
    {
        public int Id { get; set; }

        public string Title { get; set; }

        public string Description { get; set; }

        public DateTime Uploaded { get; set; }

        public string VideoPath { get; set; }

        public string VideoOwnerId { get; set; }

        public string VideoOwnerName { get; set; }

        public string CategoryName { get; set; }

        public int Views { get; set; }

        public int Likes { get; set; }

        public int DisLikes { get; set; }

        public int CommentCount { get; set; }

        public IEnumerable<CommentDTO> Comments { get; set; } = new List<CommentDTO>();

    }
}
