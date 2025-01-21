namespace VodLibraryWithAngular.Server.DataConstants
{
    public static class ConstantsCharacteristics
    {
        public static class VideoRecordsConstants
        {
            public const int TitleMaxLength = 50;
            public const int TitleMinLength = 3;

            public const long MaxVideoTicks = 864000000000; // these ticks represent 24hours

            public const int DescriptionMaxLength = 5000;
        }

        public static class ChategoryConstants
        {
            public const int CategoryNameMaxLength = 30;
        }

        public static class CommentConstants
        {
            public const int CommentDescriptionMaxLength = 10000;
        }

    }
}
