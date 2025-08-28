using System.Text.RegularExpressions;

namespace VodLibraryWithAngular.Server.Interfaces
{
    public interface IFileNameSanitizer
    {
        string SanitizeFileNameFromUrl(string originalName);

        public static string CleanFolderOrFileName(string name)
        {

            string invalid = new string(Path.GetInvalidFileNameChars()) + new string(Path.GetInvalidPathChars());
            string regex = $"[{Regex.Escape(invalid)}]";
            return Regex.Replace(name, regex, "_");
        }
    }
}
