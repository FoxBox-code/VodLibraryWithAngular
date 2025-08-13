namespace VodLibraryWithAngular.Server.Interfaces
{
    public interface IFileNameSanitizer
    {
        string SanitizeFileName(string originalName);
    }
}
