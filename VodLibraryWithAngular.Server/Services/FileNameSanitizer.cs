using System.Text.RegularExpressions;
using VodLibraryWithAngular.Server.Interfaces;

namespace VodLibraryWithAngular.Server.Services
{
    public class FileNameSanitizer : IFileNameSanitizer
    {
        public string SanitizeFileName(string originalName)//since the client app will be taking files via a url navigation style ,
                                                           //there a potential symbols in a file's name that could break the url such as # these are called url fragments
                                                           //no idea what they do clearly but we need to clean them if the files name contains them , if not a path cannot be established between them
        {
            string fileExtension = Path.GetExtension(originalName);
            string FileNameWithoutExtension = Path.GetFileNameWithoutExtension(originalName);

            string safeName = Regex.Replace(FileNameWithoutExtension, @"[^a-zA-Z0-9_-]", "-");

            string sanitizedFileName = safeName + fileExtension;

            return sanitizedFileName;
        }
    }
}
