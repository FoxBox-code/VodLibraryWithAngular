using System.Text.RegularExpressions;

namespace VodLibraryWithAngular.Server.Interfaces
{
    public interface IFileNameSanitizer
    {
        string SanitizeFileName(string originalName);

        public static string CleanFolderName(string name)
        {

            string invalid = new string(Path.GetInvalidFileNameChars()) + new string(Path.GetInvalidPathChars());
            string regex = $"[{Regex.Escape(invalid)}]";
            return Regex.Replace(name, regex, "_");
        }
    }
}
