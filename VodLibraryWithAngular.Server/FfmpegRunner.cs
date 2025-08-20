using System.Diagnostics;

namespace VodLibraryWithAngular.Server
{
    public static class FfmpegRunner
    {
        public static readonly string Ffmpeg = "C:\\stuff\\ffmpeg-2025-01-22-git-e20ee9f9ae-full_build\\bin\\ffmpeg.exe";

        public static async Task<int> RunMpegAsync(string arg)
        {
            ProcessStartInfo info = new ProcessStartInfo()
            {
                FileName = Ffmpeg,
                Arguments = arg,
                RedirectStandardError = true,
                RedirectStandardOutput = true,
                UseShellExecute = false,
                CreateNoWindow = true,
            };

            Process process = new Process() { StartInfo = info };
            process.Start();


            _ = Task.Run(async () =>
            {
                while (!process.StandardError.EndOfStream)
                {
                    var line = await process.StandardError.ReadLineAsync();
                    if (!string.IsNullOrWhiteSpace(line))
                        Console.WriteLine($"Standard error {line}");
                }
            });

            _ = Task.Run(async () =>
           {
               while (!process.StandardOutput.EndOfStream)
               {
                   var line = await process.StandardOutput.ReadLineAsync();
                   if (!string.IsNullOrWhiteSpace(line))
                   {
                       Console.WriteLine($"Standard Output {line}");
                   }
               }
           });



            await process.WaitForExitAsync();
            int exitCode = process.ExitCode;
            process.Dispose();
            return exitCode;
        }


    }
}
