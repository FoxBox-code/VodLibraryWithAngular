using System.Diagnostics;

namespace VodLibraryWithAngular.Server
{
    public class FfprobeRunner
    {
        private static readonly string Ffprobe = "C:\\stuff\\ffmpeg-2025-01-22-git-e20ee9f9ae-full_build\\bin\\ffprobe.exe";
        public static async Task<(int width, int hight)> ProbeRunAsync(string inputPath)
        {
            ProcessStartInfo processStartInfo = new ProcessStartInfo()
            {
                FileName = Ffprobe,
                Arguments = $"-v error -select_streams v:0 -show_entries stream=width,height -of csv=s=x:p=0 \"{inputPath}\"",
                RedirectStandardOutput = true,
                RedirectStandardError = true,
                UseShellExecute = false,
                CreateNoWindow = true,

            };

            Process process = new Process()
            {
                StartInfo = processStartInfo
            };

            process.Start();

            _ = Task.Run(async () =>
            {
                while (!process.StandardError.EndOfStream)
                {
                    string? line = await process.StandardError.ReadLineAsync();
                    if (!string.IsNullOrWhiteSpace(line))
                    {
                        throw new Exception($"Failed to get the video resolution in ffprobe, standard error emitted {line}");
                    }
                }
            });

            var standardOutputValue = await process.StandardOutput.ReadLineAsync();
            if (string.IsNullOrWhiteSpace(standardOutputValue))
            {
                Console.WriteLine($"Who the fuck {inputPath}");
                throw new Exception($"Failed to get the video resolution in ffprobe, standard output emitted nothing {standardOutputValue}");
            }

            await process.WaitForExitAsync();

            if (!standardOutputValue.Contains('x'))
            {
                throw new Exception($"Standard output value did not match our requirements for a resolution WidthHeight , its actual value is ${standardOutputValue}");
            }

            int[] resolution = standardOutputValue.Split('x').Select(x => int.Parse(x)).ToArray();

            return (resolution[0], resolution[1]);


        }
    }
}
