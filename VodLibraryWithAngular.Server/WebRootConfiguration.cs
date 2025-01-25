using Microsoft.IdentityModel.Tokens;

namespace VodLibraryWithAngular.Server
{
    public class WebRootConfiguration
    {
        private readonly IWebHostEnvironment _environment;

        public WebRootConfiguration(IWebHostEnvironment environment)
        {
            _environment = environment;
        }

        public void ConfigureDirectories()
        {
            try
            {
                if (_environment.WebRootPath.IsNullOrEmpty())
                {
                    _environment.WebRootPath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "wwwroot");

                    if (!Directory.Exists(_environment.WebRootPath))
                    {
                        Directory.CreateDirectory(_environment.WebRootPath);
                        Console.WriteLine($"WebRoot created {_environment.WebRootPath}");
                    }
                }


                var videoDirectory = Path.Combine(_environment.WebRootPath, "videos");
                if (!Directory.Exists(videoDirectory))
                {
                    Console.WriteLine("Creating video directory in the root");
                    Directory.CreateDirectory(videoDirectory);
                }
                Console.WriteLine("Video Directory created");
                Console.WriteLine($"Video Directory Path: {videoDirectory}");


                var thumbnailDirectory = Path.Combine(_environment.WebRootPath, "thumbnail");
                if (!Directory.Exists(thumbnailDirectory))
                {
                    Directory.CreateDirectory(thumbnailDirectory);
                    Console.WriteLine("Creating thumbnail directory in the root");
                }
                Console.WriteLine($"Thumbnail Directory Path: {thumbnailDirectory}");




            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error during the set up of Directory  {ex.Message}");
            }



        }
    }
}
